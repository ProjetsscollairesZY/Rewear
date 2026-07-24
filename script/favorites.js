/**
 * REWEAR DZ — Favoris
 */
(function () {
  var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';

  var client  = window.supabaseClient || (window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
  var gridEl  = document.getElementById('favGrid');
  var emptyEl = document.getElementById('emptyState');
  var countEl = document.getElementById('favCount');

  /* ── Toast ── */
  function showToast(msg, type) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    setTimeout(function () { t.className = 'toast'; }, 3000);
  }

  /* ── Auth : attend la vraie session Supabase (voir auth.js) avant d'agir ── */
  Promise.resolve(window.authReady).then(function (user) {
    if (!user) { window.location.href = '../pages/login.html?redirect=' + encodeURIComponent(window.location.pathname); return; }
    init(user);
  });

  function init(user) {
  /* ── Load ── */
  client.from('favorites')
    .select('id, article_id, articles(id, title, price, etat, images)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .then(function (r) {
      gridEl.innerHTML = '';

      var favs = (r.data || []).filter(function (f) { return f.articles; });
      countEl.textContent = favs.length;

      if (favs.length === 0) {
        emptyEl.style.display = 'block';
        return;
      }

      favs.forEach(function (fav) {
        var a = fav.articles;
        var card = document.createElement('div');
        card.className = 'fav-card';

        card.innerHTML =
          (a.images && a.images[0]
            ? '<img src="' + a.images[0] + '" alt="' + (a.title||'').replace(/</g,'&lt;') + '" loading="lazy">'
            : '<div class="fav-card-placeholder">📦</div>') +
          '<div class="fav-card-body">' +
            '<h4>' + (a.title||'').replace(/</g,'&lt;') + '</h4>' +
            '<div class="fav-etat">' + (a.etat||'') + '</div>' +
            '<div class="fav-price">' + Number(a.price||0).toLocaleString('fr-DZ') + ' DA</div>' +
          '</div>' +
          '<button class="btn-unfav" title="Retirer des favoris">❤️</button>';

        /* Clic carte → article */
        card.addEventListener('click', function (e) {
          if (e.target.classList.contains('btn-unfav')) return;
          window.location.href = '../pages/article.html?id=' + a.id;
        });

        /* Retirer favori */
        card.querySelector('.btn-unfav').addEventListener('click', function () {
          client.from('favorites').delete().eq('id', fav.id)
            .then(function (res) {
              if (res.error) { showToast('Erreur.', 'error'); return; }
              card.remove();
              var cur = parseInt(countEl.textContent, 10);
              countEl.textContent = Math.max(0, cur - 1);
              showToast('Retiré des favoris.', 'success');
              if (gridEl.children.length === 0) {
                emptyEl.style.display = 'block';
              }
            });
        });

        gridEl.appendChild(card);
      });
    })
    .catch(function () {
      gridEl.innerHTML = '<div class="loading-state" style="grid-column:1/-1;color:#c0392b;">Erreur de chargement.</div>';
    });
  }

})();
