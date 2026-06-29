///////////////////////////////////////////////////////////////////////
// ABC Tools Lite Dialog Modals
// <dialog> shim for the legacy DayPilot.Modal library
// https://github.com/anton-bregolas/abctools-lite
// MIT License
// (c) Anton Zille 2026
///////////////////////////////////////////////////////////////////////

window.DayPilot = window.DayPilot || {};

(function () {
  "use strict";

  let currentDialog = null;
  let currentResolve = null;
  let currentType = null;
  const dialogStack = [];

  function escapeHtml(str) {
    if (str == null) return "";
    str = String(str);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let closingInProgress = false;
  let isKeyboard = false;
  let pendingFocusId = null;

  document.addEventListener("keydown", function () { isKeyboard = true; }, true);
  document.addEventListener("mousedown", function () { isKeyboard = false; }, true);
  document.addEventListener("touchstart", function () { isKeyboard = false; }, true);

  function closeDialog(result) {
    if (closingInProgress) return;
    closingInProgress = true;
    if (dialogStack.length > 0) {
      const currentDialogToClose = currentDialog;
      const currentResolveToResolve = currentResolve;

      const prev = dialogStack.pop();
      currentDialog = prev.dialog;
      currentResolve = prev.resolve;
      currentType = prev.type;

      if (currentDialogToClose) {
        currentDialogToClose.close();
        currentDialogToClose.remove();
      }

      if (currentResolveToResolve) {
        const canceled = result === null;
        currentResolveToResolve({ canceled: canceled, result: canceled ? null : result });
      }

      const focused = prev.focusedElement;
      if (focused && document.body.contains(focused)) {
        focused.focus();
      } else if (currentDialog) {
        const xBtn = currentDialog.querySelector(".modal_flat_x");
        if (xBtn) xBtn.focus();
      }
    } else {
      if (currentDialog && currentDialog.contains(document.activeElement)) {
        pendingFocusId = document.activeElement.id || null;
      }
      if (currentResolve) {
        const canceled = result === null;
        currentResolve({ canceled: canceled, result: canceled ? null : result });
        currentResolve = null;
      }
      if (currentDialog) {
        currentDialog.close();
        currentDialog.remove();
        currentDialog = null;
      }
      currentType = null;

      document.body.removeAttribute("data-dialog");
    }
    closingInProgress = false;
  }

  function onDialogClose(e) {
    if (e && e.target && e.target !== currentDialog) return;
    closeDialog(null);
  }

  function buildFormHTML(formDef, data, theme) {
    let html = "";
    for (let i = 0; i < formDef.length; i++) {
      const field = formDef[i];
      if (field.html) {
        html += field.html;
      } else {
        const id = field.id || "field_" + i;
        const value = (data && data[field.id] !== undefined) ? data[field.id] : "";
        const cssClass = field.cssClass || "";
        const label = field.name || "";

        if (field.type === "checkbox") {
          const checked = value ? " checked" : "";
          html += '<div class="' + theme + '_form_item ' + cssClass + '">';
          html += '<label class="' + theme + '_form_item_label">';
          html += '<input type="checkbox" id="' + escapeHtml(id) + '" name="' + escapeHtml(id) + '"' + checked + ' />';
          html += ' ' + label;
          html += '</label></div>';
        } else if (field.type === "select") {
          html += '<div class="' + theme + '_form_item ' + cssClass + '">';
          html += '<label class="' + theme + '_form_item_label" for="' + escapeHtml(id) + '">' + label + '</label>';
          html += '<select id="' + escapeHtml(id) + '" name="' + escapeHtml(id) + '">';
          const opts = field.options || [];
          for (let j = 0; j < opts.length; j++) {
            const sel = (opts[j].id === value || opts[j].name === value) ? ' selected' : '';
            html += '<option value="' + escapeHtml(opts[j].id) + '"' + sel + '>' + escapeHtml(opts[j].name || opts[j].id) + '</option>';
          }
          html += '</select></div>';
        } else if (field.type === "radio") {
          html += '<div class="' + theme + '_form_item ' + cssClass + '">';
          html += '<div class="' + theme + '_form_item_label">' + label + '</div>';
          const opts2 = field.options || [];
          for (let k = 0; k < opts2.length; k++) {
            const chk = (opts2[k].id === value || opts2[k].name === value) ? ' checked' : '';
            html += '<label><input type="radio" name="' + escapeHtml(id) + '" value="' + escapeHtml(opts2[k].id) + '"' + chk + ' /> ';
            html += escapeHtml(opts2[k].name || opts2[k].id) + '</label> ';
          }
          html += '</div>';
        } else if (field.type === "textarea") {
          html += '<div class="' + theme + '_form_item ' + cssClass + '">';
          html += '<label class="' + theme + '_form_item_label" for="' + escapeHtml(id) + '">' + label + '</label>';
          html += '<textarea id="' + escapeHtml(id) + '" name="' + escapeHtml(id) + '">' + escapeHtml(value) + '</textarea>';
          html += '</div>';
        } else {
          html += '<div class="' + theme + '_form_item ' + cssClass + '">';
          html += '<label class="' + theme + '_form_item_label" for="' + escapeHtml(id) + '">' + label + '</label>';
          html += '<input type="' + escapeHtml(field.type || "text") + '" id="' + escapeHtml(id) + '" name="' + escapeHtml(id) + '" value="' + escapeHtml(value) + '" />';
          html += '</div>';
        }
      }
    }
    return html;
  }

  function collectFormData(formDef) {
    const result = {};
    for (let i = 0; i < formDef.length; i++) {
      const field = formDef[i];
      if (!field.id || field.html) continue;
      const el = currentDialog && document.getElementById(field.id);
      if (!el) continue;
      if (field.type === "checkbox") {
        result[field.id] = el.checked;
      } else {
        result[field.id] = el.value;
      }
    }
    return result;
  }

  function buildXButton(isCornerX) {
    const btn = document.createElement("button");
    btn.className = `modal_flat_x btn-lite modal-header-ui ${isCornerX? ' corner-x' : ''}`;
    btn.setAttribute("aria-label", "Close dialog");

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");

    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#lite-icon-x");

    svg.appendChild(use);
    btn.appendChild(svg);

    btn.addEventListener("click", function () { closeDialog(null); });
    return btn;
  }

  function showDialog(type, message, extra, options) {

    options = options || {};
    const inputWasKeyboard = isKeyboard;
    const isStacked = (dialogStack.length > 0);
    const theme = options.theme || "modal_flat";
    const width = options.width || 600;

    const dialog = document.createElement("dialog");
    dialog.className = `dp-lite-dialog dp-lite-${type + ' ' + theme}_main dp-modal`;
    if (isStacked) dialog.classList.add("dp-lite-top");
    if (options.layout === "compact") dialog.classList.add("dp-lite-dialog-compact");
    if (options.layout === "legacy") dialog.classList.add("dp-lite-dialog-legacy");

    currentDialog = dialog;
    currentType = type;

    let bodyContent = "";
    if (type === "prompt") {
      bodyContent = '<div class="' + theme + '_content">' + message + '</div>';
      bodyContent += '<div class="' + theme + '_input">';
      bodyContent += '<input type="text" class="dp-lite-input" value="' + escapeHtml(extra || "") + '" style="width:100%;padding:5px;box-sizing:border-box;" />';
      bodyContent += '</div>';
    } else if (type === "form") {
      bodyContent = buildFormHTML(message.formDef, message.data, theme);
    } else {
      bodyContent = '<div class="' + theme + '_content">' + message + '</div>';
    }

    let footerButtons = "";
    if (type === "prompt" || type === "confirm") {
      const okText = options.okText || "OK";
      const cancelText = options.cancelText !== undefined ? options.cancelText : "Cancel";
      footerButtons = '<button class="dp-lite-ok dp-modal-button-ok ' + theme + '_ok">' + escapeHtml(okText) + '</button>';
      if (cancelText !== null) {
        footerButtons += '<button class="dp-lite-cancel ' + theme + '_cancel">' + escapeHtml(cancelText) + '</button>';
      }
    } else if (type === "form") {
      const fOkText = options.okText || "OK";
      const fCancelText = options.cancelText !== undefined ? options.cancelText : "Cancel";
      footerButtons = '<button class="dp-lite-ok dp-modal-button-ok ' + theme + '_ok">' + escapeHtml(fOkText) + '</button>';
      if (fCancelText !== null) {
        footerButtons += '<button class="dp-lite-cancel ' + theme + '_cancel">' + escapeHtml(fCancelText) + '</button>';
      }
    } else {
      const aOkText = options.okText || "OK";
      footerButtons = '<button class="dp-lite-ok dp-modal-button-ok ' + theme + '_ok">' + escapeHtml(aOkText) + '</button>';
    }

    dialog.style.width = width + "px";

    if (options.layout === "legacy" || options.layout === "compact") {

      dialog.innerHTML =
        '<div class="dp-lite-body ' + theme + '_inner">' +
          '<div class="dp-lite-body-scroll" tabindex="-1">' + bodyContent + '</div>' +
          '<div class="dp-lite-footer ' + theme + '_buttons dp-modal-buttons">' + footerButtons + '</div>' +
        '</div>';

      const bodyEl = dialog.querySelector(".dp-lite-body");

      if (!options.noX) {
        const xBtn = buildXButton(options.moveX);
        bodyEl.prepend(xBtn);
      }

      const modalUi = dialog.querySelectorAll(".dp-lite-body .modal-header-ui");
      for (let n = 0; n < modalUi.length; n++) {
        const el = modalUi[n];
        el.remove();
        bodyEl.prepend(el);
      }

    } else {

      dialog.innerHTML =
        '<div class="dp-lite-header">' +
        '</div>' +
        '<div class="dp-lite-body ' + theme + '_inner">' +
          '<div class="dp-lite-body-scroll" tabindex="-1">' + bodyContent + '</div>' +
        '</div>' +
        '<div class="dp-lite-footer ' + theme + '_buttons dp-modal-buttons">' + footerButtons + '</div>';

      if (!options.noX) {
        const xBtn = buildXButton(options.moveX);
        dialog.querySelector(".dp-lite-header").prepend(xBtn);
      }

      const headerEl = dialog.querySelector(".dp-lite-header");
      const modalH = dialog.querySelector(".dp-lite-body h2.modal-header");
      if (modalH) { modalH.remove(); headerEl.appendChild(modalH); }

      const modalUi = dialog.querySelectorAll(".dp-lite-body .modal-header-ui");
      for (let n = 0; n < modalUi.length; n++) {
        const el = modalUi[n];
        el.remove();
        headerEl.insertBefore(el, headerEl.firstChild);
      }
    }

    document.body.appendChild(dialog);

    dialog.addEventListener("close", onDialogClose);

    const okBtn = dialog.querySelector(".dp-lite-ok");
    const cancelBtn = dialog.querySelector(".dp-lite-cancel");

    if (okBtn) {
      okBtn.onclick = function () {
        if (type === "prompt") {
          const input = dialog.querySelector(".dp-lite-input");
          closeDialog(input ? input.value : "");
        } else if (type === "confirm") {
          closeDialog(true);
        } else if (type === "form") {
          closeDialog(collectFormData(message.formDef));
        } else {
          closeDialog(true);
        }
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = function () {
        closeDialog(null);
      };
    }

    if (type === "prompt") {
      const input = dialog.querySelector(".dp-lite-input");
      if (input) {
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            if (okBtn) okBtn.click();
          }
        });
      }
    }

    dialog.showModal();

    document.body.dataset.dialog = "open";

    // Restore focus from a refresh flow (closeDialog saved pendingFocusId)
    let focusRestored = false;
    if (pendingFocusId) {
      const target = dialog.querySelector("#" + pendingFocusId);
      if (target && !target.disabled) {
        target.focus();
        focusRestored = true;
      }
    }

    const playBtn = dialog.querySelector(".abcjs-midi-start");
    if (!focusRestored) {
      if (playBtn) {
        playBtn.focus();
      } else if (type === "prompt") {
        const inp = dialog.querySelector(".dp-lite-input");
        if (inp) { inp.focus(); inp.select(); }
      } else if (type === "confirm") {
        if (okBtn) okBtn.focus();
      } else if (type === "form") {
        const hasAutofocus = dialog.querySelector("[autofocus]");
        if (!hasAutofocus) {
          const xBtn = dialog.querySelector(".modal_flat_x");
          if (xBtn) { xBtn.focus(); }
        }
      } else if (inputWasKeyboard) {
        const xBtn = dialog.querySelector(".modal_flat_x");
        if (xBtn) { xBtn.focus(); } else if (okBtn) okBtn.focus();
      } else if (okBtn) {
        okBtn.focus();
      }
    }

    // Play/Train: abcjs creates .abcjs-midi-start asynchronously after audio loads
    if (!playBtn && dialog.querySelector("#playback-audio")) {
      const observer = new MutationObserver(function () {
        if (pendingFocusId) {
          const target = dialog.querySelector("#" + pendingFocusId);
          pendingFocusId = null;
          if (target && !target.disabled) { target.focus(); observer.disconnect(); return; }
        }
        const btn = dialog.querySelector(".abcjs-midi-start");
        if (btn) {
          btn.focus();
          observer.disconnect();
        }
      });
      observer.observe(dialog, { childList: true, subtree: true });
      setTimeout(function () { observer.disconnect(); }, 15000);
    }
  }

  function pushStack() {
    if (currentDialog) {
      dialogStack.push({
        dialog: currentDialog,
        resolve: currentResolve,
        type: currentType,
        focusedElement: document.activeElement
      });
    }
  }

  window.DayPilot.Modal = {
    alert: function (message, options) {
      return new Promise(function (resolve) {
        pushStack();
        currentResolve = resolve;
        showDialog("alert", message, null, options);
      });
    },

    alertmini: function (message, options) {
      return new Promise(function (resolve) {
        pushStack();
        currentResolve = resolve;
        showDialog("alertmini", message, null, options);
      });
    },

    prompt: function (message, defaultValue, options) {
      return new Promise(function (resolve) {
        pushStack();
        currentResolve = resolve;
        showDialog("prompt", message, defaultValue, options);
      });
    },

    confirm: function (message, options) {
      return new Promise(function (resolve) {
        pushStack();
        currentResolve = resolve;
        showDialog("confirm", message, null, options);
      });
    },

    form: function (formDef, data, options) {
      return new Promise(function (resolve) {
        pushStack();
        currentResolve = resolve;
        showDialog("form", { formDef: formDef, data: data || {} }, null, options);
      });
    },

    close: function (result) {
      closeDialog(result);
    }
  };

})();
