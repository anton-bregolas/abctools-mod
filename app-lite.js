///////////////////////////////////////////////////////////////////////
// ABC Tools Lite Custom Scripts
// https://github.com/anton-bregolas/abctools-lite
// MIT License
// (c) Anton Zille 2025
///////////////////////////////////////////////////////////////////////

// Custom global variables / constants
var gLiteVersionNumber = 'lite-3261-17';

var ABC_TOOLS_BASE_URL =
  window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');

var ABC_TOOLS_EDITOR_URL =
  `${ABC_TOOLS_BASE_URL}abctools.html`;
  
var ABC_TOOLS_VERSION_FILE_URL =
  `${ABC_TOOLS_BASE_URL}abc_lite_version.json`;

// Custom Export PDF fonts

var PDF_FONT_FIRA_REGULAR = "./fonts/firasans-regular.js";
var PDF_FONT_FIRA_BOLD = "./fonts/firasans-semibold.js";
var PDF_FONT_FIRA_ITALIC = "./fonts/firasans-italic.js";
var PDF_FONT_FIRA_BOLDITALIC = "./fonts/firasans-semibolditalic.js";

// Custom External Resource URLs

const ABC_TOOLS_LITE_README_URL =
  "https://github.com/anton-bregolas/abctools-lite#abc-tools-lite";

////////////////////////////////////////////
// APP LITE: ADD CUSTOM DATA-ATTR
///////////////////////////////////////////

// Add compact mode data

function liteEnableCompactMode() {
  document.body.dataset.mode = "compact";
}

// Reset current mode data

function liteResetCurrentMode() {
  document.body.removeAttribute("data-mode");
}

// Add true mobile layout data

function liteEnableTrueMobileLayout() {
  document.body.dataset.layout = "mobile-true";
}

// Reset current layout data

function liteResetCurrentLayout() {
  document.body.removeAttribute("data-layout");
}

// Check if true mobile layout has been applied

function isTrueMobileLayout() {
  return document.body.dataset.layout === "mobile-true";
}

////////////////////////////////////////////
// APP LITE: AUTO-SCALE NOTATION
///////////////////////////////////////////

// Add notation auto-scaling data (enabled via gAutoScaleNotation)

function liteSetAutoScaleNotation() {
  document.body.dataset.notationScaling = "auto";
  document.body.style.setProperty("--abctools-notation-fullscreen-scaling", `${gFullScreenScaling}%`);
}

// Check if notation auto-scaling has been applied by the app

function isAutoScaleNotationApplied() {
  return !!document.body.style.getPropertyValue("--abctools-notation-fullscreen-scaling");
}

// Remove notation auto-scaling data

function liteResetAutoScaleNotation() {
  document.body.removeAttribute("data-notation-scaling");
  document.body.style.removeProperty("--abctools-notation-fullscreen-scaling");
}

////////////////////////////////////////////
// APP LITE: HANDLE EVENTS
///////////////////////////////////////////

// Handle keyboard presses / custom shortcuts

function liteHandleKeyDownEvents(event) {

  const keyCode = event.code;

  if (event.shiftKey) {

    if (event.ctrlKey && keyCode === "F10") {

      const contextMenuBtn =
        document.getElementById('morecommands');

      if (contextMenuBtn) contextMenuBtn.click();
      
      return;
    }
    
    // Handle custom Shift + Function key shortcuts
    const codesUsed = /^(?:F[1-47-9]|F1[1-2]?)$/;

    if (!codesUsed.test(keyCode)) return;

    event.preventDefault();

    const abcState = document.body.dataset.abc;

    const isAbcLoaded = abcState && abcState === "rendered";

    const helpReadmeBtn = document.getElementById('helpbutton');

    const toggleViewBtn = document.getElementById('zoombutton');

    const playMidiBtn = document.getElementById('playbuttonicon');

    switch (keyCode) {
      case "F1": // Open Welcome Screen / Editor Help / Notation Help
        if (!isAbcLoaded || !helpReadmeBtn) {
          showWelcomeScreen();
          return;
        }
        ShowHelp();
        return;

      case "F2": // Open Add ABC Dialog (or Focus on Edit Button)
        if (!gIsMaximized) {
          AddABC();
          return;
        }
        else if (isAbcLoaded && toggleViewBtn) {
          toggleViewBtn.focus();
        }
        return;

      case "F3": // Open Jump to Tune
        if (isAbcLoaded) JumpToTune();
        return;

      case "F4": // Focus on ABC Input (or Focus on Play Button)
        if (!gIsMaximized) {
          doFocusAbc();
          return;
        }
        else if (isAbcLoaded && playMidiBtn) {
          playMidiBtn.focus();
        }
        return;

      case "F7": // Open More Tools Dialog
        if (!gIsMaximized && isAbcLoaded) {
          AdvancedControlsDialog()
        }
        return;

      case "F8": // Open Sharing Dialog
        if (!gIsMaximized && isAbcLoaded) {
          SharingControlsDialog();
        }
        return;

      case "F9": // Toggle Compact Mode
        if (!gIsMaximized) {
          ToggleTopBar();
        }
        return;

      case "F11": // Maximize Notation / Show ABC Editor
        if (isAbcLoaded && !gDisableEditFromPlayLink) {
          ToggleMaximize();
          toggleViewBtn.focus();
        }
        return;

      case "F12": // Switch between Editor / Quick Editor
        if (!gDisableEditFromPlayLink) {
          liteSwitchCurrentEditor();
        }
        return;
    
      default:
        break;
    }
    return;
  }
}

// Handle counting events with GoatCounter

function liteGoatCountEvent(eventPath, eventTitle) {

  if (window.goatcounter && navigator.onLine) {

    window.goatcounter.count({
        path: `${eventPath}`,
        title: `${eventTitle}`,
        event: true,
    });
  }
}

////////////////////////////////////////////
// APP LITE: OPEN PAGES / CUSTOM TOOLS
///////////////////////////////////////////

// Open ABC Tools Lite README on GitHub

function liteOpenGitHubReadme() {

  window.open(ABC_TOOLS_LITE_README_URL, "_blank");
}

// Export ABC text to Anton Zille's ABC Encoder

function liteOpenInABCEncoder(abcText){

    sendGoogleAnalytics("action", "liteOpenInABCEncoder");

    var encoder = new TextEncoder();
    var utf8Bytes = encoder.encode(abcText);
    var deflated = pako.deflate(utf8Bytes, { level: 6 });
    var theDef = def_bytesToBase64URL(deflated);

    var theURL = "https://ns.tunebook.app/abc-encoder.html?def="+theDef;

    if (theURL.length < 8100)
    {
      var w = window.open(theURL);
    }
    else{

      DayPilot.Modal.alertmin('<p class="modal-alert-msg">Share URL is too long to open in the external tool</p>', {
        theme: "modal_flat",
        top: 230,
        scrollWithPage: (AllowDialogsToScroll())
      });

    }
}

// Switch between Editor and Quick Editor
// Reopen current ABC in target Editor

function liteSwitchCurrentEditor() {

  const currentPathname = window.location.pathname;

  const targetEditorPathname =
    currentPathname.endsWith('abctools.html')?
      currentPathname.replace('abctools.html', 'abctools-quick-editor.html') :
      currentPathname.replace('abctools-quick-editor.html', 'abctools.html');

  const abcState = document.body.dataset.abc;

  const isAbcLoaded = abcState && abcState === "rendered";

  if (!isAbcLoaded) {
  
    window.location.href = targetEditorPathname;
    return;
  }

  window.location.pathname = targetEditorPathname;
}

////////////////////////////////////////////
// APP LITE: SHOW / HIDE UI ELEMENTS
///////////////////////////////////////////

// Show bottom button bar of the editor (setting stored via gBottomBarShowing)

function liteShowBottomBar() {

  document.body.dataset.abctoolsUiBottomBar = "show";
}

// Hide bottom button bar of the editor (setting stored via gBottomBarShowing)

function liteHideBottomBar() {

  document.body.removeAttribute("data-abctools-ui-bottom-bar");
}

// Show or hide bottom button bar depending on the current localStorage setting

function liteRestoreBottomBar() {

  const wasBottomBarHidden = 
    gLocalStorageAvailable && localStorage.abcLiteHideBottomBar && localStorage.abcLiteHideBottomBar === "true";

  if (wasBottomBarHidden) {

    liteHideBottomBar();
    return;
  } 

  liteShowBottomBar();
}

////////////////////////////////////////////
// APP LITE: SHIFT FOCUS / RESET POSITION
///////////////////////////////////////////

// Shift focus to the currently used ABC text field

function doFocusAbc() {

  if (gEnableSyntax) {

    gTheCM.focus();

  } else {

    gTheABC.focus();
  }
}

// Reset ABC text field selection

function resetAbcSelection() {

  if (gEnableSyntax) {

    // Set the selection to the start of the tune
    gTheCM.selectionStart = 0;
    gTheCM.selectionEnd = 0;

  } else {

    // Set the selection to the start of the tune
    gTheABC.selectionStart = 0;
    gTheABC.selectionEnd = 0; 
  }
}

// Reset ABC text field scroll position

function resetAbcScroll() {

  if (gEnableSyntax) {

    // Scroll it to the top
    gTheCM.getScrollerElement().scrollTo(0, 0);

  } else {

    // Scroll it to the top
    gTheABC.scrollTo(0, 0);    
  }
}

// Move cursor to the end of ABC text field

function setAbcSelectionToEnd() {

  if (gEnableSyntax) {

    gTheCM.setCursor(gTheCM.lastLine(), Infinity);

  } else {

    gTheABC.setSelectionRange(gTheABC.value.length, gTheABC.value.length);
  }
}

// Shift focus to player controls

function doPlayerFocus() {

  const playButton = document.querySelector('.abcjs-midi-start');

  if (playButton) playButton.focus();
}

// Shift focus to the specified element

function doFocusElemDelayed(elemSelector, delayMs) {

  const targetEl =
    document.querySelector(elemSelector);

  if (!targetEl) return;

  setTimeout(() => {

    targetEl.focus();

  }, delayMs);
}

////////////////////////////////////////////
// APP LITE: PASTE TEXT / REPLACE SELECTION
///////////////////////////////////////////

// Insert clipboard text to the ABC textarea
// Replace selected ABC text if selection found

function litePasteToABC() {

  sendGoogleAnalytics("action", "litePasteToABC");

  navigator.clipboard.readText()
    .then(text => {

      if (!text) return;

      const abcArea =
        gEnableSyntax? gTheCM : gTheABC;

      abcArea.focus();

      const selectionStart =
        abcArea.selectionStart;

      const selectionEnd =
        abcArea.selectionEnd;

      const nTunes = CountTunes();

      if (selectionStart || selectionStart !== selectionEnd) {

        if (nTunes && selectionStart && text.startsWith('X:')) text = `\n\n${text}\n`;

        if (gEnableSyntax) {

          abcArea.replaceSelection(text, 'around');

        } else {

          abcArea.setRangeText(text, selectionStart, selectionEnd, 'select');
        }

        RenderAsync(true, null);

        return;
      }

      if (nTunes && text.startsWith('X:')) text = `\n\n${text}`;

      ProcessAddTune(text);
    })
    .catch(error => {

      console.warn("Error pasting text from clipboard:", error);
    });
}

////////////////////////////////////////////
// APP LITE: UI LISTBOXES NAVIGATION
///////////////////////////////////////////

// Handle roving tabindex navigation in a list of selectable items

function liteNavFocusWithRovingTabIndex(item, itemsArr) {

  if (!item || !itemsArr || !itemsArr.length) return;

  itemsArr.forEach(el => el.tabIndex = -1);

  item.tabIndex = 0;
  item.focus();
}

// Set up initial tabindex state for roving tabindex navigation
// Make only first item in the list focusable by Tab initially

function liteNavInitRovingTabIndex(nodeList) {

  if (!nodeList || !nodeList.length) return;

  nodeList.forEach((el, i) => el.tabIndex = i === 0 ? 0 : -1);
}

// Handle keyboard havigation in Jump to Tune dialog
// Handle double click on Jump to Tune items

function liteNavHandleJumpToTune(e) {

  const listBox = document.getElementById("jumpto-tune-list");

  if (!listBox) return;

  if (e.type === "dblclick") {

    const tune = e.target.closest('[role="option"].jumpto_tune');

    if (tune) {
      e.preventDefault();
      liteNavClickModalOK();
    }
    return;
  }

  const tunes = Array.from(listBox.querySelectorAll('[role="option"].jumpto_tune'));
  const current = e.target.closest('[role="option"].jumpto_tune');
  const idx = tunes.indexOf(current);

  if (e.key === "Enter" || e.key === " ") {

    if (current) {
      e.preventDefault();
      JumpToToggleSelection(parseInt(current.id.replace('jumpto_tune_', '')));
      liteNavClickModalOK();
    }
    return;
  }

  if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
    e.preventDefault();
    if (tunes.length && idx !== -1) {
      const target = idx === 0 ? tunes[tunes.length - 1] : tunes[idx - 1];
      JumpToToggleSelection(parseInt(target.id.replace('jumpto_tune_', '')));
      liteNavFocusWithRovingTabIndex(target, tunes);
    }
    return;
  }

  if (e.key === "ArrowDown" || e.key === "ArrowRight") {
    e.preventDefault();
    if (tunes.length && idx !== -1) {
      const target = idx === tunes.length - 1 ? tunes[0] : tunes[idx + 1];
      JumpToToggleSelection(parseInt(target.id.replace('jumpto_tune_', '')));
      liteNavFocusWithRovingTabIndex(target, tunes);
    }
    return;
  }

  if (e.key === "Home") {
    e.preventDefault();
    if (tunes.length) {
      JumpToToggleSelection(parseInt(tunes[0].id.replace('jumpto_tune_', '')));
      liteNavFocusWithRovingTabIndex(tunes[0], tunes);
    }
    return;
  }

  if (e.key === "End") {
    e.preventDefault();
    if (tunes.length) {
      JumpToToggleSelection(parseInt(tunes[tunes.length - 1].id.replace('jumpto_tune_', '')));
      liteNavFocusWithRovingTabIndex(tunes[tunes.length - 1], tunes);
    }
    return;
  }
}

// Initialize keyboard havigation in Jump to Tune dialog
// Initialize mouse interactions in with Jump to Tune items

function liteNavInitJumpToTune() {

  const listBox = document.getElementById("jumpto-tune-list");

  if (!listBox) return;

  const tunes = listBox.querySelectorAll('[role="option"].jumpto_tune');

  if (!tunes.length) return;

  let active =
    listBox.querySelector('[role="option"].jumpto_tune[aria-selected="true"]');
  
  if (!active) {
    liteNavInitRovingTabIndex(tunes);
    active = tunes[0];
  }

  tunes.forEach(el => { if (el !== active) el.tabIndex = -1; });

  listBox.addEventListener('keydown', liteNavHandleJumpToTune);

  listBox.addEventListener('dblclick', liteNavHandleJumpToTune);

  listBox.addEventListener('focusin', (e) => {

    const tune = e.target.closest('[role="option"].jumpto_tune');

    if (tune && tune.getAttribute('aria-selected') !== 'true') {
      if (e.relatedTarget && listBox.contains(e.relatedTarget)) return;
      var idx = tune.id.replace('jumpto_tune_', '');
      JumpToToggleSelection(parseInt(idx));
      const all = listBox.querySelectorAll('[role="option"].jumpto_tune');
      liteNavFocusWithRovingTabIndex(tune, Array.from(all));
    }
  });

  // Toggle selection on click
  listBox.addEventListener('click', (e) => {
    const tune = e.target.closest('[role="option"].jumpto_tune');
    if (tune) {
      var idx = tune.id.replace('jumpto_tune_', '');
      JumpToToggleSelection(parseInt(idx));
      const all = listBox.querySelectorAll('[role="option"].jumpto_tune');
      liteNavFocusWithRovingTabIndex(tune, Array.from(all));
    }
  });
}

// Handle keyboard havigation for listboxes with multiple selectable items
// Handle navigation used in Reorder Tunes and Create Tune Set dialogs

function liteNavHandleMultiSelectList(e, toggleFn) {

  const listBox = e.currentTarget;
  const currentTune = e.target.closest('[role="option"]');

  if (!currentTune || !toggleFn) return;

  const all =
    Array.from(listBox.querySelectorAll('[role="option"]'))
      .filter((tune) => tune.offsetParent !== null);

  const idx = all.indexOf(currentTune);
  if (idx === -1) return;

  if (e.key === ' ' && e.shiftKey) {

    e.preventDefault();
    const anchor = listBox._lastSelected || currentTune;
    const anchorIdx = all.indexOf(anchor);
    if (anchorIdx !== -1) liteNavSelectRange(anchorIdx, all);
    listBox._lastSelected = currentTune;
    currentTune.focus();
    return;
  }

  if (e.key === " " || e.key === "Enter") {

    e.preventDefault();
    toggleFn(currentTune);
    listBox._lastSelected = currentTune;
    currentTune.focus();
    return;
  }

  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();

    if (e.shiftKey) {
      const targetTune = all[idx === 0 ? all.length - 1 : idx - 1];
      toggleFn(targetTune);
    }

    liteNavFocusWithRovingTabIndex(idx === 0 ? all[all.length - 1] : all[idx - 1], all);
    return;
  }

  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();

    if (e.shiftKey) {
      const targetTune = all[idx === all.length - 1 ? 0 : idx + 1];
      toggleFn(targetTune);
    }

    liteNavFocusWithRovingTabIndex(idx === all.length - 1 ? all[0] : all[idx + 1], all);
    return;
  }

  if (e.key === 'Home') {
    e.preventDefault();

    if (e.ctrlKey && e.shiftKey) {
      liteNavSelectRange(0, all);
      listBox._lastSelected = currentTune;
    }

    liteNavFocusWithRovingTabIndex(all[0], all);
    return;
  }

  if (e.key === 'End') {
    e.preventDefault();

    if (e.ctrlKey && e.shiftKey) {
      liteNavSelectRange(all.length - 1, all);
      listBox._lastSelected = currentTune;
    }

    liteNavFocusWithRovingTabIndex(all[all.length - 1], all);
    return;
  }

  if ((e.key === 'a' || e.key === 'A') && e.ctrlKey) {
    e.preventDefault();

    const allSelected =
      all.every((tune) => tune.getAttribute('aria-selected') === 'true');

    all.forEach((tune) => {
      const isSelected = tune.getAttribute('aria-selected') === 'true';
      if ((!allSelected && !isSelected) ||
          (allSelected && isSelected)) {
        toggleFn(tune);
      }
    });
    return;
  }
}

// Initialize keyboard navigation in multi-select option list
// Initialize click to toggle in multi-select option list 

function liteNavInitMultiSelectList(listBoxId, toggleFn) {

  const listBox = document.getElementById(listBoxId);

  if (!listBox) return;

  listBox._lastSelected = null;

  const tunes = listBox.querySelectorAll('[role="option"]');

  liteNavInitRovingTabIndex(tunes)

  listBox.addEventListener('keydown', (e) => {
    liteNavHandleMultiSelectList(e, toggleFn)
  });
  
  listBox.addEventListener('click', (e) => {
    const tune = e.target.closest('[role="option"]');
    if (tune) {
      toggleFn(tune);
    }
  });
}

// Handle selecting a range of options for keyboard navigation
// Select from anchor to current, deselect other options

function liteNavSelectRange(anchorIdx, itemsArr) {

  const min = Math.min(anchorIdx, idx);
  const max = Math.max(anchorIdx, idx);

  itemsArr.forEach(function(item, i) {
    const isSelected = 
      item.getAttribute('aria-selected') === 'true';
    if (i >= min && i <= max) {
      if (!isSelected) toggleFn(item);
    } else {
      if (isSelected) toggleFn(item);
    }
  });
}

// Handle drag-and-drop list keyboard navigation (Reorder Tunes dialog)
// Arrow navigation shifts focus between items without moving them
// Single press, Space or Enter trigger dragging mode, arrows shift items
// Moving items beyond visible range auto-scrolls the parent dialog

function liteNavHandleDragDropListKeyDown(e, onReorder) {

  const listBox = e.currentTarget;
  const item = e.target.closest('[role="option"]');

  if (!item) return;

  const all = Array.from(listBox.querySelectorAll('[role="option"]'));
  const idx = all.indexOf(item);

  if (e.key === 'Enter' || e.key === ' ') {

    e.preventDefault();

    if (listBox._dragMode) {

      // Exit drag mode
      listBox._dragMode = false;
      // item.classList.remove('draggable_tune_selected', 'draggable_tune_mobile_selected');
      item.setAttribute('aria-selected', 'false');
      item.removeAttribute('aria-pressed');
      item.removeAttribute('data-dragging');

    } else {

      // Enter drag mode
      listBox._dragMode = true;

      if (listBox._currentItem) {
        // listBox._currentItem.classList.remove('draggable_tune_selected', 'draggable_tune_mobile_selected');
        listBox._currentItem.setAttribute('aria-selected', 'false');
      }

      listBox._currentItem = item;
      // item.classList.add('draggable_tune_selected');
      listBox._dragItem = item;
      item.setAttribute('aria-selected', 'true');
      item.setAttribute('aria-pressed', 'true');
      item.setAttribute('data-dragging', 'true');
    }
    return;
  }

  if (listBox._dragMode) {

    e.preventDefault();

    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      const prev = item.previousElementSibling;
      if (prev && prev.matches('[role="option"]')) {
        listBox.insertBefore(item, prev);
        item.focus();
        item.scrollIntoView({ block: 'nearest' });
        if (onReorder) onReorder();
      }
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      const next = item.nextElementSibling;
      if (next && next.matches('[role="option"]')) {
        listBox.insertBefore(next, item);
        item.focus();
        item.scrollIntoView({ block: 'nearest' });
        if (onReorder) onReorder();
      }
      return;
    }

    if (e.key === 'Escape') {
      listBox._dragMode = false;
      // item.classList.remove('draggable_tune_selected', 'draggable_tune_mobile_selected');
      item.setAttribute('aria-selected', 'false');
      return;
    }

    return;
  }

  // Normal navigation mode: roving tabindex with wrap-around
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
    e.preventDefault();
    liteNavFocusWithRovingTabIndex(idx === 0 ? all[all.length - 1] : all[idx - 1], all);
    return;
  }

  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
    e.preventDefault();
    liteNavFocusWithRovingTabIndex(idx === all.length - 1 ? all[0] : all[idx + 1], all);
    return;
  }

  if (e.key === 'Home') {
    e.preventDefault();
    if (all.length) liteNavFocusWithRovingTabIndex(all[0], all);
    return;
  }

  if (e.key === 'End') {
    e.preventDefault();
    if (all.length) liteNavFocusWithRovingTabIndex(all[all.length - 1], all);
    return;
  }
}

// Initialize Reorder Tunes keyboard navigation

function liteNavInitDragDropListKeyDown(listBox) {

  const onKeyboardReorder = () => {
    const currentItems = listBox.querySelectorAll('[role="option"]');
    listBox._newOrder =
      Array.from(currentItems)
        .map((item) => item.dataset.tuneIndex);
  }

  // Attach event listener, pass custom onReorder logic
  listBox.addEventListener('keydown', (e) =>
    liteNavHandleDragDropListKeyDown(e, onKeyboardReorder)
  );

  // Apply roving tabindex: only first item focusable by Tab initially
  const items = listBox.querySelectorAll('[role="option"]');
  liteNavInitRovingTabIndex(items);
}

// Handle drag-and-drop functionality of interactive listbox (Reorder Tunes dialog)
// Use unified click / touch events logic via Pointer Events API
// Handle customization for event types via opts object

function liteNavHandleDragDropListPointerEvents(listDiv, opts) {

  if (!listDiv) return;

  opts = opts || {};
  
  const listBox = listDiv;
  const tuneSelector = opts.tuneSelector || '[role="option"]';
  const longPressMs = opts.longPressMs != null ? opts.longPressMs : 200;
  const moveThreshold = opts.moveThreshold != null ? opts.moveThreshold : 10;

  // Touchscreens: Prevent accidental scroll on touch-drag
  listBox.querySelectorAll(tuneSelector).forEach((el) => {
    el.style.touchAction = 'none';
  });

  let dragTarget = null;
  let startY = 0;
  let isDragging = false;
  let hasMoved = false;
  let longPressTimer = null;
  let movedSignificantly = false;

  listBox.addEventListener('pointerdown', (e) => {

    const tune = e.target.closest(tuneSelector);
    if (!tune) return;

    listBox.setPointerCapture(e.pointerId);

    dragTarget = tune;
    startY = e.clientY;
    isDragging = false;
    hasMoved = false;
    movedSignificantly = false;
    longPressTimer = null;

    // Set long press timeout
    longPressTimer = setTimeout(() => {
      // Detect scroll: Don't start drag if user swiped on element
      if (dragTarget && !isDragging && !movedSignificantly) {
        isDragging = true;
        if (opts.onStart) opts.onStart(dragTarget);
      }
    }, longPressMs);
  });

  listBox.addEventListener('pointermove', (e) => {

    if (!dragTarget) return;

    const dy = Math.abs(e.clientY - startY);

    // Detect swipe vs. tap: Track significant movement regardless of drag state
    if (dy > moveThreshold) {
      movedSignificantly = true;
    }

    // Touchscreens: Programmatically scroll parent during pre-drag swipe
    if (!isDragging && e.pointerType === 'touch' && movedSignificantly) {
      scrollClosestScrollableParent(listBox, startY - e.clientY);
      startY = e.clientY;
      return;
    }

    // Desktop: Start drag on significant movement before long-press timer
    if (!isDragging && dy > moveThreshold && e.pointerType !== 'touch') {
      clearTimeout(longPressTimer);
      isDragging = true;
      if (opts.onStart) opts.onStart(dragTarget);
    }

    if (!isDragging) return;

    // Set hasMoved only on movement during active drag
    // Handle hold + release like a click, not a drag
    if (dy > moveThreshold) {
      hasMoved = true;
    }

    e.preventDefault();

    // Find the drop target under the pointer
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    let dropTarget = null;
    for (let i = 0; i < elements.length; i++) {
      const candidate = elements[i].closest(tuneSelector);
      if (candidate && candidate !== dragTarget) {
        dropTarget = candidate;
        break;
      }
    }

    if (dropTarget) {
      const rect = dropTarget.getBoundingClientRect();
      const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
      if (next) {
        listBox.insertBefore(dragTarget, dropTarget.nextElementSibling);
      } else {
        listBox.insertBefore(dragTarget, dropTarget);
      }
      if (opts.onReorder) opts.onReorder();
    }

    // Auto-scroll when dragging near listBox edges
    const listBoxRect = listBox.getBoundingClientRect();
    const scrollThreshold = 30;
    const scrollSpeed = 10;
    const visibleTop = Math.max(listBoxRect.top, 0);
    const visibleBottom = Math.min(listBoxRect.bottom, window.innerHeight);

    if (e.clientY < visibleTop + scrollThreshold) {

      scrollClosestScrollableParent(listBox, -scrollSpeed);

    } else if (e.clientY > visibleBottom - scrollThreshold) {
      
      scrollClosestScrollableParent(listBox, scrollSpeed);
    }
  });

  listBox.addEventListener('pointerup', (e) => {

    clearTimeout(longPressTimer);

    if (isDragging) {

      if (opts.onEnd) opts.onEnd(dragTarget);

    } else if (!movedSignificantly) {

      if (opts.onPointerTap) opts.onPointerTap(dragTarget);
    }

    listBox._dragMoved = hasMoved;

    dragTarget = null;
    isDragging = false;

    // Clear suppression flag after click has had time to fire
    setTimeout(function() { listBox._dragMoved = false; }, 100);
  });

  listBox.addEventListener('pointercancel', (e) => {

    clearTimeout(longPressTimer);

    // If drag was active, clean up selection state
    if (isDragging && opts.onEnd) {
      opts.onEnd(dragTarget);
    }

    listBox._dragMoved = false;
    dragTarget = null;
    isDragging = false;
  });
}

// Initialize drag-and-drop listbox navigation for Reorder Tunes dialog
// Optionally customize for touchscreen devices (desktop and mobile)

function liteNavInitDragDropListReorderTunes(listDiv, touchDelay, isTouchScreen) {

  if (!listDiv) return;

  const listBox = listDiv;
  
  liteNavHandleDragDropListPointerEvents(listBox, {

    longPressMs: touchDelay || null,

    onPointerTap: (item) => {
      if (listBox._currentItem) {
        listBox._currentItem.setAttribute('aria-selected', 'false');
      }
      listBox._currentItem = item;
      item.setAttribute('aria-selected', 'true');
      const allItems = Array.from(listBox.querySelectorAll('[role="option"]'));
      liteNavFocusWithRovingTabIndex(item, allItems);
    },

    onStart: (item) => {
      listBox._dragItem = item;
      if (listBox._currentItem) {
        listBox._currentItem.setAttribute('aria-selected', 'false');
      }
      listBox._currentItem = item;
      item.setAttribute('aria-selected', 'true');
      item.setAttribute('aria-pressed', 'true');
      item.setAttribute('data-dragging', 'true');
      listBox._dragMode = true;
      const allItems = Array.from(listBox.querySelectorAll('[role="option"]'));
      liteNavFocusWithRovingTabIndex(item, allItems);
    },

    onReorder: () => {
      const tunes = listBox.querySelectorAll('[role="option"]');
      listBox._newOrder =
        Array.from(tunes)
          .map((tune) => tune.dataset.tuneIndex);
    },

    onEnd: (item) => {
      item.removeAttribute('data-dragging');
      item.removeAttribute('aria-pressed');
      listBox._dragMode = false;
    }
  });

  if (isTouchScreen) {
    // Handle tap to select (suppressed after a drag)
    listBox.addEventListener('click', (e) => {
      if (listBox._dragMoved) return;
      const tune = e.target.closest('[role="option"]');
      if (tune && listBox._onPointerTap) {
        listBox._onPointerTap(tune);
      }
    });
  }
}

// Scroll the nearest scrollable ancestor (modal dialog etc.)
// Handles scrolling for lists of elements with touch-action disabled

function scrollClosestScrollableParent(el, dy) {

  let parent = el.parentElement;
  
  while (parent) {
    const style = getComputedStyle(parent);
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll' ||
          style.overflow === 'auto' || style.overflow === 'scroll') &&
        parent.scrollHeight > parent.clientHeight) {
      parent.scrollTop += dy;
      return;
    }
    parent = parent.parentElement;
  }
}

// Select tab in ABC Tools Links Center

function liteOpenToolsLinks_SelectTab(tabId) {

  const dialog =
    document.getElementById("abc-tools-links-dialog");
  
  if (!dialog) return;

  const buttons = dialog.querySelectorAll(".adv-tab-btn");
  const panels = dialog.querySelectorAll(".adv-tab-panel");

  buttons.forEach(function(btn) {
    var active = (btn.getAttribute("data-tab") === tabId);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  panels.forEach(function(panel) {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

// Initialize tabs in ABC Tools Links Center

function liteOpenToolsLinks_InitTabs() {

  const dialog =
    document.getElementById("abc-tools-links-dialog");

  const tabs = dialog.querySelectorAll('[data-tab]');

  tabs.forEach(
    el => el.addEventListener(
      'click',
      () => liteOpenToolsLinks_SelectTab(el.dataset.tab)
    )
  );
}

////////////////////////////////////////////
// APP LITE: UI MODALS NAVIGATION (LEGACY)
///////////////////////////////////////////

// Click the modal OK button programmatically

function liteNavClickModalOK() {

  const buttons = document.getElementsByClassName("modal_flat_ok");

  for (let i = 0; i < buttons.length; ++i) {

    buttons[i].click();
    break;
  }
}

////////////////////////////////////////////
// APP LITE: UI OPEN CUSTOM DIALOGS (LEGACY)
///////////////////////////////////////////

// Populate and open ABC Tools Links Center

function liteOpenToolsLinks() {

  let modalContent = '';

  // Modal Dialog Header
  modalContent +=
    '<h2 class="modal-header modal-header-settings">' +
    'ABC Tools Links Center' +
    '</h2>';

  // Modal Dialog Body
  modalContent +=
    '<div id="abc-tools-links-dialog" class="adv-tabs">';
  
  // Modal Tabs
  modalContent +=
    '<div class="adv-tab-bar">' +
      '<button type="button" class="adv-tab-btn active" data-tab="tab_tools" aria-selected="true">Tools</button>' +
      '<button type="button" class="adv-tab-btn" data-tab="tab_specs">Specs</button>' +
      '<button type="button" class="adv-tab-btn" data-tab="tab_pages">Pages</button>' +
      '<button type="button" class="adv-tab-btn" data-tab="tab_eskin">Michael Eskin</button>' +
      '<button type="button" class="adv-tab-btn" data-tab="tab_zille">Anton Zille</button>' +
    '</div>';

  // Modal Panels
  modalContent +=
    '<div class="adv-tab-panels">' +
      '<div id="tab_tools" class="adv-tab-panel adv-tab-links-container active">' +
        // Tools
        '<button class="saveaswebsite btn btn-top btn-lite-lime" id="saveaswebsite" onclick="generateWebsite();" title="Export Tunebook as Website or Gallery" aria-label="Export Tunebook as Website or Gallery">Export Website</button>' +
        '<button class="saveaswebsite btn btn-top btn-lite-lime" id="opentuningtools" onclick="TuningTools();" title="Open Michael Eskin\'s Tuning Tools" aria-label="Open Michael Eskin\'s Tuning Tools">Tuning Tools</button>' +
        '<button class="saveaswebsite btn btn-top btn-lite-lime" id="openothertools" onclick="OtherABCTools();" title="Open Michael Eskin\'s Other ABC Tools" aria-label="Open Michael Eskin\'s Other ABC Tools">Other ABC Tools</button>' +
      '</div>' +
      '<div id="tab_specs" class="adv-tab-panel adv-tab-links-container">' +
        // Specs
        '<a href="https://abcnotation.com/wiki/abc:standard:v2.1" target="_blank" class="btn btn-link" title="Open ABC Notation Standard Wiki (External Link)" aria-label="Open ABC Notation Standard Wiki (External Link)">ABC Standard v2.1</a>' +
        '<a href="https://michaeleskin.com/abctools/ABCquickRefv0_6.pdf" target="_blank" class="btn btn-link" title="Open ABC Notation Quick Reference (External Link)" aria-label="Open ABC Notation Quick Reference (External Link)">ABC Quick Reference</a>' +
        '<a href="https://michaeleskin.com/abctools/general_midi_extended_v10.pdf" target="_blank" class="btn btn-link" title="Open MIDI Quick Reference (External Link)" aria-label="Open MIDI Quick Reference (External Link)">MIDI Quick Reference</a>' +
      '</div>' +
      '<div id="tab_pages" class="adv-tab-panel adv-tab-links-container">' +
        // Pages
        '<a href="https://michaeleskin.com/abctools/userguide.html" target="_blank" class="btn btn-link btn-lite-lime" title="Open ABC Transcription Tools User Guide (External Link)" aria-label="Open ABC Transcription Tools User Guide (External Link)">ABC Tools User Guide</a>' +
        '<a href="tunesources.html" target="_blank" class="btn btn-link btn-lite-lime" title="Open ABC Tools Lite Tune Sources Page" aria-label="Open ABC Tools Lite Tune Sources Page">ABC Tune Sources</a>' +
        '<a href="credits.html" target="_blank" class="btn btn-link btn-lite-lime" title="Open ABC Tools Lite Credits Page" aria-label="Open ABC Tools Lite Credits Page">Credits & Thanks</a>' +
      '</div>' +
      '<div id="tab_eskin" class="adv-tab-panel adv-tab-links-container">' + 
        // Michael Eskin
        '<a href="https://michaeleskin.com/" target="_blank" class="btn btn-link" title="Open Michael Eskin\'s Homepage (External Link)" aria-label="Open Michael Eskin\'s Homepage (External Link)">Homepage</a>' +
        '<a href="https://michaeleskin.com/abctools/tipjars.html" target="_blank" class="btn btn-link" title="Open Michael Eskin\'s Tip Jars (External Link)" aria-label="Open Michael Eskin\'s Tip Jars (External Link)">Tip Jars</a>' +
        '<a href="https://michaeleskin.com/tunebooks.html" target="_blank" class="btn btn-link" title="Open Michael Eskin\'s Tunebooks (External Link)" aria-label="Open Michael Eskin\'s Tunebooks (External Link)">Tunebooks</a>' +
      '</div>' +
      '<div id="tab_zille" class="adv-tab-panel adv-tab-links-container">' +
        // Anton Zille
        '<a href="https://github.com/anton-bregolas/abctools-lite" target="_blank" class="btn btn-link btn-lite-lime" title="Open ABC Tools Lite GitHub Page (External Link)" aria-label="Open ABC Tools Lite GitHub Page (External Link)">ABC Tools Lite (GitHub)</a>' +
        '<a href="https://ns.tunebook.app/" target="_blank" class="btn btn-link btn-lite-lime" title="Open Novi Sad Session Setlist App (External Link)" aria-label="Open Novi Sad Session Setlist App (External Link)">NS Session Setlist</a>' +
        '<a href="https://denis.tunebook.app/" target="_blank" class="btn btn-link btn-lite-lime" title="Open Project Denis App (External Link)" aria-label="Open Project Denis App (External Link)">#ProjectDenis</a>' +
      '</div>' +
    '</div>';
  
  // Modal Dialog Body Close
  modalContent += '</div>';

  DayPilot.Modal.alert(modalContent, {
    theme: "modal_flat",
    top: 50,
    width: 700,
    scrollWithPage: (AllowDialogsToScroll())
  });

  liteOpenToolsLinks_InitTabs();
}

// Populate and open ABC Tools Lite: Latest dialog

function liteOpenToolsLatestScreen() {

  let modal_msg = '';

  modal_msg += '<a href="https://github.com/anton-bregolas/abctools-lite#abc-tools-lite" target="_blank" ';
	modal_msg += 'title="About ABC Tools Lite: Visit Readme Page on GitHub" aria-label="About ABC Tools Lite: Visit Readme Page on GitHub" class="modal-header-ui modal-link-help dialogcornerbutton">';
	modal_msg += '<svg aria-hidden="true"><use href="#lite-icon-help"></use></svg>';
  modal_msg += '</a>';
  
  // Updates Dialog Wrapper
  modal_msg += '<div class="modal-wrapper-centered-column">';

  // Updates Dialog Header
  modal_msg += '<header class="modal-header-updates-container">';
  modal_msg += '<h2 class="modal-header-updates">ABC Tools Lite: Latest</h2>';
  modal_msg += '<h3 class="modal-subheader modal-subheader-updates">Version ' + gLiteVersionNumber + ' (June 2026)</h3>';
  modal_msg += '</header>';

  // Updates Dialog Intro
  modal_msg += '<p class="modal-subheader-updates modal-subheader-intro">';
  modal_msg += 'Some of the latest custom changes, fixes and improvements added to the fork:';
  modal_msg += '</p>';

  // Updates Dialog Summary
  modal_msg += '<section class="modal-section-updates modal-section-summary">';
  modal_msg += '<h4>Update Summary</h4>';
  modal_msg += '<ul>';
  modal_msg += '<li><strong>ABC Tools Lite</strong>: Dialog modals have been redesigned. Menus adapt to page, content scrolls within, no more background scroll & "flyaway" dialogs.</li>';
  modal_msg += '<li><strong>ABC Tools Lite</strong>: Full keyboard navigation support for editor & menus.</li>';
  modal_msg += '<li><strong>ABC Tools Lite</strong>: New <a href="https://github.com/anton-bregolas/abctools-lite#tools-lite-new-keyboard-shortcuts" target="_blank" title="View Full List of Keyboard Shortcuts on ABC Tools Lite GitHub">keyboard shortcuts</a> and <a href="https://github.com/anton-bregolas/abctools-lite#tools-lite-new-customization-options" target="_blank" title="View Full List of New Customization Options on ABC Tools Lite GitHub">customization options</a> added.</li>';
  modal_msg += '<li><strong>ABC Tools Lite</strong>: Custom new <a href="https://github.com/anton-bregolas/abctools-lite#ui-fixes--features-roadmap" target="_blank" title="View Full List of Custom UI Features on ABC Tools Lite GitHub">fonts, icons and styles</a> added to UI components.</li>';
  modal_msg += '<li><strong>ABC Transcription Tools</strong> updated to version <b>' + gVersionNumber + '</b>.</li>';
  modal_msg += '</ul>';
  modal_msg += '</section>';

  // Updates Dialog Latest
  modal_msg += '<section class="modal-section-updates">';
  modal_msg += '<h4>Selected Updates</h4>';
  modal_msg += '<ul>';
  modal_msg += '<li>Menus with interactive lists now fully support <b>arrow navigation</b> and follow accessibility patterns. Use <b>Tab</b> / <b>Shift + Tab</b> to enter or exit the list, <b>↑ ↓ ← →</b> to navigate, <b>Space / Enter</b> to select an item and <b>Shift + ↑ ↓ ← →</b> to multi-select.</li>';
  modal_msg += '<li>Quickly confirm <b>Jump to Tune</b> with a <b>double click</b> or <b>Space / Enter</b> on the selected item. Select an item in <b>Reorder Tunes</b> with <b>Space / Enter</b> to enter the drag-and-drop mode, use arrows to reorder.</li>';
  modal_msg += '<li>Try updated <b>context menu (Ctrl + Shift + F10)</b> which now uses modern anchor positioning and semantic markup. Access newly-added tools via <b>ABC Tools Links</b>.</li>';
  modal_msg += '<li>You can now send your tunes to <a href="https://ns.tunebook.app/abc-encoder.html" title="Open Anton Zille\'s ABC Encoder Tool, a Swiss army knife of ABC collection editing" target="_blank"><b>ABC Encoder</b></a> for advanced sorting, formatting or encoding via the <b>Sharing</b> dialog. Sorted ABC can then be reopened in ABC Tools.</li>';
  modal_msg += '<li>The ongoing <b>ABC Tools restyle</b> goes hand in hand with laborious <b>accessibility improvements</b>. If you find my work useful, consider <a href="https://ns.tunebook.app/" target="_blank" title="View Anton Zille\'s tunebook projects and support options"><b>Supporting & Following</b></a>.</li>';
  modal_msg += '</ul>';
  modal_msg += '</section>';
  
  // Updates Dialog Archive
  modal_msg += '<section class="modal-section-updates">';
  modal_msg += '<details><summary><b>Updates Archive</b></summary><ul>';
  modal_msg += '<li>Try custom <a href="https://github.com/anton-bregolas/abctools-lite#tools-lite-new-keyboard-shortcuts" target="_blank" title="View Full List of Keyboard Shortcuts on ABC Tools Lite GitHub"><b>keyboard shortcuts</b></a> to speed up tasks and get to editing ABC quicker.</li>';
  modal_msg += '<li>Try <b>compact mode (Shift + F9)</b> to save more screen space on narrow devices.</li>';
  modal_msg += '<li><b>Copy</b> & <b>Paste</b> buttons with smart insert / replace logic added to the top bar.</li>';
  modal_msg += '<li>New <b>X</b> button ensures app menus are easy to <b>quit</b> for desktop & mobile users.</li>';
  modal_msg += '<li>Keyboard users can now <b>Tab</b> through editor and notation buttons and open menus with <b>Enter</b> / <b>Space</b>. All dialogs now support pressing <b>Escape</b> to exit.</li>';
  modal_msg += '<li>Full support for <b>Deflate</b> compression algorithm added to Export Websites.</li>';
  modal_msg += '<li>Updated <b>Help Dialog</b> now shows tips depending on the current view.</li>';
  modal_msg += '</ul></details>';
  modal_msg += '</div>';

  DayPilot.Modal.alert(modal_msg, {
    theme: "modal_flat",
    top: 25,
    width: 720,
    scrollWithPage: (AllowDialogsToScroll()),
    layout: "compact"
  });
}