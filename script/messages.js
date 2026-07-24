/**
 * REWEAR DZ — Messagerie (style Messenger)
 */
(function () {
  var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';

  var user = null;
  try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) {}
  if (!user) { window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search); return; }

  var client = window.supabaseClient || (window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY));

  var msgPage      = document.getElementById('msgPage');
  var convItemsEl  = document.getElementById('convItems');
  var convEmptyEl  = document.getElementById('convEmpty');
  var placeholder  = document.getElementById('threadPlaceholder');
  var threadActive = document.getElementById('threadActive');
  var threadMsgsEl = document.getElementById('threadMessages');
  var threadForm   = document.getElementById('threadForm');
  var threadInput  = document.getElementById('threadInput');
  var threadSend   = document.getElementById('threadSend');
  var threadAvatar = document.getElementById('threadAvatar');
  var threadUsername = document.getElementById('threadUsername');
  var threadArticleEl = document.getElementById('threadArticle');
  var threadUserLink  = document.getElementById('threadUserLink');
  var btnBack      = document.getElementById('btnThreadBack');

  var params = new URLSearchParams(window.location.search);
  var deepArticleId = params.get('article');
  var deepWithId    = params.get('with');

  var conversations = {};   // key -> { articleId, otherId, messages: [], lastAt, unread }
  var profilesCache = {};   // id -> { username }
  var articlesCache = {};   // id -> { title, images }
  var activeKey = null;
  var realtimeChannel = null;

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function initials(n) {
    if (!n) return '?';
    var p = n.trim().split(/\s+/).filter(Boolean);
    if (p.length === 0) return '?';
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : p[0][0].toUpperCase();
  }
  function convKey(articleId, otherId) { return (articleId || 'none') + '::' + otherId; }
  function formatTime(d) {
    return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  function formatDay(d) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function sameDay(a, b) {
    var da = new Date(a), db = new Date(b);
    return da.toDateString() === db.toDateString();
  }

  /* ── Charger toutes les conversations ── */
  function loadConversations() {
    return client.from('messages')
      .select('id,article_id,sender_id,receiver_id,content,is_read,created_at')
      .or('sender_id.eq.' + user.id + ',receiver_id.eq.' + user.id)
      .order('created_at', { ascending: true })
      .then(function (r) {
        if (r.error) throw r.error;
        var rows = r.data || [];

        conversations = {};
        var articleIds = [], userIds = [];

        rows.forEach(function (m) {
          var otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          var key = convKey(m.article_id, otherId);
          if (!conversations[key]) {
            conversations[key] = { articleId: m.article_id, otherId: otherId, messages: [], lastAt: null, unread: 0 };
            if (userIds.indexOf(otherId) === -1) userIds.push(otherId);
            if (m.article_id && articleIds.indexOf(m.article_id) === -1) articleIds.push(m.article_id);
          }
          conversations[key].messages.push(m);
          conversations[key].lastAt = m.created_at;
          if (m.receiver_id === user.id && !m.is_read) conversations[key].unread++;
        });

        var fetches = [];
        if (userIds.length)    fetches.push(client.from('profiles').select('id,username,is_banned').in('id', userIds));
        else                   fetches.push(Promise.resolve({ data: [] }));
        if (articleIds.length) fetches.push(client.from('articles').select('id,title,images').in('id', articleIds));
        else                   fetches.push(Promise.resolve({ data: [] }));

        return Promise.all(fetches).then(function (results) {
          (results[0].data || []).forEach(function (p) { profilesCache[p.id] = p; });
          (results[1].data || []).forEach(function (a) { articlesCache[a.id] = a; });
        });
      });
  }

  function renderConvList() {
    var keys = Object.keys(conversations).sort(function (a, b) {
      return new Date(conversations[b].lastAt) - new Date(conversations[a].lastAt);
    });

    if (keys.length === 0) {
      convItemsEl.innerHTML = '';
      convEmptyEl.style.display = 'block';
      return;
    }
    convEmptyEl.style.display = 'none';

    convItemsEl.innerHTML = '';
    keys.forEach(function (key) {
      var c = conversations[key];
      var otherProfile = profilesCache[c.otherId] || {};
      var article = c.articleId ? (articlesCache[c.articleId] || {}) : null;
      var lastMsg = c.messages.length ? c.messages[c.messages.length - 1] : null;
      var name = otherProfile.username || 'Utilisateur';
      var previewText = lastMsg
        ? ((lastMsg.sender_id === user.id ? 'Vous : ' : '') + esc(lastMsg.content))
        : 'Nouvelle conversation';

      var el = document.createElement('div');
      el.className = 'conv-item' + (c.unread > 0 ? ' unread' : '') + (key === activeKey ? ' active' : '');
      el.innerHTML =
        '<div class="conv-avatar">' + esc(initials(name)) + '</div>' +
        '<div class="conv-info">' +
          '<div class="conv-top-row">' +
            '<span class="conv-name">' + esc(name) + '</span>' +
            '<span class="conv-time">' + (lastMsg ? formatTime(lastMsg.created_at) : '') + '</span>' +
          '</div>' +
          (article ? '<div class="conv-article">🛍️ ' + esc(article.title || '') + '</div>' : '') +
          '<div class="conv-preview">' + previewText + '</div>' +
        '</div>' +
        (c.unread > 0 ? '<div class="conv-unread-dot"></div>' : '');

      el.addEventListener('click', function () { openConversation(key); });
      convItemsEl.appendChild(el);
    });
  }

  /* ── Ouvrir une conversation ── */
  function openConversation(key) {
    var c = conversations[key];
    if (!c) return;
    activeKey = key;
    threadInput.value = '';
    msgPage.classList.add('thread-open');

    var otherProfile = profilesCache[c.otherId] || {};
    var article = c.articleId ? (articlesCache[c.articleId] || {}) : null;
    var name = otherProfile.username || 'Utilisateur';

    placeholder.style.display = 'none';
    threadActive.style.display = 'flex';
    threadAvatar.textContent = initials(name);
    threadUsername.textContent = name;
    threadArticleEl.textContent = otherProfile.is_banned
      ? 'Compte suspendu'
      : (article ? ('À propos de : ' + (article.title || '')) : '');
    threadUserLink.href = 'seller.html?id=' + c.otherId;

    threadInput.disabled = !!otherProfile.is_banned;
    threadSend.disabled  = !!otherProfile.is_banned;
    threadInput.placeholder = otherProfile.is_banned ? 'Compte suspendu — envoi impossible' : 'Écrire un message...';

    renderMessages(c);
    renderConvList();
    markConversationRead(c);
  }

  function renderMessages(c) {
    threadMsgsEl.innerHTML = '';
    var lastDate = null;
    c.messages.forEach(function (m) {
      if (!lastDate || !sameDay(lastDate, m.created_at)) {
        var sep = document.createElement('div');
        sep.className = 'msg-day-sep';
        sep.textContent = formatDay(m.created_at);
        threadMsgsEl.appendChild(sep);
      }
      lastDate = m.created_at;

      var isSent = m.sender_id === user.id;
      var bubble = document.createElement('div');
      bubble.className = 'msg-bubble ' + (isSent ? 'sent' : 'received');
      bubble.textContent = m.content;
      threadMsgsEl.appendChild(bubble);

      var time = document.createElement('div');
      time.className = 'msg-time' + (isSent ? ' sent' : '');
      time.textContent = formatTime(m.created_at);
      threadMsgsEl.appendChild(time);
    });
    threadMsgsEl.scrollTop = threadMsgsEl.scrollHeight;
  }

  function markConversationRead(c) {
    var unreadIds = c.messages.filter(function (m) { return m.receiver_id === user.id && !m.is_read; }).map(function (m) { return m.id; });
    if (unreadIds.length === 0) return;
    unreadIds.forEach(function (id) {
      var m = c.messages.find(function (mm) { return mm.id === id; });
      if (m) m.is_read = true;
    });
    c.unread = 0;
    client.from('messages').update({ is_read: true }).in('id', unreadIds).then(function (r) {
      if (r.error) {
        console.error('markConversationRead failed', r.error);
        // Revert l'état optimiste : le message reste marqué non lu côté serveur
        unreadIds.forEach(function (id) {
          var m = c.messages.find(function (mm) { return mm.id === id; });
          if (m) m.is_read = false;
        });
        c.unread = unreadIds.length;
        renderConvList();
      }
    });
  }

  /* ── Envoyer un message ── */
  threadForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = threadInput.value.trim();
    if (!text || !activeKey) return;
    var c = conversations[activeKey];

    var otherProfile = profilesCache[c.otherId];
    if (otherProfile && otherProfile.is_banned) {
      alert('Ce compte a été suspendu, vous ne pouvez plus lui envoyer de message.');
      return;
    }

    threadSend.disabled = true;
    client.from('messages').insert({
      article_id:  c.articleId || null,
      sender_id:   user.id,
      receiver_id: c.otherId,
      content:     text
    }).select().single().then(function (r) {
      threadSend.disabled = false;
      if (r.error) { alert('Erreur : ' + r.error.message); return; }
      threadInput.value = '';
      c.messages.push(r.data);
      c.lastAt = r.data.created_at;
      renderMessages(c);
      renderConvList();
    });
  });

  /* ── Retour à la liste (mobile) ── */
  btnBack.addEventListener('click', function () {
    msgPage.classList.remove('thread-open');
  });

  /* ── Démarrer une conversation depuis un lien externe (?article=&with=) ── */
  function ensureDeepLinkConversation() {
    if (!deepWithId || deepWithId === user.id) return Promise.resolve();
    var key = convKey(deepArticleId, deepWithId);
    if (conversations[key]) return Promise.resolve();

    var fetches = [client.from('profiles').select('id,username,is_banned').eq('id', deepWithId).maybeSingle()];
    if (deepArticleId) fetches.push(client.from('articles').select('id,title,images').eq('id', deepArticleId).maybeSingle());

    return Promise.all(fetches).then(function (results) {
      if (results[0].data) profilesCache[deepWithId] = results[0].data;
      if (deepArticleId && results[1] && results[1].data) articlesCache[deepArticleId] = results[1].data;
      conversations[key] = { articleId: deepArticleId || null, otherId: deepWithId, messages: [], lastAt: new Date().toISOString(), unread: 0 };
    });
  }

  /* ── Temps réel ── */
  function setupRealtime() {
    if (realtimeChannel) client.removeChannel(realtimeChannel);
    return new Promise(function (resolve) {
      realtimeChannel = client.channel('messages-inbox-' + user.id)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages', filter: 'receiver_id=eq.' + user.id
        }, function (payload) {
          handleIncomingMessage(payload.new);
        })
        .subscribe(function (status) {
          if (status === 'SUBSCRIBED') resolve();
        });
      // Filet de sécurité : si l'abonnement n'a pas confirmé après 4s, on continue quand même
      // (la reconciliation par timestamp qui suit couvrira les messages manqués).
      setTimeout(resolve, 4000);
    });
  }

  /* Récupère les messages arrivés pendant la fenêtre entre le chargement initial
     et l'activation effective du canal temps réel (sinon ils resteraient invisibles
     jusqu'au prochain rechargement de la page). */
  function reconcileMissedMessages(sinceTs) {
    return client.from('messages')
      .select('id,article_id,sender_id,receiver_id,content,is_read,created_at')
      .or('sender_id.eq.' + user.id + ',receiver_id.eq.' + user.id)
      .gt('created_at', sinceTs)
      .order('created_at', { ascending: true })
      .then(function (r) {
        if (r.error || !r.data) return;
        r.data.forEach(function (m) {
          var otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
          var key = convKey(m.article_id, otherId);
          var c = conversations[key];
          if (c && c.messages.some(function (mm) { return mm.id === m.id; })) return; // déjà reçu via realtime
          handleIncomingMessage(m);
        });
      });
  }

  function handleIncomingMessage(m) {
    var otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
    var key = convKey(m.article_id, otherId);

    var afterInsert = function () {
      if (!conversations[key]) {
        conversations[key] = { articleId: m.article_id, otherId: otherId, messages: [], lastAt: m.created_at, unread: 0 };
      }
      var c = conversations[key];
      if (!c.messages.some(function (mm) { return mm.id === m.id; })) c.messages.push(m);
      c.lastAt = m.created_at;

      if (key === activeKey) {
        renderMessages(c);
        markConversationRead(c);
      } else if (m.receiver_id === user.id && !m.is_read) {
        c.unread++;
      }
      renderConvList();
    };

    var missingProfile = !profilesCache[otherId];
    var missingArticle = m.article_id && !articlesCache[m.article_id];
    if (!missingProfile && !missingArticle) { afterInsert(); return; }

    var fetches = [];
    fetches.push(missingProfile ? client.from('profiles').select('id,username,is_banned').eq('id', otherId).maybeSingle() : Promise.resolve(null));
    fetches.push(missingArticle ? client.from('articles').select('id,title,images').eq('id', m.article_id).maybeSingle() : Promise.resolve(null));
    Promise.all(fetches).then(function (results) {
      if (results[0] && results[0].data) profilesCache[otherId] = results[0].data;
      if (results[1] && results[1].data) articlesCache[m.article_id] = results[1].data;
      afterInsert();
    });
  }

  /* ── Init ── */
  var initTs = new Date().toISOString();
  loadConversations()
    .then(ensureDeepLinkConversation)
    .then(function () {
      renderConvList();
      if (deepWithId) {
        var key = convKey(deepArticleId, deepWithId);
        if (conversations[key]) openConversation(key);
      }
      return setupRealtime();
    })
    .then(function () {
      return reconcileMissedMessages(initTs);
    })
    .catch(function (err) {
      console.error('messages.js', err);
      convItemsEl.innerHTML = '<div class="loading-msg">Erreur de chargement des messages.</div>';
    });

})();
