///////////////////////////////////////////////////////////////////////
// ABC Tools Lite Dialog Modals: <dialog> shim for DayPilot.Modal
// https://github.com/anton-bregolas/abctools-lite
// MIT License
// (c) Anton Zille 2026
///////////////////////////////////////////////////////////////////////

window.DayPilot = window.DayPilot || {};

(function () {
  "use strict";

  var currentDialog = null;
  var currentResolve = null;
  var currentType = null;
  var dialogStack = [];

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

  var closingInProgress = false;

  function closeDialog(result) {
    if (closingInProgress) return;
    closingInProgress = true;
    if (dialogStack.length > 0) {
      var currentDialogToClose = currentDialog;
      var currentResolveToResolve = currentResolve;

      var prev = dialogStack.pop();
      currentDialog = prev.dialog;
      currentResolve = prev.resolve;
      currentType = prev.type;

      if (currentDialogToClose) {
        currentDialogToClose.close();
        currentDialogToClose.remove();
      }

      if (currentResolveToResolve) {
        var canceled = result === null;
        currentResolveToResolve({ canceled: canceled, result: canceled ? null : result });
      }
    } else {
      if (currentResolve) {
        var canceled = result === null;
        currentResolve({ canceled: canceled, result: canceled ? null : result });
        currentResolve = null;
      }
      if (currentDialog) {
        currentDialog.close();
        currentDialog.remove();
        currentDialog = null;
      }
      currentType = null;
      document.body.classList.remove("dp-dialog-open");
    }
    closingInProgress = false;
  }

  function onDialogClose() {
    closeDialog(null);
  }

  function buildFormHTML(formDef, data, theme) {
    var html = "";
    for (var i = 0; i < formDef.length; i++) {
      var field = formDef[i];
      if (field.html) {
        html += field.html;
      } else {
        var id = field.id || "field_" + i;
        var value = (data && data[field.id] !== undefined) ? data[field.id] : "";
        var cssClass = field.cssClass || "";
        var label = field.name || "";

        if (field.type === "checkbox") {
          var checked = value ? " checked" : "";
          html += '<div class="' + theme + '_form_item ' + cssClass + '">';
          html += '<label class="' + theme + '_form_item_label">';
          html += '<input type="checkbox" id="' + escapeHtml(id) + '" name="' + escapeHtml(id) + '"' + checked + ' />';
          html += ' ' + label;
          html += '</label></div>';
        } else if (field.type === "select") {
          html += '<div class="' + theme + '_form_item ' + cssClass + '">';
          html += '<label class="' + theme + '_form_item_label" for="' + escapeHtml(id) + '">' + label + '</label>';
          html += '<select id="' + escapeHtml(id) + '" name="' + escapeHtml(id) + '">';
          var opts = field.options || [];
          for (var j = 0; j < opts.length; j++) {
            var sel = (opts[j].id === value || opts[j].name === value) ? ' selected' : '';
            html += '<option value="' + escapeHtml(opts[j].id) + '"' + sel + '>' + escapeHtml(opts[j].name || opts[j].id) + '</option>';
          }
          html += '</select></div>';
        } else if (field.type === "radio") {
          html += '<div class="' + theme + '_form_item ' + cssClass + '">';
          html += '<div class="' + theme + '_form_item_label">' + label + '</div>';
          var opts2 = field.options || [];
          for (var k = 0; k < opts2.length; k++) {
            var chk = (opts2[k].id === value || opts2[k].name === value) ? ' checked' : '';
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
    var result = {};
    for (var i = 0; i < formDef.length; i++) {
      var field = formDef[i];
      if (!field.id || field.html) continue;
      var el = currentDialog && document.getElementById(field.id);
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
    var btn = document.createElement("button");
    btn.className = `modal_flat_x btn-lite modal-header-ui ${isCornerX? ' corner-x' : ''}`;
    btn.setAttribute("aria-label", "Close dialog");

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("aria-hidden", "true");

    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#lite-icon-x");

    svg.appendChild(use);
    btn.appendChild(svg);

    btn.addEventListener("click", function () { closeDialog(null); });
    return btn;
  }

  function showDialog(type, message, extra, options) {

    options = options || {};
    var isStacked = (dialogStack.length > 0);
    var theme = options.theme || "modal_flat";
    var width = options.width || 600;

    var dialog = document.createElement("dialog");
    dialog.className = "dp-lite-dialog " + theme + "_main dp-modal";
    if (isStacked) dialog.classList.add("dp-lite-top");
    if (options.layout === "compact") dialog.classList.add("dp-lite-dialog-compact");
    if (options.layout === "legacy") dialog.classList.add("dp-lite-dialog-legacy");

    currentDialog = dialog;
    currentType = type;

    var bodyContent = "";
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

    var footerButtons = "";
    if (type === "prompt" || type === "confirm") {
      var okText = options.okText || "OK";
      var cancelText = options.cancelText !== undefined ? options.cancelText : "Cancel";
      footerButtons = '<button class="dp-lite-ok dp-modal-button-ok ' + theme + '_ok">' + escapeHtml(okText) + '</button>';
      if (cancelText !== null) {
        footerButtons += '<button class="dp-lite-cancel ' + theme + '_cancel">' + escapeHtml(cancelText) + '</button>';
      }
    } else if (type === "form") {
      var fOkText = options.okText || "OK";
      var fCancelText = options.cancelText !== undefined ? options.cancelText : "Cancel";
      footerButtons = '<button class="dp-lite-ok dp-modal-button-ok ' + theme + '_ok">' + escapeHtml(fOkText) + '</button>';
      if (fCancelText !== null) {
        footerButtons += '<button class="dp-lite-cancel ' + theme + '_cancel">' + escapeHtml(fCancelText) + '</button>';
      }
    } else {
      var aOkText = options.okText || "OK";
      footerButtons = '<button class="dp-lite-ok dp-modal-button-ok ' + theme + '_ok">' + escapeHtml(aOkText) + '</button>';
    }

    dialog.style.width = width + "px";

    if (options.layout === "legacy" || options.layout === "compact") {

      dialog.innerHTML =
        '<div class="dp-lite-body ' + theme + '_inner">' +
          '<div class="dp-lite-body-scroll">' + bodyContent + '</div>' +
          '<div class="dp-lite-footer ' + theme + '_buttons dp-modal-buttons">' + footerButtons + '</div>' +
        '</div>';

      var bodyEl = dialog.querySelector(".dp-lite-body");

      if (!options.noX) {
        var xBtn = buildXButton(options.moveX);
        bodyEl.prepend(xBtn);
      }

      var modalUi = dialog.querySelectorAll(".dp-lite-body .modal-header-ui");
      for (var n = 0; n < modalUi.length; n++) {
        var el = modalUi[n];
        el.remove();
        bodyEl.prepend(el);
      }

    } else {

      dialog.innerHTML =
        '<div class="dp-lite-header">' +
        '</div>' +
        '<div class="dp-lite-body ' + theme + '_inner">' +
          '<div class="dp-lite-body-scroll">' + bodyContent + '</div>' +
        '</div>' +
        '<div class="dp-lite-footer ' + theme + '_buttons dp-modal-buttons">' + footerButtons + '</div>';

      if (!options.noX) {
        var xBtn = buildXButton(options.moveX);
        dialog.querySelector(".dp-lite-header").prepend(xBtn);
      }

      var headerEl = dialog.querySelector(".dp-lite-header");
      var modalH = dialog.querySelector(".dp-lite-body h2.modal-header");
      if (modalH) { modalH.remove(); headerEl.appendChild(modalH); }

      var modalUi = dialog.querySelectorAll(".dp-lite-body .modal-header-ui");
      for (var n = 0; n < modalUi.length; n++) {
        var el = modalUi[n];
        el.remove();
        headerEl.insertBefore(el, headerEl.firstChild);
      }
    }

    document.body.appendChild(dialog);

    dialog.addEventListener("close", onDialogClose);

    var okBtn = dialog.querySelector(".dp-lite-ok");
    var cancelBtn = dialog.querySelector(".dp-lite-cancel");

    if (okBtn) {
      okBtn.onclick = function () {
        if (type === "prompt") {
          var input = dialog.querySelector(".dp-lite-input");
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
      var input = dialog.querySelector(".dp-lite-input");
      if (input) {
        input.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            if (okBtn) okBtn.click();
          }
        });
      }
    }

    var doAutoFocus = options.autoFocus !== false;
    setTimeout(function () {
      if (!doAutoFocus) {
        if (document.activeElement && dialog.contains(document.activeElement)) {
          document.activeElement.blur();
        }
        return;
      }
      if (type === "prompt") {
        var inp = dialog.querySelector(".dp-lite-input");
        if (inp) { inp.focus(); inp.select(); return; }
      }
      if (okBtn) okBtn.focus();
    }, 0);

    dialog.showModal();
    document.body.classList.add("dp-dialog-open");
  }

  function pushStack() {
    if (currentDialog) {
      dialogStack.push({
        dialog: currentDialog,
        resolve: currentResolve,
        type: currentType
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
