/**
 * Modiv's Education - Safe Production Client Protection
 * DevTools and inspect element are fully unblocked per user request.
 */
(function (window, document) {
  'use strict';
  if (!window || !document) return;

  // DevTools & Inspect: Fully unblocked for user inspection
  var DEVTOOLS_UNBLOCKED = true;

  function isFormField(target) {
    if (!target) return false;
    var tag = (target.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  // 1. Right-Click Context Menu (fully unblocked so user can inspect elements)
  document.addEventListener('contextmenu', function (e) {
    if (DEVTOOLS_UNBLOCKED || isFormField(e.target)) return;
    e.preventDefault();
  }, { capture: true });

  // 2. Developer Key Interception (F12, Ctrl+Shift+I/J/C) (fully unblocked for dev tools)
  document.addEventListener('keydown', function (e) {
    if (DEVTOOLS_UNBLOCKED || isFormField(e.target)) return;

    var key = e.key || '';
    var keyCode = e.keyCode || e.which || 0;
    var isCtrl = e.ctrlKey || e.metaKey;
    var isShift = e.shiftKey;

    // F12
    if (key === 'F12' || keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl + Shift + I/J/C (DevTools shortcuts)
    if (isCtrl && isShift && (key === 'I' || key === 'i' || key === 'J' || key === 'j' || key === 'C' || key === 'c' || keyCode === 73 || keyCode === 74 || keyCode === 67)) {
      e.preventDefault();
      return false;
    }

    // Ctrl + U (View Source)
    if (isCtrl && !isShift && (key === 'U' || key === 'u' || keyCode === 85)) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
