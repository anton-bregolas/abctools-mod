///////////////////////////////////////////////////////////////////////
// ABC Tools Lite Context Menu
// https://github.com/anton-bregolas/abctools-lite
// Matt Turco's context-menu reimplemented using Popover API
// Added keyboard navigation in line with WAI-ARIA menu pattern
// Added custom anchor positioning logic with JS fallback
// Added smart scroll hint arrows appearing on content overflow
// MIT License
// (c) Anton Zille 2026
///////////////////////////////////////////////////////////////////////

const gCM_instances = [];

let gCM_nextId = 0;

let gCM_lastTrigger = null;

// Initialize Context Menu Popover toggle button

const cmToggleBtn = document.getElementById('morecommands');

if (cmToggleBtn) {

  cmToggleBtn.addEventListener('click', (e) => {

    gCM_instances.forEach((cm) => {
      
      if (e.target.closest(cm.selector)) {

        if (cm.menu.matches(':popover-open')) {
          cm.hide();
          cmToggleBtn.focus();
          return;
        }
        cm.show(e);
      }
    });
  });
}

// Fires custom event on given element
function emit(el, type, data = {}) {
  const event = document.createEvent('Event');

  Object.keys(data).forEach((key) => {
    event[key] = data[key];
  });

  event.initEvent(type, true, true);
  el.dispatchEvent(event);
}

class ContextMenu {
  constructor(
    selector,
    items,
    options = {
      className: ''
    },
  ) {
    this._scrollHandler = null;
    this._resizeHandler = null;
    this.selector = selector;
    this.items = items;
    this.options = options;
    this.id = gCM_nextId++;
    this.target = null;
    this.create();
    gCM_instances.push(this);
  }

  // Creates DOM elements, sets up event listeners
  // Implement context menu keyboard controls:
  // Home / End selects First / Last menu item
  // Arrow keys move focus but not scroll
  // Space and Enter click menu items
  // Escape and Tab keys hide the menu and shift focus
  // In full screen mode, Tab alternates between active menu item & X button
  create() {
    // Create root <ul> / <menu>
    this.menu = document.createElement('menu');
    this.menu.role = 'menu';
    this.menu.className = 'ContextMenu';
    this.menu.setAttribute('data-contextmenu', this.id);
    this.menu.setAttribute('tabindex', -1);
    this.menu.setAttribute('popover', 'manual');

    // Handle popover lifecycle (open/close)
    this.on('toggle', (e) => {
      if (e.newState === 'closed') {
        this.target = null;
        this.cleanupPositioning();
        emit(this.menu, 'hidden');
      }
    });

    // Handle keyboard navigation
    this.on('keydown', (e) => {
      const cm = e.currentTarget;
      const allItems = Array.from(cm.querySelectorAll('[data-contextmenuitem]'));
      const isFullScreen =
        document.body.dataset.layout === "mobile-true";

      switch (e.code) {
        case 'Home':
          e.preventDefault();
          if (!isFullScreen) allItems[0].focus();
          else liteNavFocusWithRovingTabIndex(allItems[0], allItems);
          break;
        case 'End':
          e.preventDefault();
          if (!isFullScreen) allItems[allItems.length - 1].focus();
          else liteNavFocusWithRovingTabIndex(allItems[allItems.length - 1], allItems);
          break;
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          this.moveFocus(-1, allItems, isFullScreen);
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          this.moveFocus(1, allItems, isFullScreen);
          break;
        case 'Escape':
          this.quit(e);
          break;
        case 'Tab':
          this.handleTab(e, isFullScreen);
          break;
        default:
          return;
      }      
    });

    if (this.options.className) {
      this.options.className
        .split(' ')
        .forEach((cls) => this.menu.classList.add(cls));
    }

    // Add X close menu button for True Mobile mode (hidden on desktop)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-header-x modal-header-ui btn-lite';
    closeBtn.setAttribute('aria-label', 'Close context menu');
    const svgNS = 'http://www.w3.org/2000/svg';
    const svgEl = document.createElementNS(svgNS, 'svg');
    svgEl.setAttribute('aria-hidden', 'true');
    const useEl = document.createElementNS(svgNS, 'use');
    useEl.setAttribute('href', '#lite-icon-x');
    svgEl.appendChild(useEl);
    closeBtn.appendChild(svgEl);
    closeBtn.addEventListener('click', () => { this.hide(); });
    this.menu.appendChild(closeBtn);

    // Add Top scroll button (appears on content overflow, hidden by default)
    this.scrollTop = document.createElement('button');
    this.scrollTop.type = 'button';
    this.scrollTop.className = 'ContextMenu-scroll-hint btn-lite';
    this.scrollTop.dataset.scrollHint = 'top';
    this.scrollTop.title = 'Scroll the menu to the top';
    this.scrollTop.ariaLabel = 'Scroll the menu to the top';
    this.scrollTop.hidden = true;
    this.scrollTop.textContent = '▲▲▲';
    this.menu.appendChild(this.scrollTop);

    // Create <li> / <button> elements for each menu item
    // Create separator elements or nested buttons
    // Assign correct ARIA roles to each element
    this.items.forEach((item, index) => {

      const li = document.createElement('li');
      li.role = 'presentation';

      if (!('name' in item)) {

        // Insert a visual divider
        li.className = 'ContextMenu-divider';

      } else {

        const btn = document.createElement('button');
        btn.role = 'menuitem';

        if (item.name.indexOf("*") == -1){
          btn.className = 'ContextMenu-item btn-lite';
          btn.textContent = item.name;
          btn.role = "menuitem";
          btn.setAttribute('data-contextmenuitem', index);
          if (index !== 0) btn.setAttribute('tabindex', -1);
          btn.addEventListener('click', () => this.select(btn));
        }
        else{
          item.name = item.name.replace("*","");
          btn.className = 'ContextMenu-item ContextMenu-item-red btn-lite';
          btn.textContent = item.name;
          btn.setAttribute('data-contextmenuitem', index);
          btn.setAttribute('tabindex', -1);
          btn.addEventListener('click', () => this.select(btn));
        }

        li.appendChild(btn);
      }

      this.menu.appendChild(li);
    });

    liteNavInitRovingTabIndex(this.menu.querySelectorAll('[data-contextmenuitem]'));

    // Add Bottom scroll button (appears on content overflow, hidden by default)
    this.scrollBottom = document.createElement('button');
    this.scrollBottom.type = 'button';
    this.scrollBottom.className = 'ContextMenu-scroll-hint btn-lite';
    this.scrollBottom.dataset.scrollHint = 'bottom';
    this.scrollBottom.title = 'Scroll the menu to the bottom';
    this.scrollBottom.ariaLabel = 'Scroll the menu to the bottom';
    this.scrollBottom.hidden = true;
    this.scrollBottom.textContent = '▼▼▼';
    this.menu.appendChild(this.scrollBottom);

    // Add click handlers to scroll hint buttons
    this.scrollTop.addEventListener('click', (e) => this.handleScrollIndicatorClick(e));
    this.scrollBottom.addEventListener('click', (e) => this.handleScrollIndicatorClick(e));

    // Append to anchor element's (grand)parent
    // This fixes anchor positioning in Firefox
    const cmParentEl = cmToggleBtn.parentElement;
    
    cmParentEl.appendChild(this.menu);

    emit(this.menu, 'created');
  }

  // Handle CSS Anchor Positioning
  // Fall back to JS if not supported
  // Correct position if context menu overflows
  handleAnchorPositioning(e) {

    // Full screen mode: Skip all positioning logic
    if (document.body.dataset.layout === "mobile-true") {
      if (e.pointerType === '') {
        const closeBtn = this.menu.querySelector('.modal-header-x');
        if (closeBtn) closeBtn.focus();
      } else {
        this.menu.focus();
      }
      this.setupScrollIndicator();
      this.setupResizeHandler();
      e.preventDefault();
      emit(this.menu, 'shown');
      return;
    }

    // Detect browser anchor positioning support
    let usingAnchor =
      'anchorName' in document.documentElement.style;

    const cmRect = this.menu.getBoundingClientRect();
    const cmRectH = Math.round(cmRect.height);
    const cmRectW = Math.round(cmRect.width);

    const h = document.documentElement.clientHeight;
    const w = document.documentElement.clientWidth;

    // Let anchor positioning place the menu
    // Verify if context menu fits on screen
    if (usingAnchor) {

      if (cmRectH - 1 > h || cmRectW - 1 > w) {
        this.menu.style.positionAnchor = 'none';
        this.menu.style.positionArea = 'normal';
        usingAnchor = false;
      }
    }
    
    // Fallback logic for context menu positioning
    if (!usingAnchor) {

      let left, top;

      const anchor = document.getElementById('context-menu-anchor');
      const anchorRect = anchor.getBoundingClientRect();

      if (Math.round(cmRect.bottom) - 1 > h) {

        top = 0;

      } else {

        top = Math.round(anchorRect.bottom) + anchorRect.height / 2;
      }
      
      left = Math.round(anchorRect.left) + (anchorRect.width / 2) - cmRect.width;

      this.menu.style.left = `${left}px`;
      this.menu.style.top = `${top}px`;
    }

    this.updateMaxHeight();

    if (e.pointerType === '') {
      this.menu.querySelector('[data-contextmenuitem]').focus();
    } else {
      this.menu.focus();
    }

    e.preventDefault();

    this.setupScrollIndicator();
    this.setupResizeHandler();

    emit(this.menu, 'shown');
  }

  // Opens the context menu
  show(e) {
    this.target = e.target;
    gCM_lastTrigger = e.target.closest(this.selector) || e.target;
    this.menu.showPopover();
    this.handleAnchorPositioning(e);
  }

  // Hides context menu
  hide() {
    if (this.menu.matches(':popover-open')) {
      this.menu.hidePopover();
    }
  }

  // Quits context menu and focuses on trigger button
  quit(e) {
    e.preventDefault();
    this.hide();
    cmToggleBtn.focus();
  }

  // Selects the given item and calls its handler
  select(item) {
    const itemId = item.getAttribute('data-contextmenuitem');
    if (this.items[itemId]) {
      // Call item handler with target element as parameter
      this.items[itemId].fn(this.target);
    }
    this.hide();
    emit(this.menu, 'itemselected');
  }

  // Tab: 
  // Hides the menu (and shift focus to editor) if not in fullscreen mode
  // Shifts focus between last selected menu item and UI in fullscreen mode
  // Scroll hint buttons appear in tabbing order if shown
  handleTab(e, isFullScreen) {
    if (!isFullScreen) {
      const shift = e.shiftKey;
      const focused = document.activeElement;

      // Handle Tab: Focus bottom hint if visible and not already focused
      if (!shift && !this.scrollBottom.hidden && focused !== this.scrollBottom) {
        e.preventDefault();
        this.scrollBottom.focus();
        return;
      }

      // Handle Shift + Tab: Focus top hint if visible and not already focused
      if (shift && !this.scrollTop.hidden && focused !== this.scrollTop) {
        e.preventDefault();
        this.scrollTop.focus();
        return;
      }

      this.hide();
      return;
    }

    const focused = document.activeElement;
    const x = this.menu.querySelector('.modal-header-x');
    const allItems = Array.from(this.menu.querySelectorAll('[data-contextmenuitem]'));
    const shift = e.shiftKey;

    // Handle Tab in full screen mode
    if (!shift) {
      if (focused === this.scrollTop) {
        e.preventDefault();
        const last = this.menu.querySelector('[data-contextmenuitem][tabindex="0"]');
        if (! last) last.focus({ preventScroll: true });
        else liteNavFocusWithRovingTabIndex(allItems[allItems.length - 1], allItems);
        return;
      }
      if (focused === x) {
        e.preventDefault();
        if (!this.scrollTop.hidden) { this.scrollTop.focus(); return; }
        const last = this.menu.querySelector('[data-contextmenuitem][tabindex="0"]');
        if (!last) last.focus({ preventScroll: true });
        else liteNavFocusWithRovingTabIndex(allItems[allItems.length - 1], allItems);
        return;
      }
      if (focused !== this.scrollBottom && !this.scrollBottom.hidden) {
        e.preventDefault();
        this.scrollBottom.focus();
        return;
      }
    // Handle Shift + Tab in full screen mode
    } else {
      if (focused === this.scrollBottom) {
        e.preventDefault();
        const last = this.menu.querySelector('[data-contextmenuitem][tabindex="0"]');
        if (!last) last.focus({ preventScroll: true });
        else liteNavFocusWithRovingTabIndex(allItems[0], allItems);
        return;
      }
      if (focused === x) {
        e.preventDefault();
        if (!this.scrollBottom.hidden) { this.scrollBottom.focus(); return; }
        const last = this.menu.querySelector('[data-contextmenuitem][tabindex="0"]');
        if (!last) last.focus({ preventScroll: true });
        else liteNavFocusWithRovingTabIndex(allItems[0], allItems);
        return;
      }
      if (focused !== this.scrollTop && !this.scrollTop.hidden) {
        e.preventDefault();
        this.scrollTop.focus();
        return;
      }
    }
    e.preventDefault();
    x.focus();
  }

  // Moves focus to the next/previous menu item
  moveFocus(direction = 1, allItems, isFullScreen) {
    let next;
    const focused = allItems.find(item => item === document.activeElement);

    if (focused) {
      next = allItems[allItems.indexOf(focused) + direction];
    }

    if (!next) {
      next = direction > 0? allItems[0] : allItems[allItems.length - 1];
    }

    if (next && isFullScreen) liteNavFocusWithRovingTabIndex(next, allItems);
    if (next) next.focus();
    this.updateScrollIndicator();
  }

  // Scroll to the top / bottom of the menu on pressing the hint button
  // Focus on the first / last menu item after animation completes
  // Try preventing undershoots and jarring animation (use allow-discrete in CSS)
  handleScrollIndicatorClick(e) {
    const hint = e.currentTarget;
    const isTop = hint.dataset.scrollHint === 'top';
    const allItems =
      Array.from(document.querySelectorAll('[data-contextmenuitem]'));
    const isFullScreen =
      document.body.dataset.layout === "mobile-true";
    hint.disabled = true;
    hint.hidden = true;
    this.menu.removeEventListener('scroll', this._scrollHandler);
    this.menu.scrollTo({
      top: isTop ? 0 : this.menu.scrollHeight - this.menu.clientHeight,
      behavior: 'smooth'
    });
    const onScrollEnd = () => {
      this.menu.removeEventListener('scrollend', onScrollEnd);
      this.menu.addEventListener('scroll', this._scrollHandler);
      if (isTop) this.menu.scrollTop = 0;
      else this.menu.scrollTop = this.menu.scrollHeight - this.menu.clientHeight;
      this.updateScrollIndicator();
      hint.disabled = false;
      const opts = { preventScroll: true };
      if (isTop && isFullScreen) liteNavFocusWithRovingTabIndex(allItems[0], allItems);
      else if (isTop && !isFullScreen) allItems[0].focus(opts);
      else if (isFullScreen) liteNavFocusWithRovingTabIndex(allItems[allItems.length - 1], allItems);
      else allItems[allItems.length - 1].focus(opts);
      requestAnimationFrame(() => this.updateScrollIndicator());
    };
    this.menu.addEventListener('scrollend', onScrollEnd);
  }

  // Update arrow overlays based on scroll position
  // Both top and bottom arrows are shown/hidden independently as needed
  setupScrollIndicator() {
    this.menu.scrollTop = 0;
    const update = () => this.updateScrollIndicator();
    this.menu.addEventListener('scroll', update);
    this._scrollHandler = update;
    this.updateScrollIndicator();
  }

  updateScrollIndicator() {
    const el = this.menu;
    if (!this.scrollBottom || !this.scrollTop) return;
    const canScrollDown = el.scrollHeight - el.clientHeight - el.scrollTop > 2;
    const canScrollUp = el.scrollTop > 2;
    this.scrollBottom.hidden = !canScrollDown;
    this.scrollTop.hidden = !canScrollUp;
  }

  // Handle max-height when a horizontal scrollbar is visible
  // Fixes the scrollbar covering part of menu in some browsers
  updateMaxHeight() {
    const h = document.documentElement.clientHeight;
    const scrollbarH = window.innerHeight - h;

    if (scrollbarH > 0) {
      document.body.style.setProperty(
        '--abctools-ui-cm-maxheight',
        `calc(100dvh - ${scrollbarH}px)`
      );
    } else {
      document.body.style.setProperty(
        '--abctools-ui-cm-maxheight',
        '100dvh'
      );
    }
  }

  // Recalculate scroll indicator when viewport changes
  setupResizeHandler() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
    const handler = () => {
      this.updateScrollIndicator();
      this.updateMaxHeight();
    };
    window.addEventListener('resize', handler);
    this._resizeHandler = handler;
  }

  cleanupPositioning() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    if (this._scrollHandler) {
      this.menu.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
    this.menu.style.left = '';
    this.menu.style.top = '';
    // Reset max-height to default for next open
    document.body.style.setProperty('--abctools-ui-cm-maxheight', '100dvh');

    this.menu.style.positionAnchor = '';
    this.menu.style.positionArea = '';
  }

  // Convenience method for adding an event listener
  on(type, fn) {
    this.menu.addEventListener(type, fn);
  }

  // Convenience method for removing an event listener
  off(type, fn) {
    this.menu.removeEventListener(type, fn);
  }

  // Removes DOM elements, stop listeners
  destroy() {
    this.menu.parentElement.removeChild(this.menu);
    this.menu = null;
    gCM_instances.splice(gCM_instances.indexOf(this), 1);
  }
}

// Tiny polyfill for Element.matches() for IE
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector;
}

// Light dismiss workaround for manual popover
// Close when clicking outside menu and trigger
document.addEventListener('click', (e) => {
  gCM_instances.forEach((menu) => {
    if (
      menu.menu.matches(':popover-open') &&
      !menu.menu.contains(e.target) &&
      !e.target.closest(menu.selector)
    ) {
      menu.hide();
    }
  });
});