/**
 * Modiv's Education - Deprecated Firebase Web Config
 * All Firebase operations have been migrated to the secure backend API (api/*).
 * Direct browser Firebase initialization has been completely removed for security.
 */
(function(window){
  'use strict';
  if (typeof window !== 'undefined' && !window.ModivsAPI) {
    var script = document.createElement('script');
    script.src = 'modivs-api.js';
    document.head.appendChild(script);
  }
})(typeof window !== 'undefined' ? window : globalThis);
