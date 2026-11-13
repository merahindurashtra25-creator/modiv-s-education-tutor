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
      async logout() {
        try {
          await apiFetch('/api/auth?action=logout', { method: 'POST' });
        } finally {
          try {
            localStorage.removeItem('modivs_auth_user');
            localStorage.removeItem('modivs_admin_session');
          } catch (e) {}
          location.href = 'modivs-home.html';
        }
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
      }
    },
    payments: {
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
      }
    }
  };

  // Provide seamless compatibility bridge for existing code expecting EducationBFirebase
  window.ModivsAPI = ModivsAPI;
  window.EducationBFirebase = window.EducationBFirebase || {
    isBackendDriven: true,
    auth: {
      currentUser: null,
      signOut: () => ModivsAPI.auth.logout(),
      onAuthStateChanged: function(callback) {
        ModivsAPI.auth.me().then(res => {
          if (res && res.authenticated && res.user) {
            window.EducationBFirebase.auth.currentUser = res.user;
            callback(res.user);
          } else {
            window.EducationBFirebase.auth.currentUser = null;
            callback(null);
          }
        }).catch(() => callback(null));
      }
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);

