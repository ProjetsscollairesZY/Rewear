(function () {
  setTimeout(function () {
    var client = window.adminClient;
    if (!client) return;

    var tbody      = document.getElementById('tableBody');
    var filterEl   = document.getElementById('filterMotif');
    var countLabel = document.getElementById('countLabel');
    var allData    = [];

    function showToast(msg, type) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show ' + (type || '');
      setTimeout(function () { t.className = 'toast'; }, 3000);
    }

    function formatDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function render(data) {
      countLabel.textContent = data.length + ' signalement(s)';
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-msg">Aucun signalement.</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      data.forEach(function (s) {
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + (s.seller_id || '—').slice(0, 8) + '...</td>' +
          '<td><span class="badge-motif">' + (s.excuse || '—') + '</span></td>' +
          '<td style="max-width:200px;color:#c89b5f;">' + (s.comment || '—') + '</td>' +
          '<td style="color:#a07850;">' + formatDate(s.created_at) + '</td>' +
          '<td><div class="actions-cell">' +
            '<button class="btn-action btn-delete" data-id="' + s.id + '">🗑️ Supprimer</button>' +
          '</div></td>';
        tbody.appendChild(tr);

        tr.querySelector('.btn-delete').addEventListener('click', function () {
          if (!confirm('Supprimer ce signalement ?')) return;
          client.from('seller_signalements').delete().eq('id', s.id)
            .then(function (r) {
              if (r.error) { showToast('Erreur.', 'error'); return; }
              showToast('Signalement supprimé.', 'success');
              allData = allData.filter(function (x) { return x.id !== s.id; });
              render(filtered());
            });
        });
      });
    }

    function filtered() {
      var motif = filterEl.value;
      if (!motif) return allData;
      return allData.filter(function (s) { return s.excuse === motif; });
    }

    filterEl.addEventListener('change', function () { render(filtered()); });

    // Load
    client.from('seller_signalements')
      .select('*')
      .order('created_at', { ascending: false })
      .then(function (r) {
        allData = r.data || [];
        render(allData);
      });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', function () {
      client.auth.signOut().then(function () {
        localStorage.clear();
        window.location.href = '../index.html';
      });
    });
  }, 300);
})();