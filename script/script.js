// ================================================================
// REWEAR DZ — script.js
// ================================================================

// ── Tailles dynamiques selon catégorie slug ──
var TAILLES_PAR_CAT = {
  vetements:   ['XS','S','M','L','XL','XXL','XXXL'],
  chaussures:  ['36','37','38','39','40','41','42','43','44','45','46','47'],
  accessoires: ['Taille unique'],
  promotions:  [],
  objets:      []
};

// ── État global des filtres ──
var activeCatSlug = '';
var filtresActifs = {};

// ================================================================
// HAMBURGER — ouvre/ferme le sidebar drawer
// ================================================================

var hamburger   = document.getElementById('hamburger');
var sidebar     = document.getElementById('sidebar');
var closeSB     = document.getElementById('close-sidebar'); // id corrigé

if (hamburger && sidebar) {
  hamburger.addEventListener('click', function() {
    sidebar.classList.add('open');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
}

function fermerSidebar() {
  if (!sidebar) return;
  sidebar.classList.remove('open');
  if (hamburger) hamburger.classList.remove('active');
  document.body.style.overflow = '';
}

if (closeSB) {
  closeSB.addEventListener('click', fermerSidebar);
}

// Fermer en cliquant l'overlay (hors du sidebar)
document.addEventListener('click', function(e) {
  if (sidebar && sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      hamburger && !hamburger.contains(e.target)) {
    fermerSidebar();
  }
});

// ================================================================
// CATÉGORIES — sélection desktop + mobile synchronisée
// ================================================================

function selectionnerCategorie(slug) {
  activeCatSlug = slug || '';

  // Desktop category-bar
  document.querySelectorAll('.category-btn').forEach(function(b) {
    b.classList.toggle('active', (b.dataset.slug || '') === activeCatSlug);
  });
  // Mobile mob-cat
  document.querySelectorAll('.mob-cat').forEach(function(b) {
    b.classList.toggle('active', (b.dataset.slug || '') === activeCatSlug);
  });

  majTailles();
  lancerRecherche();
}

// Desktop
document.querySelectorAll('.category-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    selectionnerCategorie(btn.dataset.slug || '');
  });
});

// Mobile (dans le hamburger)
document.querySelectorAll('.mob-cat').forEach(function(btn) {
  btn.addEventListener('click', function() {
    selectionnerCategorie(btn.dataset.slug || '');
    fermerSidebar();
  });
});

// ================================================================
// TAILLES DYNAMIQUES
// ================================================================

function majTailles() {
  var sel = document.getElementById('fTaille');
  var grp = document.getElementById('fgTaille');
  if (!sel || !grp) return;

  var tailles = TAILLES_PAR_CAT[activeCatSlug];
  if (!tailles || tailles.length === 0) {
    grp.style.display = 'none';
    sel.value = '';
    return;
  }
  grp.style.display = '';
  var cur = sel.value;
  sel.innerHTML = '<option value="">Toutes</option>';
  tailles.forEach(function(t) {
    var o = document.createElement('option');
    o.value = t; o.textContent = t;
    if (t === cur) o.selected = true;
    sel.appendChild(o);
  });
}
majTailles();

// ================================================================
// TOGGLE PANNEAU FILTRES
// ================================================================

var btnFiltres  = document.getElementById('btnFiltres');
var filtersPanel= document.getElementById('filtersPanel');

if (btnFiltres && filtersPanel) {
  btnFiltres.addEventListener('click', function() {
    var isOpen = filtersPanel.classList.toggle('open');
    btnFiltres.classList.toggle('open', isOpen);
    if (isOpen) majTailles();
  });
}

// ================================================================
// TAGS FILTRES ACTIFS
// ================================================================

function majTags() {
  var container = document.getElementById('activeTags');
  if (!container) return;
  container.innerHTML = '';

  var searchVal = (document.getElementById('searchInput') || {}).value || '';

  var defs = [
    { k: 'cat',    v: activeCatSlug,           label: '📂 ' + activeCatSlug },
    { k: 'q',      v: searchVal.trim(),         label: '🔍 ' + searchVal.trim() },
    { k: 'wilaya', v: filtresActifs.wilaya,     label: '📍 ' + filtresActifs.wilaya },
    { k: 'taille', v: filtresActifs.taille,     label: '📐 ' + filtresActifs.taille },
    { k: 'etat',   v: filtresActifs.etat,       label: '✅ ' + filtresActifs.etat },
    { k: 'pmin',   v: filtresActifs.priceMin,   label: '💰 Min ' + filtresActifs.priceMin + ' DZD' },
    { k: 'pmax',   v: filtresActifs.priceMax,   label: '💰 Max ' + filtresActifs.priceMax + ' DZD' }
  ];

  defs.forEach(function(d) {
    if (!d.v) return;
    var tag = document.createElement('div');
    tag.className = 'ftag';
    tag.innerHTML = '<span>' + d.label + '</span><button>✕</button>';
    tag.querySelector('button').addEventListener('click', function() {
      supprimerFiltre(d.k);
    });
    container.appendChild(tag);
  });
}

function supprimerFiltre(k) {
  if (k === 'cat') { selectionnerCategorie(''); return; }
  var searchEl = document.getElementById('searchInput');
  if (k === 'q' && searchEl)     { searchEl.value = ''; }
  if (k === 'wilaya') { var el = document.getElementById('fWilaya');  if(el) el.value=''; delete filtresActifs.wilaya; }
  if (k === 'taille') { var el = document.getElementById('fTaille');  if(el) el.value=''; delete filtresActifs.taille; }
  if (k === 'etat')   { var el = document.getElementById('fEtat');    if(el) el.value=''; delete filtresActifs.etat; }
  if (k === 'pmin')   { var el = document.getElementById('fPrixMin'); if(el) el.value=''; delete filtresActifs.priceMin; }
  if (k === 'pmax')   { var el = document.getElementById('fPrixMax'); if(el) el.value=''; delete filtresActifs.priceMax; }
  lancerRecherche();
}

// ================================================================
// APPLIQUER / RÉINITIALISER FILTRES
// ================================================================

var btnOk    = document.getElementById('btnOk');
var btnReset = document.getElementById('btnReset');

if (btnOk) {
  btnOk.addEventListener('click', function() {
    filtresActifs = {};
    var w    = (document.getElementById('fWilaya')  || {}).value || '';
    var t    = (document.getElementById('fTaille')  || {}).value || '';
    var e    = (document.getElementById('fEtat')    || {}).value || '';
    var pmin = (document.getElementById('fPrixMin') || {}).value || '';
    var pmax = (document.getElementById('fPrixMax') || {}).value || '';
    if (w)    filtresActifs.wilaya   = w;
    if (t)    filtresActifs.taille   = t;
    if (e)    filtresActifs.etat     = e;
    if (pmin) filtresActifs.priceMin = pmin;
    if (pmax) filtresActifs.priceMax = pmax;
    if (filtersPanel) filtersPanel.classList.remove('open');
    if (btnFiltres)   btnFiltres.classList.remove('open');
    lancerRecherche();
  });
}

if (btnReset) {
  btnReset.addEventListener('click', function() {
    filtresActifs = {};
    var ids = ['fWilaya','fTaille','fEtat','fPrixMin','fPrixMax','searchInput'];
    ids.forEach(function(id) { var el = document.getElementById(id); if(el) el.value = ''; });
    if (filtersPanel) filtersPanel.classList.remove('open');
    if (btnFiltres)   btnFiltres.classList.remove('open');
    selectionnerCategorie('');
  });
}

// ================================================================
// RECHERCHE LIVE (debounce 400ms)
// ================================================================

var _searchTimer;
var searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(lancerRecherche, 400);
  });
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { clearTimeout(_searchTimer); lancerRecherche(); }
  });
}

// ================================================================
// LANCER LA REQUÊTE SUPABASE VIA applyFilters (articles.js)
// ================================================================

function lancerRecherche() {
  majTags();
  if (window.applyFilters) {
    window.applyFilters({
      category: activeCatSlug,
      search:   (document.getElementById('searchInput') || {}).value || '',
      wilaya:   filtresActifs.wilaya   || '',
      size:     filtresActifs.taille   || '',
      etat:     filtresActifs.etat     || '',
      priceMin: filtresActifs.priceMin || '',
      priceMax: filtresActifs.priceMax || ''
    });
  }
}

// ================================================================
// AUTH — affichage header
// Note: auth.js gère déjà initAuth() + logout.
// Ce bloc COMPLÈTE uniquement (rating, admin link).
// On n'attache PAS un second listener sur logout-btn.
// ================================================================

function getUser() {
  try {
    var u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  } catch(e) { return null; }
}

function renderStars(note) {
  if (!note) return '';
  var full  = Math.floor(note);
  var half  = (note - full) >= 0.5 ? '½' : '';
  var empty = 5 - full - (half ? 1 : 0);
  return '★'.repeat(full) + half + '☆'.repeat(empty);
}

function majHeaderLocal() {
  var user = getUser();
  if (!user) return;

  var ddRating = document.getElementById('dd-rating');
  if (ddRating && user.note != null) {
    ddRating.innerHTML =
      '<span>' + renderStars(user.note) + '</span> ' +
      '<span>(' + (user.nb_avis || 0) + ' avis)</span>';
  }
}

// Vérification admin (via JWT Supabase)
(async function() {
  try {
    var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
    var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';
    var c = (window.supabaseClient) || supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    var s = await c.auth.getSession();
    if (!s.data.session) return;
    var payload = JSON.parse(atob(s.data.session.access_token.split('.')[1]));
    if (payload.user_role === 'admin') {
      var lien = document.getElementById('admin-link');
      if (lien) lien.style.display = 'inline-flex';
    }
  } catch(e) {}
})();

// ================================================================
// INIT AU CHARGEMENT
// ================================================================

document.addEventListener('DOMContentLoaded', function() {
  majHeaderLocal();
  // Le chargement initial des articles est fait par articles.js (loadAndRender au boot)
});