(function () {
  setTimeout(function () {
    var client = window.adminClient;
    if (!client) return;

    var tbody      = document.getElementById('tableBody');
    var searchEl   = document.getElementById('searchInput');
    var filterEl   = document.getElementById('filterStatus');
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

    function filtered() {
      var search = searchEl.value.toLowerCase();
      var status = filterEl.value;
      return allData.filter(function (a) {
        var matchSearch = !search || (a.title || '').toLowerCase().includes(search);
        var matchStatus = !status
          || (status === 'active'   &&  a.is_active)
          || (status === 'inactive' && !a.is_active);
        return matchSearch && matchStatus;
      });
    }

    function render(data) {
      countLabel.textContent = data.length + ' annonce(s)';
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-msg">Aucune annonce trouvée.</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      data.forEach(function (a) {
        var tr = document.createElement('tr');
        var imgHtml = (a.images && a.images[0])
          ? '<img class="article-img" src="' + a.images[0] + '" alt="">'
          : '<div class="img-placeholder">📦</div>';

        tr.innerHTML =
          '<td>' + imgHtml + '</td>' +
          '<td style="max-width:180px;"><strong>' + (a.title||'').replace(/</g,'&lt;') + '</strong></td>' +
          '<td style="color:var(--gold);font-weight:700;">' + Number(a.price||0).toLocaleString('fr-DZ') + ' DA</td>' +
          '<td style="color:var(--muted);">' + (a.etat||'—') + '</td>' +
          '<td><span class="' + (a.is_active ? 'badge-active' : 'badge-inactive') + '">' + (a.is_active ? 'Active' : 'Inactive') + '</span></td>' +
          '<td style="color:var(--muted);">' + formatDate(a.created_at) + '</td>' +
          '<td><div class="actions-cell">' +
            '<button class="btn-action btn-view" data-id="' + a.id + '">👁️ Voir</button>' +
            '<button class="btn-action btn-toggle" data-id="' + a.id + '" data-active="' + a.is_active + '">' + (a.is_active ? '⏸ Désactiver' : '▶ Activer') + '</button>' +
            '<button class="btn-action btn-delete" data-id="' + a.id + '">🗑️ Supprimer</button>' +
          '</div></td>';

        /* Voir l'article */
        tr.querySelector('.btn-view').addEventListener('click', function () {
          window.open('../article.html?id=' + a.id, '_blank');
        });

        /* Toggle actif */
        tr.querySelector('.btn-toggle').addEventListener('click', function () {
          client.from('articles').update({ is_active: !a.is_active }).eq('id', a.id)
            .then(function (r) {
              if (r.error) { showToast('Erreur.', 'error'); return; }
              a.is_active = !a.is_active;
              showToast(a.is_active ? 'Annonce activée.' : 'Annonce désactivée.', 'success');
              render(filtered());
            });
        });

        /* Supprimer */
     tr.querySelector('.btn-delete').addEventListener('click', function () {
  if (!confirm('Supprimer cette annonce définitivement ?')) return;

  var id = a.id;

  // 1. Supprimer toutes les données liées d'abord
  Promise.all([
    client.from('favorites').delete().eq('article_id', id),
    client.from('purchase_interest').delete().eq('article_id', id),
    client.from('messages').delete().eq('article_id', id),
  ])
  .then(function () {
    // 2. Supprimer l'article
    return client.from('articles').delete().eq('id', id);
  })
  .then(function (r) {
    if (r.error) { showToast('Erreur : ' + r.error.message, 'error'); return; }
    showToast('Annonce supprimée.', 'success');
    allData = allData.filter(function (x) { return x.id !== id; });
    render(filtered());
  })
  .catch(function (err) {
    showToast('Erreur inattendue.', 'error');
    console.error(err);
  });
});

        tbody.appendChild(tr);
      });
    }

    searchEl.addEventListener('input', function () { render(filtered()); });
    filterEl.addEventListener('change', function () { render(filtered()); });

    /* Load */
    client.from('articles')
      .select('id, title, price, etat, images, is_active, created_at')
      .order('created_at', { ascending: false })
      .then(function (r) {
        allData = r.data || [];
        render(allData);
      });

    /* Logout */
    document.getElementById('btnLogout').addEventListener('click', function () {
      client.auth.signOut().then(function () {
        localStorage.clear();
        window.location.href = '../../index.html';
      });
    });
  }, 300);
})();
