/**
 * Modiv's Education - Dedicated Activity Notification System
 * Handles general activity notifications (Messages alert, Lead unlocks,
 * Lead applications, Postings, Admin offers, Announcements, Coins & Membership).
 *
 * Keeps Chat Messages and Activity Notifications strictly separate.
 * Does NOT display chat message text in notifications.
 * Uses conversation-level deduplication: 1 alert per conversation with unread counter.
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ModivsNotifications = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  var CHANNEL = 'modivs_notif_channel';
  var bus = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bus = new BroadcastChannel(CHANNEL);
      bus.onmessage = function() { emitChange(); };
    }
  } catch (e) {}

  var subscribers = [];
  var firestoreUnsubs = {};
  var memoryStore = {}; // email -> array of notification objects

  function cleanEmail(em) {
    return String(em || '').trim().toLowerCase();
  }

  function getDb() {
    if (typeof window !== 'undefined') {
      if (window.EducationBFirebase && window.EducationBFirebase.db) return window.EducationBFirebase.db;
      if (window.firebase && firebase.apps && firebase.apps.length && typeof firebase.firestore === 'function') {
        return firebase.firestore();
      }
    }
    if (typeof globalThis !== 'undefined' && globalThis.EducationBFirebase && globalThis.EducationBFirebase.db) {
      return globalThis.EducationBFirebase.db;
    }
    return null;
  }

  function getAuth() {
    if (typeof window !== 'undefined') {
      if (window.EducationBFirebase && window.EducationBFirebase.auth) return window.EducationBFirebase.auth;
      if (window.firebase && firebase.apps && firebase.apps.length && typeof firebase.auth === 'function') {
        return firebase.auth();
      }
    }
    return null;
  }

  function currentUserEmail() {
    try {
      if (typeof window !== 'undefined') {
        var u = JSON.parse(localStorage.getItem('modivs_auth_user') || 'null');
        if (u && u.email) return cleanEmail(u.email);
        var fbUser = getAuth() && getAuth().currentUser;
        if (fbUser && fbUser.email) return cleanEmail(fbUser.email);
      }
    } catch (e) {}
    return '';
  }

  function storageKey(em) {
    return 'modivs_notifications_' + cleanEmail(em);
  }

  function getLocalNotifications(em) {
    var email = cleanEmail(em) || currentUserEmail();
    if (!email) return [];
    if (memoryStore[email]) return memoryStore[email];

    var list = [];
    try {
      if (typeof localStorage !== 'undefined') {
        list = JSON.parse(localStorage.getItem(storageKey(email)) || '[]');
      }
    } catch (e) {}
    if (!Array.isArray(list)) list = [];
    memoryStore[email] = list;
    return list;
  }

  function saveLocalNotifications(em, list) {
    var email = cleanEmail(em) || currentUserEmail();
    if (!email) return;
    memoryStore[email] = list;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(storageKey(email), JSON.stringify(list));
      }
    } catch (e) {}
  }

  function emitChange() {
    subscribers.slice().forEach(function(fn) {
      try { fn(); } catch (err) { console.error(err); }
    });
    if (bus) {
      try { bus.postMessage({ type: 'change', at: Date.now() }); } catch (e) {}
    }
    if (typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('modivs-notifications-change')); } catch (e) {}
    }
  }

  function subscribe(fn) {
    if (typeof fn === 'function' && subscribers.indexOf(fn) === -1) {
      subscribers.push(fn);
    }
    return function unsubscribe() {
      var i = subscribers.indexOf(fn);
      if (i > -1) subscribers.splice(i, 1);
    };
  }

  function unreadTotal(userEmail) {
    var em = cleanEmail(userEmail) || currentUserEmail();
    if (!em) return 0;
    var list = getLocalNotifications(em);
    return list.reduce(function(total, item) {
      return total + (item && item.read === false ? 1 : 0);
    }, 0);
  }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      var now = new Date();
      var diffMs = now.getTime() - d.getTime();
      var diffSec = Math.floor(diffMs / 1000);
      var diffMin = Math.floor(diffSec / 60);
      var diffHr = Math.floor(diffMin / 60);
      var diffDays = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return diffMin + 'm ago';
      if (diffHr < 24 && now.getDate() === d.getDate()) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (diffDays === 1) return 'Yesterday, ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /**
   * Conversation-Level Notification Strategy for Chat Messages:
   * - Create an alert when a conversation receives its first unread message.
   * - If more messages arrive while unread, increment unreadCount on the SAME notification record.
   * - Never display actual message contents in general notifications.
   * - Once opened and marked read, any future message creates/resets a new alert.
   */
  function createOrUpdateMessageNotification(data) {
    var convId = String(data.convId || '').trim();
    var recipientEmail = cleanEmail(data.recipientEmail);
    var recipientRole = String(data.recipientRole || '').toLowerCase();
    var senderEmail = cleanEmail(data.senderEmail);
    var senderName = String(data.senderName || 'User').trim();

    if (!convId || !recipientEmail) return Promise.resolve(null);

    var isRecipientTutor = recipientRole === 'tutor' || (data.isTutor !== undefined ? !data.isTutor : false);
    var notifTitle = 'New Message';
    var notifDesc = isRecipientTutor
      ? 'This student sent you a message.'
      : 'This tutor sent you a message.';

    var safeEmail = recipientEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    var safeConv = convId.replace(/[^a-zA-Z0-9_-]/g, '_');
    var notifId = 'notif_msg_' + safeEmail + '_' + safeConv;

    var nowIso = new Date().toISOString();
    var firestore = getDb();

    // 1. Update local cache immediately
    var localList = getLocalNotifications(recipientEmail);
    var existingIndex = localList.findIndex(function(n) { return n.id === notifId; });
    var existing = existingIndex > -1 ? localList[existingIndex] : null;

    var nextCount = 1;
    var isNewAlert = true;
    if (existing && existing.read === false) {
      nextCount = (Number(existing.unreadCount) || 1) + 1;
      isNewAlert = false;
    }

    var updatedDoc = {
      id: notifId,
      recipientEmail: recipientEmail,
      recipientRole: recipientRole || (isRecipientTutor ? 'tutor' : 'student'),
      type: 'message',
      title: notifTitle,
      description: notifDesc,
      conversationId: convId,
      targetTab: 'chat',
      unreadCount: nextCount,
      read: false,
      readAt: null,
      senderEmail: senderEmail,
      senderName: senderName,
      createdAt: isNewAlert ? nowIso : (existing && existing.createdAt ? existing.createdAt : nowIso),
      updatedAt: nowIso
    };

    if (existingIndex > -1) {
      localList[existingIndex] = updatedDoc;
    } else {
      localList.unshift(updatedDoc);
    }
    saveLocalNotifications(recipientEmail, localList);
    emitChange();

    if (!firestore) return Promise.resolve(updatedDoc);

    // 2. Persist to Firestore atomically
    var notifRef = firestore.collection('notifications').doc(notifId);
    return firestore.runTransaction(function(tx) {
      return tx.get(notifRef).then(function(docSnap) {
        var serverData = docSnap.exists ? docSnap.data() : null;
        var curUnread = 0;
        var isCurRead = true;
        if (serverData) {
          isCurRead = serverData.read === true;
          curUnread = Number(serverData.unreadCount) || 0;
        }
        var count = isCurRead ? 1 : (curUnread + 1);
        var payload = {
          id: notifId,
          recipientEmail: recipientEmail,
          recipientRole: recipientRole || (isRecipientTutor ? 'tutor' : 'student'),
          type: 'message',
          title: notifTitle,
          description: notifDesc,
          conversationId: convId,
          targetTab: 'chat',
          unreadCount: count,
          read: false,
          readAt: null,
          senderEmail: senderEmail,
          senderName: senderName,
          updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso
        };
        if (isCurRead || !docSnap.exists) {
          payload.createdAt = (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso;
        }
        tx.set(notifRef, payload, { merge: true });
        return payload;
      });
    }).catch(function(err) {
      console.warn('Message notification transaction notice, falling back to direct set:', err && err.message);
      return notifRef.set(updatedDoc, { merge: true }).then(function() { return updatedDoc; }).catch(function() {});
    });
  }

  /**
   * Resets the message alert for a conversation when the conversation is opened and read.
   */
  function markConversationNotificationRead(convId, userEmail) {
    var em = cleanEmail(userEmail) || currentUserEmail();
    var cid = String(convId || '').trim();
    if (!em || !cid) return Promise.resolve();

    var safeEmail = em.replace(/[^a-zA-Z0-9_-]/g, '_');
    var safeConv = cid.replace(/[^a-zA-Z0-9_-]/g, '_');
    var notifId = 'notif_msg_' + safeEmail + '_' + safeConv;

    var nowIso = new Date().toISOString();

    // 1. Update local cache immediately
    var localList = getLocalNotifications(em);
    var changed = false;
    localList.forEach(function(n) {
      if (n.id === notifId || (n.type === 'message' && n.conversationId === cid)) {
        if (!n.read || n.unreadCount > 0) {
          n.read = true;
          n.unreadCount = 0;
          n.readAt = nowIso;
          changed = true;
        }
      }
    });
    if (changed) {
      saveLocalNotifications(em, localList);
      emitChange();
    }

    var firestore = getDb();
    if (!firestore) return Promise.resolve();

    var ref = firestore.collection('notifications').doc(notifId);
    return ref.set({
      read: true,
      unreadCount: 0,
      readAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso,
      updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso
    }, { merge: true }).catch(function() {});
  }

  /**
   * General Activity Notification Creator:
   * Handles:
   * - Tutor unlocked a student's lead (type: 'lead_unlock')
   * - Tutor applied to a student's requirement (type: 'lead_applied')
   * - Student posted a new requirement (type: 'lead_new')
   * - Admin sent a special offer (type: 'admin_offer')
   * - Admin announcements (type: 'announcement')
   * - Membership & coin updates (type: 'membership_update' | 'coin_update')
   */
  function createNotification(data) {
    var recipientEmail = cleanEmail(data.recipientEmail);
    if (!recipientEmail) return Promise.resolve(null);

    var nowIso = new Date().toISOString();
    var notifId = data.id || ('notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8));

    var doc = {
      id: notifId,
      recipientEmail: recipientEmail,
      recipientRole: data.recipientRole || '',
      type: data.type || 'activity',
      title: String(data.title || 'Notification').trim(),
      description: String(data.description || '').trim(),
      leadId: data.leadId || '',
      conversationId: data.conversationId || '',
      actionUrl: data.actionUrl || '',
      targetTab: data.targetTab || '',
      read: false,
      readAt: null,
      senderEmail: cleanEmail(data.senderEmail),
      senderName: data.senderName || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    var localList = getLocalNotifications(recipientEmail);
    localList.unshift(doc);
    saveLocalNotifications(recipientEmail, localList);
    emitChange();

    var firestore = getDb();
    if (!firestore) return Promise.resolve(doc);

    var ref = firestore.collection('notifications').doc(notifId);
    var payload = Object.assign({}, doc, {
      createdAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso,
      updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso
    });
    return ref.set(payload, { merge: true }).then(function() { return doc; });
  }

  /**
   * Mark an individual notification as read.
   */
  function markAsRead(notifId, userEmail) {
    var em = cleanEmail(userEmail) || currentUserEmail();
    if (!em || !notifId) return Promise.resolve();

    var nowIso = new Date().toISOString();
    var localList = getLocalNotifications(em);
    var target = localList.find(function(n) { return n.id === notifId; });
    if (target && !target.read) {
      target.read = true;
      target.readAt = nowIso;
      target.unreadCount = 0;
      saveLocalNotifications(em, localList);
      emitChange();
    }

    var firestore = getDb();
    if (!firestore) return Promise.resolve();

    var ref = firestore.collection('notifications').doc(notifId);
    return ref.set({
      read: true,
      unreadCount: 0,
      readAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso,
      updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso
    }, { merge: true }).catch(function() {});
  }

  /**
   * Mark all notifications for user as read.
   */
  function markAllAsRead(userEmail) {
    var em = cleanEmail(userEmail) || currentUserEmail();
    if (!em) return Promise.resolve();

    var nowIso = new Date().toISOString();
    var localList = getLocalNotifications(em);
    var unreadList = [];
    localList.forEach(function(n) {
      if (!n.read) {
        n.read = true;
        n.readAt = nowIso;
        n.unreadCount = 0;
        unreadList.push(n.id);
      }
    });

    if (unreadList.length) {
      saveLocalNotifications(em, localList);
      emitChange();
    }

    var firestore = getDb();
    if (!firestore || !unreadList.length) return Promise.resolve();

    var batch = firestore.batch();
    unreadList.slice(0, 450).forEach(function(nid) {
      var ref = firestore.collection('notifications').doc(nid);
      batch.set(ref, {
        read: true,
        unreadCount: 0,
        readAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso,
        updatedAt: (typeof firebase !== 'undefined' && firebase.firestore) ? firebase.firestore.FieldValue.serverTimestamp() : nowIso
      }, { merge: true });
    });
    return batch.commit().catch(function() {});
  }

  /**
   * Real-Time Firestore Listener for User's Notifications
   */
  function listenForNotifications(userEmail, onChange) {
    var em = cleanEmail(userEmail) || currentUserEmail();
    var firestore = getDb();
    if (!firestore || !em) return function() {};

    if (firestoreUnsubs[em]) {
      try { firestoreUnsubs[em](); } catch (e) {}
      delete firestoreUnsubs[em];
    }

    try {
      var query = firestore.collection('notifications').where('recipientEmail', '==', em);
      firestoreUnsubs[em] = query.onSnapshot(function(snap) {
        if (!snap) return;
        var localList = getLocalNotifications(em);
        var byId = {};
        localList.forEach(function(n) { byId[n.id] = n; });
        var changed = false;

        snap.docs.forEach(function(dSnap) {
          var d = dSnap.data() || {};
          var id = dSnap.id;
          var cur = byId[id];

          var readVal = d.read === true;
          var readAtVal = d.readAt && d.readAt.toDate ? d.readAt.toDate().toISOString() : (d.readAt || null);
          var createdAtVal = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : (d.createdAt || new Date().toISOString());
          var updatedAtVal = d.updatedAt && d.updatedAt.toDate ? d.updatedAt.toDate().toISOString() : (d.updatedAt || new Date().toISOString());

          if (!cur) {
            var newNotif = {
              id: id,
              recipientEmail: d.recipientEmail || em,
              recipientRole: d.recipientRole || '',
              type: d.type || 'activity',
              title: d.title || 'Notification',
              description: d.description || '',
              leadId: d.leadId || '',
              conversationId: d.conversationId || '',
              actionUrl: d.actionUrl || '',
              targetTab: d.targetTab || '',
              unreadCount: Number(d.unreadCount) || 0,
              read: readVal,
              readAt: readAtVal,
              senderEmail: d.senderEmail || '',
              senderName: d.senderName || '',
              createdAt: createdAtVal,
              updatedAt: updatedAtVal
            };
            localList.unshift(newNotif);
            byId[id] = newNotif;
            changed = true;
          } else {
            if (cur.read !== readVal) { cur.read = readVal; changed = true; }
            if (d.unreadCount !== undefined && cur.unreadCount !== Number(d.unreadCount)) { cur.unreadCount = Number(d.unreadCount); changed = true; }
            if (d.description && cur.description !== d.description) { cur.description = d.description; changed = true; }
            if (d.title && cur.title !== d.title) { cur.title = d.title; changed = true; }
            if (readAtVal && cur.readAt !== readAtVal) { cur.readAt = readAtVal; changed = true; }
          }
        });

        // Sort by updatedAt / createdAt descending
        localList.sort(function(a, b) {
          var ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
          var tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return tb - ta;
        });

        if (changed) {
          saveLocalNotifications(em, localList);
          emitChange();
          if (onChange) onChange();
        }
      }, function(err) {
        console.warn('Notifications real-time listener notice:', err && err.message);
      });
    } catch (err) {
      console.warn('Failed to attach notifications listener:', err);
    }

    return function() {
      if (firestoreUnsubs[em]) {
        try { firestoreUnsubs[em](); } catch (e) {}
        delete firestoreUnsubs[em];
      }
    };
  }

  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById('modivsNotificationStyles')) return;
    var s = document.createElement('style');
    s.id = 'modivsNotificationStyles';
    s.textContent =
      '.mn-center{display:flex;flex-direction:column;gap:12px;width:100%}' +
      '.mn-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#fff;border:1.5px solid #eadfc9;border-radius:12px;margin-bottom:8px;flex-wrap:wrap;gap:8px}' +
      '.mn-filters{display:flex;gap:6px}' +
      '.mn-chip{border:1.5px solid #dfe5ee;border-radius:99px;background:#f9f9fb;padding:5px 12px;font-size:0.8rem;font-weight:700;color:#1A2035;cursor:pointer;transition:all .15s}' +
      '.mn-chip.active{background:#1A2035;color:#EBB92E;border-color:#1A2035}' +
      '.mn-markall{background:none;border:0;color:#1d4ed8;font-size:0.82rem;font-weight:700;cursor:pointer;padding:4px 8px;border-radius:6px}' +
      '.mn-markall:hover{text-decoration:underline;background:#eef4ff}' +
      '.mn-list{display:flex;flex-direction:column;gap:10px}' +
      '.mn-card{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-radius:12px;background:#fff;border:1.5px solid #eadfc9;transition:all .15s;cursor:pointer;position:relative}' +
      '.mn-card:hover{border-color:#1A2035;transform:translateY(-1px);box-shadow:0 4px 12px rgba(26,32,53,0.06)}' +
      '.mn-card.unread{background:#fffbf2;border-left:4px solid #EBB92E}' +
      '.mn-icon-box{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-size:1.15rem;flex-shrink:0;background:#FEF7EA;color:#1A2035;border:1px solid #ebd9b8}' +
      '.mn-icon-box.type-message{background:#e8f4fd;color:#0e7c66;border-color:#b8e2d8}' +
      '.mn-icon-box.type-unlock{background:#fff3cd;color:#856404;border-color:#ffeeba}' +
      '.mn-icon-box.type-applied{background:#dcfce7;color:#15803d;border-color:#bbf7d0}' +
      '.mn-icon-box.type-offer{background:#fef3c7;color:#b45309;border-color:#fde68a}' +
      '.mn-icon-box.type-announcement{background:#ede9fe;color:#6d28d9;border-color:#ddd6fe}' +
      '.mn-icon-box.type-coins{background:#fef9c3;color:#854d0e;border-color:#fef08a}' +
      '.mn-content{flex:1;min-width:0}' +
      '.mn-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}' +
      '.mn-title{font-weight:800;font-size:0.92rem;color:#1A2035}' +
      '.mn-time{font-size:0.75rem;color:#64748b;white-space:nowrap}' +
      '.mn-desc{font-size:0.86rem;color:#334155;line-height:1.45;word-break:break-word;margin:0 0 6px 0}' +
      '.mn-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap}' +
      '.mn-badge{font-size:0.7rem;font-weight:700;padding:2px 7px;border-radius:6px;background:#e2e8f0;color:#334155}' +
      '.mn-badge.unread-count{background:#EBB92E;color:#1A2035;font-weight:800}' +
      '.mn-action-hint{font-size:0.75rem;font-weight:700;color:#1d4ed8;margin-left:auto;display:inline-flex;align-items:center;gap:3px}' +
      '.mn-dot{width:8px;height:8px;border-radius:50%;background:#e5484d;display:inline-block;flex-shrink:0}' +
      '.mn-empty{padding:48px 20px;text-align:center;color:#64748b;background:#fff;border-radius:12px;border:1.5px solid #eadfc9}';
    document.head.appendChild(s);
  }

  var TYPE_ICONS = {
    message: '💬',
    lead_unlock: '🔓',
    lead_applied: '💼',
    lead_new: '📋',
    admin_offer: '🎁',
    announcement: '📢',
    coin_update: '🪙',
    membership_update: '👑',
    activity: '🔔'
  };

  /**
   * Renders the complete Notification Centre into container.
   * Options:
   * - onOpenChat(conversationId)
   * - onOpenLead(leadId)
   * - onOpenCredits()
   * - onOpenMembership()
   * - onOpenTab(tabName)
   */
  function renderNotificationCenter(container, options) {
    if (!container) return;
    ensureStyles();
    options = options || {};

    var em = cleanEmail(options.email) || currentUserEmail();
    var all = getLocalNotifications(em);
    var filter = options.filter || 'all'; // 'all' | 'unread'

    function renderView() {
      var list = getLocalNotifications(em);
      var displayed = filter === 'unread'
        ? list.filter(function(n) { return !n.read; })
        : list;

      var unreadCount = list.filter(function(n) { return !n.read; }).length;

      var headerHtml =
        '<div class="mn-header">' +
        '<div class="mn-filters">' +
        '<button type="button" class="mn-chip ' + (filter === 'all' ? 'active' : '') + '" data-filter="all">All (' + list.length + ')</button>' +
        '<button type="button" class="mn-chip ' + (filter === 'unread' ? 'active' : '') + '" data-filter="unread">Unread (' + unreadCount + ')</button>' +
        '</div>' +
        (unreadCount > 0 ? '<button type="button" class="mn-markall" id="mnMarkAllBtn">✓ Mark all as read</button>' : '') +
        '</div>';

      var listHtml = '';
      if (!displayed.length) {
        listHtml =
          '<div class="mn-empty">' +
          '<div style="font-size:2rem;margin-bottom:8px;">🔔</div>' +
          '<b>No notifications ' + (filter === 'unread' ? 'marked unread' : 'yet') + '</b>' +
          '<p style="font-size:0.85rem;color:#7180ad;margin-top:4px;">When you receive messages, lead unlocks, applications or offers, alerts will show here.</p>' +
          '</div>';
      } else {
        listHtml = '<div class="mn-list">' + displayed.map(function(n) {
          var icon = TYPE_ICONS[n.type] || '🔔';
          var typeClass = 'type-' + (n.type === 'message' ? 'message' : (n.type === 'lead_unlock' ? 'unlock' : (n.type === 'lead_applied' ? 'applied' : (n.type === 'admin_offer' ? 'offer' : (n.type === 'announcement' ? 'announcement' : 'coins')))));
          var hintText = n.type === 'message' ? 'Open Chat &rarr;' : (n.type.indexOf('lead') > -1 ? 'View Lead &rarr;' : (n.actionUrl ? 'Open Link &rarr;' : ''));

          return '<div class="mn-card ' + (!n.read ? 'unread' : '') + '" data-notif-id="' + escapeHtml(n.id) + '">' +
            '<div class="mn-icon-box ' + typeClass + '" aria-hidden="true">' + icon + '</div>' +
            '<div class="mn-content">' +
            '<div class="mn-title-row">' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
            (!n.read ? '<span class="mn-dot" title="Unread alert"></span>' : '') +
            '<b class="mn-title">' + escapeHtml(n.title) + '</b>' +
            (n.unreadCount && n.unreadCount > 1 ? '<span class="mn-badge unread-count">' + n.unreadCount + ' unread</span>' : '') +
            '</div>' +
            '<span class="mn-time">' + escapeHtml(formatTime(n.updatedAt || n.createdAt)) + '</span>' +
            '</div>' +
            '<p class="mn-desc">' + escapeHtml(n.description) + '</p>' +
            '<div class="mn-meta">' +
            '<span class="mn-badge">' + escapeHtml(n.type.replace(/_/g, ' ').toUpperCase()) + '</span>' +
            (hintText ? '<span class="mn-action-hint">' + hintText + '</span>' : '') +
            '</div>' +
            '</div>' +
            '</div>';
        }).join('') + '</div>';
      }

      container.innerHTML = '<div class="mn-center">' + headerHtml + listHtml + '</div>';

      // Event handlers
      var markAllBtn = container.querySelector('#mnMarkAllBtn');
      if (markAllBtn) {
        markAllBtn.onclick = function() {
          markAllAsRead(em).then(renderView);
        };
      }

      Array.prototype.forEach.call(container.querySelectorAll('[data-filter]'), function(btn) {
        btn.onclick = function() {
          filter = btn.getAttribute('data-filter');
          renderView();
        };
      });

      Array.prototype.forEach.call(container.querySelectorAll('[data-notif-id]'), function(card) {
        card.onclick = function() {
          var nid = card.getAttribute('data-notif-id');
          var item = (getLocalNotifications(em) || []).find(function(x) { return x.id === nid; });
          if (!item) return;

          // Always mark as read on click
          markAsRead(item.id, em);
          renderView();

          // Action dispatch
          if (item.type === 'message') {
            if (options.onOpenChat) {
              options.onOpenChat(item.conversationId);
            } else if (typeof window !== 'undefined' && window.ModivsChat && window.ModivsChat.openById) {
              window.ModivsChat.openById(item.conversationId);
            }
          } else if (item.type === 'lead_unlock' || item.type === 'lead_applied' || item.type === 'lead_new') {
            if (options.onOpenLead) {
              options.onOpenLead(item.leadId);
            } else if (options.onOpenTab) {
              options.onOpenTab('leads');
            }
          } else if (item.type === 'coin_update') {
            if (options.onOpenCredits) options.onOpenCredits();
            else if (options.onOpenTab) options.onOpenTab('credits');
          } else if (item.type === 'membership_update') {
            if (options.onOpenMembership) options.onOpenMembership();
            else if (options.onOpenTab) options.onOpenTab('buymem');
          } else if (item.type === 'admin_offer' || item.type === 'announcement') {
            if (item.actionUrl) {
              if (item.actionUrl.startsWith('#') && options.onOpenTab) {
                options.onOpenTab(item.actionUrl.slice(1));
              } else if (typeof window !== 'undefined') {
                window.location.href = item.actionUrl;
              }
            } else if (item.targetTab && options.onOpenTab) {
              options.onOpenTab(item.targetTab);
            }
          }
        };
      });
    }

    renderView();
    var unsub = subscribe(renderView);
    return unsub;
  }

  // Auto-init listener for logged-in user if browser environment
  if (typeof window !== 'undefined') {
    var activeListenerUnsub = null;
    function syncUserListener() {
      var em = currentUserEmail();
      if (!em) return;
      if (activeListenerUnsub) activeListenerUnsub();
      activeListenerUnsub = listenForNotifications(em);
    }
    setTimeout(syncUserListener, 300);
  }

  return {
    notifications: getLocalNotifications,
    getLocalNotifications: getLocalNotifications,
    unreadTotal: unreadTotal,
    subscribe: subscribe,
    formatTime: formatTime,
    createOrUpdateMessageNotification: createOrUpdateMessageNotification,
    markConversationNotificationRead: markConversationNotificationRead,
    createNotification: createNotification,
    markAsRead: markAsRead,
    markAllAsRead: markAllAsRead,
    listenForNotifications: listenForNotifications,
    renderNotificationCenter: renderNotificationCenter
  };
});
