(function () {
  setTimeout(function () {
    var client = window.adminClient;
    if (!client) return;

    var tbody      = document.getElementById('tableBody');
    var searchEl   = document.getElementById('searchInput');
    var filterEl   = document.getElementById('filterRole');
    var countLabel = document.getElementById('countLabel');
    var allData    = [];

    function showToast(msg, type) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show ' + (type || '');
      setTimeout(function () { t.className = 'toast'; }, 3000);
    }

    function initials(name) {
      if (!name) return '?';
      var p = name.trim().split(' ');
      return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : name[0].toUpperCase();
    }

    function formatDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function filtered() {
      var search = searchEl.value.toLowerCase();
      var role   = filterEl.value;
      return allData.filter(function (u) {
        var matchSearch = !search
          || (u.username || '').toLowerCase().includes(search)
          || (u.phone    || '').toLowerCase().includes(search);
        var matchRole = !role || (u.role || 'user') === role;
        return matchSearch && matchRole;
      });
    }

  function render(data) {
  countLabel.textContent = data.length + ' utilisateur(s)';
  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Aucun utilisateur trouvé.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  data.forEach(function (u) {
    var role          = u.role || 'user';
    var isCurrentUser = u.id === window.adminUser.id;
    var isAdmin       = role === 'admin';

    var tr = document.createElement('tr');

    tr.innerHTML =
      '<td><div class="user-cell">' +
        '<div class="avatar-sm">' + initials(u.username) + '</div>' +
        '<span>' + (u.username || 'Sans nom') + '</span>' +
      '</div></td>' +
      '<td style="color:#c89b5f;">' + (u.phone || '—') + '</td>' +
      '<td style="color:#c89b5f;">' + (u.instagram ? '@'+u.instagram : '—') + '</td>' +
      '<td><span class="badge-role ' + (isAdmin ? 'badge-admin' : 'badge-user') + '">' + role + '</span></td>' +
      '<td style="color:#a07850;">' + formatDate(u.created_at) + '</td>' +
      '<td><div class="actions-cell">' +
        (!isCurrentUser && !isAdmin
          ? '<button class="btn-action btn-delete" data-id="' + u.id + '">🗑️ Supprimer</button>'
          : '<span style="font-size:0.75rem;color:#a07850;font-style:italic;">' + (isCurrentUser ? 'C\'est vous' : 'Admin protégé') + '</span>') +
      '</div></td>';

    /* Supprimer */
    var btnDelete = tr.querySelector('.btn-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', function () {
        if (!confirm('Supprimer cet utilisateur définitivement ?')) return;
        client.from('profiles').delete().eq('id', u.id)
          .then(function (r) {
            if (r.error) { showToast('Erreur : ' + r.error.message, 'error'); return; }
            showToast('Utilisateur supprimé.', 'success');
            allData = allData.filter(function (x) { return x.id !== u.id; });
            render(filtered());
          });
      });
    }

    tbody.appendChild(tr);
  });
}
    searchEl.addEventListener('input', function () { render(filtered()); });
    filterEl.addEventListener('change', function () { render(filtered()); });

    /* Load */
    client.from('profiles').select('*').order('created_at', { ascending: false })
      .then(function (r) {
        allData = r.data || [];
        render(allData);
      });

    /* Logout */
    document.getElementById('btnLogout').addEventListener('click', function () {
      client.auth.signOut().then(function () {
        localStorage.clear();
        window.location.href = '../index.html';
      });
    });
  }, 300);
})();