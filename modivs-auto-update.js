/**
 * Modiv's Education - Automatic Version Update & Cache Safety
 * Detects new production deployments, revalidates cache, and prevents reload loops.
 */
(function (window) {
  'use strict';
  if (!window || typeof window.document === 'undefined') return;

  // 1. Service Worker Audit & Cleanup: Safely unregister any legacy or orphaned workers
  if ('serviceWorker' in navigator && typeof navigator.serviceWorker.getRegistrations === 'function') {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      if (registrations && registrations.length) {
        registrations.forEach(function (r) {
          try { r.unregister(); } catch (e) { }
        });
      }
    }).catch(function () { });
  }

  // 2. Deployment Version Check
  var currentVersion = (window.__MODIVS_BUILD__ && window.__MODIVS_BUILD__.version) || '';
  var RELOAD_KEY = 'modivs_last_reload_ver';
  var lastCheckTime = 0;
  var MIN_CHECK_INTERVAL_MS = 2 * 60 * 1000; // Check at most once every 2 minutes

  function isFormActive() {
    try {
      var el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        return true;
      }
      var activeModals = document.querySelectorAll('.modal.is-open, .modal.open, [role="dialog"][aria-hidden="false"]');
      if (activeModals && activeModals.length > 0) return true;
    } catch (e) { }
    return false;
  }

  function checkDeploymentUpdate() {
    var now = Date.now();
    if (now - lastCheckTime < MIN_CHECK_INTERVAL_MS) return;
    lastCheckTime = now;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/version.json?_t=' + now, true);
    xhr.timeout = 6000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        try {
          var serverData = JSON.parse(xhr.responseText);
          if (!serverData || !serverData.version) return;

          // If current version is known and differs from server
          if (currentVersion && serverData.version !== currentVersion) {
            var lastReloaded = '';
            try { lastReloaded = sessionStorage.getItem(RELOAD_KEY) || ''; } catch (e) { }
            if (lastReloaded === serverData.version) return; // Guard against reload loops

            if (isFormActive()) {
              document.addEventListener('blur', function () {
                setTimeout(checkDeploymentUpdate, 1500);
              }, { once: true });
              return;
            }

            try { sessionStorage.setItem(RELOAD_KEY, serverData.version); } catch (e) { }
            window.location.reload();
          } else if (!currentVersion && serverData.version) {
            currentVersion = serverData.version;
          }
        } catch (e) { }
      }
    };
    xhr.send();
  }

  // Check 5 seconds after initial page load
  setTimeout(checkDeploymentUpdate, 5000);

  // Check whenever user switches back to this tab
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      checkDeploymentUpdate();
    }
  });

  window.ModivsAutoUpdate = {
    check: checkDeploymentUpdate,
    getVersion: function () { return currentVersion; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
