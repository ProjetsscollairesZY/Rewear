/**
 * REWEAR DZ — Profil public vendeur
 */
(function () {
  var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';

  var client = (window.supabaseClient) || (typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null);
  window.supabaseClient = client;

  var wrap    = document.getElementById('pageWrap');
  var loading = document.getElementById('pageLoading');

  var WILAYA_NAMES = ['Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Bejaia','Biskra','Bechar','Blida','Bouira','Tamanrasset','Tebessa','Tlemcen','Tiaret','Tizi Ouzou','Alger','Djelfa','Jijel','Setif','Saida','Skikda','Sidi Bel Abbes','Annaba','Guelma','Constantine','Medea','Mostaganem',"M'Sila",'Mascara','Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arreridj','Boumerdes','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Ain Defla','Naama','Ain Temouchent','Ghardaia','Relizane','Timimoun','Bordj Badji Mokhtar','Ouled Djellal','Beni Abbes','In Salah','In Guezzam','Touggourt','Djanet',"El M'Ghair",'El Meniaa'];
  function wilayaLabel(v) {
    if (!v) return '';
    v = String(v).trim();
    if (/^\d{1,2}$/.test(v)) {
      var n = parseInt(v, 10);
      if (n >= 1 && n <= WILAYA_NAMES.length) return WILAYA_NAMES[n - 1];
    }
    return v;
  }

  var ICON_INSTA = '<svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:-3px"><rect width="24" height="24" rx="6" fill="#E4405F"/><rect x="6" y="6" width="12" height="12" rx="3.5" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="16.1" cy="7.9" r="0.9" fill="#fff"/></svg>';
  var ICON_FB    = '<svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:-3px"><rect width="24" height="24" rx="6" fill="#1877F2"/><path d="M15.5 8.5h-1.6c-.5 0-1 .3-1 1v1.6h2.5l-.3 2.4h-2.2V21h-2.7v-7.5H8.3v-2.4h2v-1.9c0-2 1.2-3.2 3.2-3.2h2v2.5z" fill="#fff"/></svg>';

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function initials(n) {
    if (!n) return '?';
    var p = n.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : n[0].toUpperCase();
  }
  function safeUrl(val, prefix) {
    if (!val) return '';
    val = val.trim();
    return val.indexOf('http') === 0 ? val : prefix + val;
  }
  function starsHtml(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= Math.round(n) ? '★' : '☆';
    return s;
  }
  function formatPrice(p) { return p == null ? '—' : Number(p).toLocaleString('fr-DZ'); }

  var sellerId = new URLSearchParams(window.location.search).get('id');

  if (!client || !sellerId) {
    loading.className = 'page-error';
    loading.textContent = 'Profil introuvable.';
    return;
  }

  Promise.all([
    client.from('profiles').select('username,phone,instagram,facebook,wilaya,is_banned').eq('id', sellerId).maybeSingle(),
    client.from('articles').select('id,title,price,etat,taille,wilaya,images').eq('seller_id', sellerId).eq('is_active', true).order('created_at', { ascending: false }),
    client.from('seller_reviews').select('id,rating,comment,created_at,author_id').eq('seller_id', sellerId).order('created_at', { ascending: false }),
    client.from('articles').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId).eq('is_sold', true).then(function (r) { return r; }, function () { return { count: null }; })
  ]).then(function (results) {
    var profile     = results[0].data;
    var articles     = results[1].data || [];
    var reviews       = results[2].data || [];
    var soldCountRes  = results[3];
    var soldCount     = (soldCountRes && !soldCountRes.error && soldCountRes.count != null) ? soldCountRes.count : null;

    if (!profile) {
      loading.className = 'page-error';
      loading.textContent = 'Ce profil vendeur n\'existe pas.';
      return;
    }

    loading.remove();
    render(profile, articles, reviews, soldCount);
  }).catch(function (err) {
    console.error('seller.js', err);
    loading.className = 'page-error';
    loading.textContent = 'Erreur de chargement du profil.';
  });

  function render(profile, articles, reviews, soldCount) {
    var username = profile.username || 'Vendeur';

    /* ── Rating ── */
    var avgRating = 0, ratingLine = '';
    if (reviews.length > 0) {
      avgRating = reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length;
      ratingLine =
        '<div class="seller-rating-line">' +
          '<span class="stars-display">' + starsHtml(avgRating) + '</span>' +
          '<span class="rating-avg">' + avgRating.toFixed(1) + '/5</span>' +
          '<span class="rating-count">(' + reviews.length + ' avis)</span>' +
        '</div>';
    } else {
      ratingLine = '<div class="seller-rating-line"><span class="rating-count">Aucun avis pour le moment</span></div>';
    }

    /* ── Contacts ── */
    var contacts = '';
    if (profile.phone)     contacts += '<a class="contact-chip" href="tel:' + esc(profile.phone) + '">📞 ' + esc(profile.phone) + '</a>';
    if (profile.instagram) {
      var h = profile.instagram.replace(/^@/, '');
      contacts += '<a class="contact-chip insta" href="' + safeUrl(h, 'https://instagram.com/') + '" target="_blank" rel="noopener">' + ICON_INSTA + '@' + esc(h) + '</a>';
    }
    if (profile.facebook) contacts += '<a class="contact-chip fb" href="' + safeUrl(profile.facebook, 'https://facebook.com/') + '" target="_blank" rel="noopener">' + ICON_FB + esc(profile.facebook.replace(/^@/, '')) + '</a>';
    if (!contacts) contacts = '<span class="contact-chip no-contact">Aucun contact renseigné</span>';

    var bannedTag = profile.is_banned ? '<span class="seller-banned-tag">Compte suspendu</span>' : '';

    var html =
      '<div class="seller-profile-card">' +
        '<div class="seller-avatar-lg">' + esc(initials(username)) + '</div>' +
        '<div class="seller-profile-info">' +
          '<h1>' + esc(username) + bannedTag + '</h1>' +
          (profile.wilaya ? '<div class="seller-sub">📍 ' + esc(wilayaLabel(profile.wilaya)) + '</div>' : '') +
          ratingLine +
          '<div class="seller-contacts">' + contacts + '</div>' +
        '</div>' +
      '</div>' +

      '<div class="stats-row">' +
        '<div class="stat-card"><div class="stat-num">' + articles.length + '</div><div class="stat-label">Annonces actives</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + (soldCount != null ? soldCount : '—') + '</div><div class="stat-label">Ventes réalisées</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + reviews.length + '</div><div class="stat-label">Avis reçus</div></div>' +
        '<div class="stat-card"><div class="stat-num">' + (reviews.length ? avgRating.toFixed(1) : '—') + '</div><div class="stat-label">Note moyenne</div></div>' +
      '</div>' +

      '<div class="section">' +
        '<div class="section-header"><h2>🛍️ Annonces en vente (' + articles.length + ')</h2></div>' +
        renderArticlesGrid(articles) +
      '</div>' +

      '<div class="section">' +
        '<div class="section-header"><h2>⭐ Avis (' + reviews.length + ')</h2></div>' +
        renderReviews(reviews) +
      '</div>';

    wrap.insertAdjacentHTML('beforeend', html);
  }

  function renderArticlesGrid(articles) {
    if (articles.length === 0) {
      return '<div class="empty-state">Aucune annonce active pour le moment.</div>';
    }
    var out = '<div class="seller-articles-grid">';
    articles.forEach(function (a) {
      var img = (a.images && a.images.length > 0) ? a.images[0] : 'assets/placeholder.jpg';
      out +=
        '<div class="card" style="position:relative;">' +
          (a.etat ? '<div class="card-badge">' + esc(a.etat) + '</div>' : '') +
          '<img src="' + esc(img) + '" alt="' + esc(a.title) + '" loading="lazy">' +
          '<div class="card-body">' +
            '<h4>' + esc(a.title) + '</h4>' +
            (a.wilaya ? '<div class="card-desc">📍 ' + esc(wilayaLabel(a.wilaya)) + (a.taille ? ' · Taille : ' + esc(a.taille) : '') + '</div>' : '') +
            '<div class="card-price"><span class="current-bid">' + formatPrice(a.price) + ' DZD</span></div>' +
            '<button class="buy-btn" onclick="window.location.href=\'article.html?id=' + a.id + '\'">Voir l\'article</button>' +
          '</div>' +
        '</div>';
    });
    out += '</div>';
    return out;
  }

  function renderReviews(reviews) {
    if (reviews.length === 0) {
      return '<div class="reviews-empty">Aucun avis pour ce vendeur pour le moment.</div>';
    }
    var out = '<div class="reviews-list">';
    reviews.forEach(function (r) {
      var date = r.created_at
        ? new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      out +=
        '<div class="review-item">' +
          '<div class="review-top">' +
            '<span class="review-stars">' + starsHtml(r.rating) + '</span>' +
            '<span class="review-date">' + date + '</span>' +
          '</div>' +
          (r.comment ? '<div class="review-comment">' + esc(r.comment) + '</div>' : '') +
        '</div>';
    });
    out += '</div>';
    return out;
  }
})();
