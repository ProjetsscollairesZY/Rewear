const SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

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

async function login(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      if (typeof window !== 'undefined' && window.showAuthError) window.showAuthError(error.message || 'Email ou mot de passe incorrect');
      else alert('❌ Email ou mot de passe incorrect');
      return false;
    }

    //  Sauvegarder session dans localStorage
    localStorage.setItem('token', data.session.access_token);
    localStorage.setItem('user', JSON.stringify({
      id: data.user.id,
      username: data.user.user_metadata.username || null,
      prenom: data.user.user_metadata.prenom || null,
      nom: data.user.user_metadata.nom || null
    }));

    // 🔹 Vérifier si profil complété
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('profile_completed')
      .eq('id', data.user.id)
      .single();

    if (userError) {
      console.error(userError);
    }

    if (userData && userData.profile_completed === false) {
      if (typeof window !== 'undefined' && window.showAuthSuccess) window.showAuthSuccess('Complétez votre profil.');
      else alert('✅ Connexion réussie ! Complétez votre profil.');
      window.location.href = './complete.html';
    } else {
      if (typeof window !== 'undefined' && window.showAuthSuccess) window.showAuthSuccess('Connexion réussie.');
      else alert('✅ Connexion réussie !');
      window.location.href = '../index.html';
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
  updateNav(user);
  if (!user) console.log("Non connecté");
  else console.log("Connecté :", user.email);
}

initAuth();