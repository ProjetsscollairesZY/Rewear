const SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';

const { createClient } = supabase;
const supabaseClient = window.supabaseClient || (window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY));

// Base URL de l'API (serveur Node) — même origine si tu ouvres via http://localhost:3000
const API_BASE = (typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === ''))
  ? 'http://localhost:3000'
  : (typeof window !== 'undefined' ? window.location.origin : '');

async function verifyRecaptcha(token) {
  if (!token) return false;
  try {
    const res = await fetch(API_BASE + '/api/verify-recaptcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    console.warn('Vérification reCAPTCHA indisponible (serveur non démarré?)', e);
    return true;
  }
}
if (typeof window !== 'undefined') window.verifyRecaptcha = verifyRecaptcha;


async function signup(email, password, username) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
  email: email,
  password: password,
  options: {
    emailRedirectTo: 'https://reweardz.store/pages/login.html', // ✅ Ajouter cette ligne
    data: {
      username: username
    }
  }
});

    if (error) {
      if (typeof window !== 'undefined' && window.showAuthError) window.showAuthError(error.message);
      else alert('❌ Erreur : ' + error.message);
      return false;
    }
    if (typeof window !== 'undefined' && window.showAuthSuccess) window.showAuthSuccess('Compte créé ! Vérifiez votre email.');
    else alert('✅ Compte créé ! Vérifiez votre email.');
    return true;

  } catch (err) {
    console.error('Erreur signup:', err);
    alert('❌ Une erreur est survenue');
    return false;
  }
}


// ==============================
// CONNEXION
// ==============================

function getSafeRedirect() {
  try {
    var r = new URLSearchParams(window.location.search).get('redirect');
    if (!r) return null;
    if (r.indexOf('://') !== -1 || r.indexOf('//') === 0) return null; // évite les redirections vers un site externe
    return r;
  } catch (e) { return null; }
}

async function login(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email, password
    });

    if (error) {
      if (window.showAuthError) window.showAuthError(error.message);
      else alert('❌ Email ou mot de passe incorrect');
      return false;
    }

    // Vérifier si banni
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_banned, ban_reason, profile_completed')
      .eq('id', data.user.id)
      .single();

    if (profile && profile.is_banned) {
      await supabaseClient.auth.signOut();
      localStorage.clear();
      var reason = encodeURIComponent(profile.ban_reason || '');
      // Adapter le chemin selon l'emplacement de la page (login.html est dans /pages/)
      var isInSubfolderLogin = window.location.pathname.includes('/pages/') ||
                               window.location.pathname.includes('/roles/');
      window.location.href = (isInSubfolderLogin ? '../' : '') + 'banned.html?reason=' + reason;
      return false;
    }

    // Session normale
    localStorage.setItem('token', data.session.access_token);
    localStorage.setItem('user', JSON.stringify({
      id: data.user.id,
      username: data.user.user_metadata.username || null,
    }));

    if (profile && profile.profile_completed === false) {
      window.location.href = './complete.html';
    } else {
      window.location.href = getSafeRedirect() || '../index.html';
    }
    return true;

  } catch (err) {
    console.error('Erreur login:', err);
    alert('❌ Une erreur est survenue');
    return false;
  }
}

// ==============================
// DECONNEXION
// ==============================

async function logout() {
  try {
    await supabaseClient.auth.signOut();
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    // Redirection dynamique selon l'emplacement actuel
    var isInSubfolder = window.location.pathname.includes('/pages/') || 
                        window.location.pathname.includes('/roles/');
    window.location.href = isInSubfolder ? '../index.html' : 'index.html';

  } catch (err) {
    console.error('Erreur logout:', err);
  }
}


// ==============================
// VERIFIER SESSION
// ==============================

async function checkAuth() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}

// ==============================
// BADGE MESSAGES NON LUS
// ==============================
function updateUnreadMessagesBadge(userId) {
  var badge = document.getElementById('navMsgBadge');
  if (!badge) return;
  supabaseClient.from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false)
    .then(function (r) {
      var n = (!r.error && r.count) ? r.count : 0;
      if (n > 0) {
        badge.textContent = n > 9 ? '9+' : String(n);
        badge.style.display = 'inline-flex';
      } else {
        badge.style.display = 'none';
      }
    });
}

// ==============================
// MISE À JOUR DU HEADER
// ==============================
function updateNav(user) {
  var guestNav   = document.getElementById('guest-nav');
  var authNav    = document.getElementById('auth-nav');
  var ddUsername = document.getElementById('dd-username');
  var avatarBtn  = document.getElementById('avatar-btn');
  var dropdown   = document.getElementById('dropdown');
  var logoutBtn  = document.getElementById('logout-btn');

  if (!guestNav || !authNav) return;

  if (user) {
    guestNav.style.display = 'none';
    authNav.style.display  = 'flex';

    var name = (user.user_metadata && user.user_metadata.username) || user.email || 'Profil';
    if (ddUsername) ddUsername.textContent = name;
    if (avatarBtn)  avatarBtn.textContent  = name[0].toUpperCase();

    updateUnreadMessagesBadge(user.id);

  } else {
    guestNav.style.display = 'flex';
    authNav.style.display  = 'none';
  }

  // ── Toggle dropdown ──
  if (avatarBtn && dropdown) {
    // Éviter les doublons de listeners
    var newAvatar = avatarBtn.cloneNode(true);
    avatarBtn.parentNode.replaceChild(newAvatar, avatarBtn);

    newAvatar.addEventListener('click', function(e) {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', function() {
      dropdown.classList.remove('open');
    });
  }

  // ── Bouton déconnexion ──
  var freshLogout = document.getElementById('logout-btn');
  if (freshLogout) {
    freshLogout.addEventListener('click', function(e) {
      e.stopPropagation();
      logout();
    });
  }
}

async function initAuth() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (user) {
    // Vérifier le ban à chaque chargement de page
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('is_banned, ban_reason')
      .eq('id', user.id)
      .single();

    if (profile && profile.is_banned) {
      await supabaseClient.auth.signOut();
      localStorage.clear();
      var reason = encodeURIComponent(profile.ban_reason || '');
      // Adapter le chemin selon la page actuelle
      var isInSubfolder = window.location.pathname.includes('/pages/') ||
                          window.location.pathname.includes('/roles/');
      window.location.href = (isInSubfolder ? '../' : '') + 'banned.html?reason=' + reason;
      return null; // banni → traité comme non authentifié pour tout le reste
    }
  }

  updateNav(user);
  if (!user) console.log("Non connecté");
  else console.log("Connecté :", user.email);
  return user;
}

// Promesse partagée : résout avec l'utilisateur Supabase authentifié ET non-banni
// (ou null), une fois la session réelle vérifiée côté serveur. Les pages qui exigent
// une connexion doivent attendre window.authReady avant d'agir, au lieu de se fier
// uniquement à localStorage('user') — qui peut rester présent après l'expiration
// ou la révocation de la vraie session Supabase.
window.authReady = initAuth();