/**
 * Modiv's Education - Backend API Client (modivs-api.js)
 * Replaces direct Firebase client SDK with authenticated HTTPS API calls to Vercel Serverless Backend.
 * Session state is managed via secure HttpOnly cookies.
 */
(function(window){
  'use strict';

  async function apiFetch(endpoint, options) {
    options = options || {};
    options.credentials = 'include'; // Automatically send/receive HttpOnly session cookie
    options.headers = options.headers || {};
    if (!options.headers['Content-Type'] && options.body && typeof options.body === 'string') {
      options.headers['Content-Type'] = 'application/json';
    }
    options.headers['X-Requested-With'] = 'XMLHttpRequest';
    if (!options.headers['Authorization']) {
      try {
        var ra = getRealAuth();
        if (ra && !ra.currentUser && typeof ra.onAuthStateChanged === 'function') {
          await new Promise(function(resolve) {
            var done = false, unsub = null;
            var t = setTimeout(function() { if (!done) { done = true; if (unsub) try { unsub(); } catch(e){} resolve(); } }, 2500);
            unsub = ra.onAuthStateChanged(function() {
              if (!done) { done = true; clearTimeout(t); if (unsub) try { unsub(); } catch(e){} resolve(); }
            });
          });
        }
        if (ra && ra.currentUser && typeof ra.currentUser.getIdToken === 'function') {
          var tok = await ra.currentUser.getIdToken().catch(() => '');
          if (tok) options.headers['Authorization'] = 'Bearer ' + tok;
        }
      } catch (e) {}
    }

    try {
      const response = await fetch(endpoint, options);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`API [${endpoint}] error:`, err.message);
      throw err;
    }
  }

  const ModivsAPI = {
    auth: {
      async me() {
        return apiFetch('/api/auth?action=me');
      },
      async login(email, password) {
        const res = await apiFetch('/api/auth?action=login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        if (res.user) {
          try {
            localStorage.setItem('modivs_auth_user', JSON.stringify(res.user));
            if (res.user.isAdmin) {
              localStorage.setItem('modivs_admin_session', JSON.stringify({ email: res.user.email, isAdmin: true }));
            }
          } catch (e) {}
        }
        return res;
      },
      async register(data) {
        return apiFetch('/api/auth?action=register', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      },
      async logout(redirectUrl) {
        try {
          await apiFetch('/api/auth?action=logout', { method: 'POST' });
        } catch (e) {}
        try {
          var fb = window.EducationBFirebase;
          if (fb && fb.auth && typeof fb.auth.signOut === 'function') {
            await fb.auth.signOut().catch(function(){});
          }
        } catch (e) {}
        try {
          localStorage.removeItem('modivs_auth_user');
          localStorage.removeItem('modivs_admin_session');
          sessionStorage.clear();
        } catch (e) {}
        window.location.replace(redirectUrl || '/login');
      },
      async session(idToken) {
        return apiFetch('/api/auth?action=session', {
          method: 'POST',
          body: JSON.stringify({ idToken })
        });
      }
    },
    tutors: {
      async list(params) {
        const q = new URLSearchParams(params || {}).toString();
        return apiFetch(`/api/tutors${q ? '?' + q : ''}`);
      },
      async get(idOrSlug) {
        return apiFetch(`/api/tutors?slug=${encodeURIComponent(idOrSlug)}`);
      },
      async update(data) {
        return apiFetch('/api/tutors', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      }
    },
    leads: {
      async list() {
        return apiFetch('/api/leads');
      },
      async create(data) {
        return apiFetch('/api/leads', {
          method: 'POST',
          body: JSON.stringify(data)
        });
      },
      async unlock(leadId, cost, leadName) {
        return apiFetch('/api/leads?action=unlock', {
          method: 'POST',
          body: JSON.stringify({ leadId, cost, leadName })
        });
      }
    },
    chat: {
      async getConversations() {
        return apiFetch('/api/chat?action=conversations');
      },
      async getMessages(convId) {
        return apiFetch(`/api/chat?action=messages&convId=${encodeURIComponent(convId)}`);
      },
      async send(convId, text, recipientEmail) {
        return apiFetch('/api/chat?action=send', {
          method: 'POST',
          body: JSON.stringify({ convId, text, recipientEmail })
        });
      },
      async markRead(convId) {
        return apiFetch('/api/chat?action=read', {
          method: 'POST',
          body: JSON.stringify({ convId })
        });
      }
    },
    notifications: {
      async list() {
        return apiFetch('/api/notifications');
      },
      async markRead(id, all) {
        return apiFetch('/api/notifications', {
          method: 'POST',
          body: JSON.stringify({ id, all })
        });
      },
      async send(payload) {
        return apiFetch('/api/notifications?action=send', {
          method: 'POST',
          body: JSON.stringify(Object.assign({ action: 'send' }, payload || {}))
        });
      }
    },
    payments: {
      async getWallet(tutorEmail) {
        const q = tutorEmail ? `&tutorEmail=${encodeURIComponent(tutorEmail)}` : '';
        return apiFetch(`/api/payments?action=wallet${q}`);
      },
      async createOrder(amountPaise, notes) {
        return apiFetch('/api/payments?action=create-order', {
          method: 'POST',
          body: JSON.stringify({ amount: amountPaise, notes })
        });
      },
      async verify(orderId, paymentId, signature) {
        return apiFetch('/api/payments?action=verify', {
          method: 'POST',
          body: JSON.stringify({ orderId, paymentId, signature })
        });
      },
      async creditCoins(payload) {
        return apiFetch('/api/payments?action=credit-coins', {
          method: 'POST',
          body: JSON.stringify(payload || {})
        });
      },
      async activateMembership(payload) {
        return apiFetch('/api/payments?action=activate-membership', {
          method: 'POST',
          body: JSON.stringify(payload || {})
        });
      },
      async adminCoins(payload) {
        return apiFetch('/api/payments?action=admin-coins', {
          method: 'POST',
          body: JSON.stringify(payload || {})
        });
      }
    }
  };

  // Provide seamless compatibility bridge for existing code expecting EducationBFirebase
  window.ModivsAPI = ModivsAPI;
  var realAuth = null;

  function getRealAuth() {
    if (realAuth && typeof realAuth.signInWithPopup === 'function') return realAuth;
    if (typeof window !== 'undefined' && window.firebase && typeof window.firebase.auth === 'function') {
      try {
        if (window.firebase.apps && window.firebase.apps.length) return window.firebase.auth();
      } catch (e) {}
    }
    return null;
  }

  var existing = window.EducationBFirebase || {};
  if (existing.auth && typeof existing.auth.signInWithPopup === 'function') {
    realAuth = existing.auth;
  }

  window.EducationBFirebase = Object.assign({}, existing, {
    get auth() {
      var activeAuth = getRealAuth();
      if (activeAuth) return activeAuth;
      return {
        get currentUser() {
          var ra = getRealAuth();
          if (ra && ra.currentUser) return ra.currentUser;
          var u = null; try { u = JSON.parse(localStorage.getItem('modivs_auth_user') || 'null'); } catch(e){}
          return u;
        },
        signOut: () => ModivsAPI.auth.logout(),
        onAuthStateChanged: function(callback) {
          var cancelled = false;
          var checkTimer = setInterval(function() {
            var ra = getRealAuth();
            if (ra && typeof ra.onAuthStateChanged === 'function') {
              clearInterval(checkTimer);
              if (!cancelled) ra.onAuthStateChanged(callback);
            }
          }, 100);
          setTimeout(function() { clearInterval(checkTimer); }, 4000);

          ModivsAPI.auth.me().then(function(res) {
            return (res && res.authenticated && res.user) ? res.user : null;
          }, function() { return null; }).then(function(u) {
            if (cancelled) return;
            if (u) {
              var claims = { admin: u.isAdmin === true };
              u = Object.assign({}, u, {
                getIdTokenResult: function() { return Promise.resolve({ claims: claims, token: '' }); }
              });
              callback(u);
            } else {
              var localUser = null;
              try { localUser = JSON.parse(localStorage.getItem('modivs_auth_user') || 'null'); } catch(e){}
              var localAdmin = null;
              try { localAdmin = JSON.parse(localStorage.getItem('modivs_admin_session') || 'null'); } catch(e){}
              var activeUser = localUser || (localAdmin && localAdmin.isAdmin ? { email: localAdmin.email, role: 'Admin', isAdmin: true } : null);
              if (activeUser) {
                var claims = { admin: activeUser.role === 'Admin' || activeUser.isAdmin === true };
                var shim = Object.assign({}, activeUser, {
                  getIdTokenResult: function() { return Promise.resolve({ claims: claims, token: '' }); }
                });
                callback(shim);
              } else {
                callback(null);
              }
            }
          });
          return function() { cancelled = true; clearInterval(checkTimer); };
        }
      };
    },
    get db() {
      if (typeof window !== 'undefined' && window.firebase && typeof window.firebase.firestore === 'function') {
        try {
          if (window.firebase.apps && window.firebase.apps.length) return window.firebase.firestore();
        } catch (e) {}
      }
      return existing.db || null;
    },
    set auth(val) {
      realAuth = val;
    }
  });

})(typeof window !== 'undefined' ? window : globalThis);
