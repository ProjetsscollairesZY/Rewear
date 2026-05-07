/**
 * REWEAR DZ — Admin Guard
 * Redirige vers l'accueil si l'utilisateur n'est pas admin
 */
(async function () {
  var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';

  var client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  var { data: { session } } = await client.auth.getSession();

  if (!session) {
    window.location.href = '../index.html';
    return;
  }

  try {
    var payload  = session.access_token.split('.')[1];
    var decoded  = JSON.parse(atob(payload));
    var userRole = decoded.user_role || 'user';

    if (userRole !== 'admin') {
      window.location.href = '../index.html';
      return;
    }

    // Rendre le client disponible globalement pour les autres scripts
    window.adminClient = client;
    window.adminUser   = session.user;

  } catch (e) {
    window.location.href = '../index.html';
  }
})();