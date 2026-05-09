/**
 * REWEAR DZ — Mes annonces
 * Dépendances : supabase-js@2 chargé avant ce fichier
 */
(function () {
  var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';

  /* ── Auth ── */
  var user = null;
  try { user = JSON.parse(localStorage.getItem('user') || 'null'); } catch (e) {}
  if (!user) { window.location.href = '../pages/login.html'; return; }

  /* ── Supabase client ── */
  if (typeof supabase !== 'undefined')
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ── DOM refs ── */
  var listEl     = document.getElementById('myList');
  var emptyEl    = document.getElementById('emptyDash');
  var errEl      = document.getElementById('dashError');
  var statTotal  = document.getElementById('statTotal');
  var statActive = document.getElementById('statActive');
  var statInact  = document.getElementById('statInactive');

  /* ── State ── */
  var allArticles = [];
  var currentFilter = 'all';

  /* ── Toast ── */
  function showToast(msg, type) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    setTimeout(function () { t.className = 'toast'; }, 3000);
  }

  /* ── Placeholder image ── */
  function getImg(a) {
    return (a.images && a.images[0])
      ? a.images[0]
      : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="90" height="90"%3E%3Crect fill="%23513620" width="90" height="90"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23d4a574" font-size="28"%3E📦%3C/text%3E%3C/svg%3E';
  }

  /* ── Render filtered list ── */
function render() {
  var filtered = allArticles.filter(function (a) {
    if (currentFilter === 'active')   return a.is_active;
    if (currentFilter === 'inactive') return !a.is_active;
    return true;
  });

  listEl.innerHTML = '';

  if (filtered.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  filtered.forEach(function (a) {
    var card = document.createElement('div');
    card.className = 'my-card' + (a.is_active ? '' : ' inactive');

    var statusLabel = a.is_active
      ? '<span class="card-status active-badge">● Active</span>'
      : '<span class="card-status inactive-badge">● Inactive</span>';

    var toggleLabel = a.is_active ? 'Désactiver' : 'Activer';
    var toggleClass = a.is_active ? 'btn-toggle deactivate' : 'btn-toggle';

    card.innerHTML =
      '<div class="card-top">' +
        '<img src="' + getImg(a) + '" alt="' + (a.title||'').replace(/</g,'&lt;') + '">' +
        '<div class="card-infos">' +
          '<h3>' + (a.title||'').replace(/</g,'&lt;') + '</h3>' +
          '<div class="etat">' + (a.etat||'') + '</div>' +
          statusLabel +
        '</div>' +
        '<div class="card-price">' + Number(a.price||0).toLocaleString('fr-DZ') + ' DA</div>' +
        '<div class="card-actions">' +
          '<button class="' + toggleClass + '" data-id="' + a.id + '" data-active="' + a.is_active + '">' + toggleLabel + '</button>' +
          '<button class="btn-delete" data-id="' + a.id + '">🗑️ Supprimer</button>' +
        '</div>' +
      '</div>' +
      '<div class="interests-bar">' +
        '<span class="interest-badge" data-id="' + a.id + '">🛒 Chargement...</span>' +
      '</div>' +
      '<div class="interests-panel" id="panel-' + a.id + '"></div>';

    listEl.appendChild(card);

    /* Charger les intérêts pour cette annonce */
    loadInterests(a.id, card);

    /* Toggle actif/inactif */
    card.querySelector('.btn-toggle').addEventListener('click', function () {
      var btn    = this;
      var active = btn.getAttribute('data-active') === 'true';
      btn.disabled = true;
      window.supabaseClient.from('articles')
        .update({ is_active: !active })
        .eq('id', a.id).eq('seller_id', user.id)
        .then(function (r) {
          if (r.error) { showToast('Erreur : ' + r.error.message, 'error'); btn.disabled = false; return; }
          showToast(active ? 'Annonce désactivée.' : 'Annonce activée.', 'success');
          load();
        });
    });

    /* Supprimer */
    card.querySelector('.btn-delete').addEventListener('click', function () {
      if (!confirm('Supprimer cette annonce définitivement ?')) return;
      var btn = this;
      btn.disabled = true;
      window.supabaseClient.from('articles')
        .delete().eq('id', a.id).eq('seller_id', user.id)
        .then(function (r) {
          if (r.error) { showToast('Erreur : ' + r.error.message, 'error'); btn.disabled = false; return; }
          showToast('Annonce supprimée.', 'success');
          load();
        });
    });
  });
}

/* ── Charger et afficher les intérêts d'une annonce ── */
function loadInterests(articleId, card) {
  window.supabaseClient.from('purchase_interest')
    .select('id,buyer_name,buyer_phone,buyer_email,message,created_at,is_read')
    .eq('article_id', articleId)
    .order('created_at', { ascending: false })
    .then(function (r) {
      var interests = r.data || [];
      var unread    = interests.filter(function (i) { return !i.is_read; }).length;
      var badge     = card.querySelector('.interest-badge');
      var panel     = card.querySelector('.interests-panel');

      /* Badge */
      badge.className = 'interest-badge' + (unread > 0 ? ' has-new' : '');
      badge.innerHTML = unread > 0
        ? '🛒 ' + interests.length + ' intéressé(s) — <strong>' + unread + ' nouveau(x)</strong>'
        : '🛒 ' + interests.length + ' intéressé(s)';

      /* Toggle panel au clic */
      badge.onclick = function () {
        panel.classList.toggle('open');
        renderInterests(interests, panel, articleId, badge);
      };
    });
}

/* ── Afficher la liste des intérêts ── */
function renderInterests(interests, panel, articleId, badge) {
  panel.innerHTML = '';

  if (interests.length === 0) {
    panel.innerHTML = '<div class="no-interests">Aucun intérêt pour le moment.</div>';
    return;
  }

  interests.forEach(function (item) {
    var date = item.created_at
      ? new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    var div = document.createElement('div');
    div.className = 'interest-item' + (item.is_read ? '' : ' unread');
    div.innerHTML =
      '<div class="interest-item-info">' +
        '<div class="interest-name">👤 ' + (item.buyer_name || 'Anonyme') + '</div>' +
        '<div class="interest-contact">📞 ' + (item.buyer_phone || '—') +
          (item.buyer_email ? ' · ✉️ ' + item.buyer_email : '') + '</div>' +
        (item.message ? '<div class="interest-msg">"' + item.message + '"</div>' : '') +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.4rem;">' +
        '<span class="interest-date">' + date + '</span>' +
        (!item.is_read
          ? '<button class="btn-mark-read" data-iid="' + item.id + '">✓ Marquer comme lu</button>'
          : '<span style="font-size:0.72rem;color:#7dd87d;">✓ Lu</span>') +
      '</div>';

    /* Bouton marquer comme lu */
    var btn = div.querySelector('.btn-mark-read');
    if (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = '...';
        window.supabaseClient.from('purchase_interest')
          .update({ is_read: true })
          .eq('id', item.id)
          .then(function (r) {
            if (r.error) { showToast('Erreur.', 'error'); btn.disabled = false; return; }
            item.is_read = true;
            div.classList.remove('unread');
            btn.outerHTML = '<span style="font-size:0.72rem;color:#7dd87d;">✓ Lu</span>';
            /* Mettre à jour le badge */
            var unread = interests.filter(function (i) { return !i.is_read; }).length;
            badge.className = 'interest-badge' + (unread > 0 ? ' has-new' : '');
            badge.innerHTML = unread > 0
              ? '🛒 ' + interests.length + ' intéressé(s) — <strong>' + unread + ' nouveau(x)</strong>'
              : '🛒 ' + interests.length + ' intéressé(s)';
          });
      });
    }

    panel.appendChild(div);
  });
}

  /* ── Load from Supabase ── */
  function load() {
    listEl.innerHTML = '<div class="loading-msg">Chargement...</div>';
    emptyEl.style.display = 'none';
    errEl.style.display = 'none';

    window.supabaseClient.from('articles')
      .select('id,title,price,etat,images,is_active,created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .then(function (r) {
        if (r.error) {
          errEl.textContent = r.error.message;
          errEl.style.display = 'block';
          listEl.innerHTML = '';
          return;
        }

        allArticles = r.data || [];

        /* Stats */
        var activeCount = allArticles.filter(function (a) { return a.is_active; }).length;
        statTotal.textContent  = allArticles.length;
        statActive.textContent = activeCount;
        statInact.textContent  = allArticles.length - activeCount;

        render();
      });
  }

  /* ── Filter tabs ── */
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      render();
    });
  });

  /* ── Init ── */
  load();

})();

if(user.is_banned){
   window.location.href = '../error.html';
}