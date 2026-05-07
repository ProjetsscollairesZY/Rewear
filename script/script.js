// ===================================================
// CHARGEMENT DES ANNONCES DEPUIS LA BDD
// ===================================================

var allArticles   = [];   // cache global
var currentCatId  = null; // null = tous

function getArticleImage(article) {
  if (article.images && article.images.length > 0) return article.images[0];
  return 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="200" viewBox="0 0 240 200">' +
    '<rect fill="#513620" width="240" height="200"/>' +
    '<text x="50%" y="50%" fill="#c89b5f" font-size="14" text-anchor="middle" dy=".3em">Sans image</text>' +
    '</svg>'
  );
}

function renderArticles(articles) {
  var container = document.getElementById('articles');
  var loading   = document.getElementById('articlesLoading');
  var empty     = document.getElementById('articlesEmpty');
  if (!container) return;

  // Vider les cards existantes (mais garder loading/empty)
  container.querySelectorAll('.card').forEach(function(c) { c.remove(); });

  if (loading) loading.style.display = 'none';

  if (articles.length === 0) {
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  articles.forEach(function(a) {
    var img   = getArticleImage(a);
    var title = (a.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var etat  = (a.etat  || '').replace(/</g, '&lt;');
    var desc  = (a.taille ? 'Taille ' + a.taille + ' · ' : '') + etat;

    var card = document.createElement('div');
    card.className  = 'card';
    card.setAttribute('data-id', a.id);
    card.style.cursor = 'pointer';
    card.innerHTML =
      '<img src="' + img + '" alt="' + title + '">' +
      '<div class="card-body">' +
        '<h4>' + title + '</h4>' +
        '<p class="card-desc">' + desc + '</p>' +
        '<div class="card-price"><span class="current-bid">' + Number(a.price || 0).toLocaleString('fr-DZ') + ' DA</span></div>' +
        '<button class="buy-btn" type="button">Voir l\'article</button>' +
      '</div>';

    /* Clic n'importe où sur la card → page détail */
    card.addEventListener('click', function (e) {
      // évite de déclencher si on clique sur le bouton (comportement identique ici)
      window.location.href = 'pages/article.html?id=' + a.id;
    });

    container.appendChild(card);
  });
}

// ===================================================
// CATÉGORIES — charger dynamiquement + filtrer
// ===================================================

function initCategories() {
  var bar = document.querySelector('.category-bar');
  if (!bar || !window.rewearArticles) return;

  window.rewearArticles.getCategories().then(function (cats) {
    // Garde le bouton "Tous" (premier enfant) et remplace le reste
    var allBtn = bar.querySelector('.category-btn');
    bar.innerHTML = '';

    // Bouton "Tous"
    var btnAll = document.createElement('button');
    btnAll.className = 'category-btn active';
    btnAll.textContent = 'Tous';
    btnAll.addEventListener('click', function () {
      setActiveTab(btnAll);
      currentCatId = null;
      renderArticles(allArticles);
    });
    bar.appendChild(btnAll);

    // Boutons catégories depuis Supabase
    cats.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.className   = 'category-btn';
      btn.textContent = cat.name;
      btn.setAttribute('data-id', cat.id);
      btn.addEventListener('click', function () {
        setActiveTab(btn);
        currentCatId = cat.id;
        var filtered = allArticles.filter(function (a) {
          return a.category_id === cat.id;
        });
        renderArticles(filtered);
      });
      bar.appendChild(btn);
    });
  });
}

function setActiveTab(activeBtn) {
  document.querySelectorAll('.category-btn').forEach(function (b) {
    b.classList.remove('active');
  });
  activeBtn.classList.add('active');
}

// ===================================================
// MENU HAMBURGER
// ===================================================

var hamburger    = document.getElementById('hamburger');
var sidebar      = document.getElementById('sidebar');
var closeSidebar = document.getElementById('close-sidebar');

if (hamburger && sidebar) {
  hamburger.addEventListener('click', function () {
    sidebar.classList.add('open');
    hamburger.classList.add('active');
  });
}
if (closeSidebar && sidebar) {
  closeSidebar.addEventListener('click', function () {
    sidebar.classList.remove('open');
    if (hamburger) hamburger.classList.remove('active');
  });
}
document.addEventListener('click', function (e) {
  if (sidebar && hamburger &&
      !sidebar.contains(e.target) &&
      !hamburger.contains(e.target)) {
    sidebar.classList.remove('open');
    hamburger.classList.remove('active');
  }
});

// ===================================================
// GESTION AUTH
// ===================================================

function getUser() {
  var token = localStorage.getItem('token');
  var user  = localStorage.getItem('user');
  if (!token || !user) return null;
  try { return JSON.parse(user); } catch (e) { return null; }
}

function renderStars(note) {
  var full  = Math.floor(note);
  var half  = (note - full) >= 0.5 ? 1 : 0;
  var empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function initAuth() {
  var user      = getUser();
  var guestNav  = document.getElementById('guest-nav');
  var authNav   = document.getElementById('auth-nav');
  var avatarBtn = document.getElementById('avatar-btn');
  var dropdown  = document.getElementById('dropdown');
  var ddUsername= document.getElementById('dd-username');
  var ddRating  = document.getElementById('dd-rating');
  var logoutBtn = document.getElementById('logout-btn');

  if (user) {
    if (guestNav) guestNav.style.display = 'none';
    if (authNav)  authNav.style.display  = 'flex';

    var initiale = user.prenom
      ? user.prenom[0].toUpperCase()
      : (user.username ? user.username[0].toUpperCase() : '?');
    if (avatarBtn) avatarBtn.textContent = initiale;

    if (ddUsername) ddUsername.textContent = user.prenom
      ? (user.prenom + ' ' + (user.nom || '')).trim()
      : user.username;

    if (ddRating) {
      if (user.note !== undefined && user.note !== null) {
        ddRating.innerHTML =
          '<span>' + renderStars(user.note) + '</span>' +
          '<span class="rating-count">(' + (user.nb_avis || 0) + ' avis)</span>';
      } else {
        ddRating.textContent = 'Pas encore noté';
      }
    }

    if (avatarBtn && dropdown) {
      avatarBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
      });
    }

  } else {
    if (guestNav) guestNav.style.display = 'flex';
    if (authNav)  authNav.style.display  = 'none';
  }
}

document.addEventListener('click', function () {
  var dropdown = document.getElementById('dropdown');
  if (dropdown) dropdown.classList.remove('open');
});

// ===================================================
// LANCEMENT
// ===================================================

document.addEventListener('DOMContentLoaded', function () {
  /* Init Supabase client */
  if (typeof supabase !== 'undefined' && !window.supabaseClient) {
    window.supabaseClient = supabase.createClient(
      'https://eviqzvrwjxmhwsylswqi.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0'
    );
  }

  initAuth();
  initCategories();

  /* Charger tous les articles une seule fois */
  if (window.rewearArticles && document.getElementById('articles')) {
    window.rewearArticles.loadArticles().then(function (articles) {
      allArticles = articles;
      renderArticles(allArticles);
    }).catch(function () {
      var loading = document.getElementById('articlesLoading');
      if (loading) loading.textContent = 'Impossible de charger les annonces.';
    });
  }
});