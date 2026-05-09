(function () {
  // Attendre que admin-guard.js finisse
  setTimeout(function () {
    var client = window.adminClient;
    if (!client) return;

    // Stats users
    client.from('profiles').select('id', { count: 'exact', head: true })
      .then(function (r) {
        document.getElementById('statUsers').textContent = r.count || 0;
      });

    // Stats articles
    client.from('articles').select('id', { count: 'exact', head: true })
      .then(function (r) {
        document.getElementById('statArticles').textContent = r.count || 0;
      });

    // Stats signalements
    client.from('seller_signalements').select('id', { count: 'exact', head: true })
      .then(function (r) {
        document.getElementById('statSignalements').textContent = r.count || 0;
      });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', function () {
      client.auth.signOut().then(function () {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../../index.html';
      });
    });
  }, 300);
})();