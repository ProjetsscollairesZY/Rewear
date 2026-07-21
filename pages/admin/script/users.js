(function () {
  setTimeout(function () {
    var client = window.adminClient;
    if (!client) return;

    var tbody      = document.getElementById('tableBody');
    var searchEl   = document.getElementById('searchInput');
    var filterEl   = document.getElementById('filterRole');
    var countLabel = document.getElementById('countLabel');
    var allData    = [];

    /* ── En attente du ban en cours ── */
    var pendingBanUser = null;

    /* ── Toast ── */
    function showToast(msg, type) {
      var t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'toast show ' + (type || '');
      setTimeout(function () { t.className = 'toast'; }, 3500);
    }

    function initials(name) {
      if (!name) return '?';
      var p = name.trim().split(' ');
      return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name[0].toUpperCase();
    }

    function formatDate(d) {
      if (!d) return '—';
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function esc(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* ── Filtrage ── */
    function filtered() {
      var search = (searchEl.value || '').toLowerCase();
      var role   = filterEl.value;
      return allData.filter(function (u) {
        var matchSearch = !search
          || (u.username || '').toLowerCase().includes(search)
          || (u.phone    || '').toLowerCase().includes(search);
        var statut = u.is_banned ? 'banni' : (u.role || 'user');
        var matchRole = !role || statut === role;
        return matchSearch && matchRole;
      });
    }

    /* ── Render ── */
    function render(data) {
      countLabel.textContent = data.length + ' utilisateur(s)';
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Aucun utilisateur trouve.</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      data.forEach(function (u) {
        var isBanned      = !!u.is_banned;
        var role = u.role || 'user';
        var isCurrentUser = u.id === window.adminUser.id;
        var isAdmin       = role === 'admin';

        var tr = document.createElement('tr');
        if (isBanned) tr.classList.add('banned-row');

        /* Badge statut */
        var badgeClass = isBanned ? 'badge-banni' : (isAdmin ? 'badge-admin' : 'badge-user');
        var badgeLabel = isBanned ? 'Banni' : role;

        /* Actions */
        var actionsHtml = '';
        if (isCurrentUser) {
          actionsHtml = '<span style="font-size:0.75rem;color:var(--muted);font-style:italic;">C\'est vous</span>';
        } else if (isAdmin) {
          actionsHtml = '<span style="font-size:0.75rem;color:var(--muted);font-style:italic;">Admin protege</span>';
        } else if (isBanned) {
          actionsHtml =
            '<button class="btn-action btn-unban"  data-id="' + u.id + '">Debannir</button>' +
            '<button class="btn-action btn-delete" data-id="' + u.id + '">Supprimer</button>';
        } else {
          actionsHtml =
            '<button class="btn-action btn-ban"    data-id="' + u.id + '">Bannir</button>' +
            '<button class="btn-action btn-delete" data-id="' + u.id + '">Supprimer</button>';
        }

        tr.innerHTML =
          '<td><div class="user-cell">' +
            '<div class="avatar-sm' + (isBanned ? ' banned' : '') + '">' + initials(u.username) + '</div>' +
            '<div>' +
              '<div>' + esc(u.username || 'Sans nom') + '</div>' +
              (isBanned && u.ban_reason ? '<div style="font-size:0.72rem;color:#c0392b;margin-top:0.15rem;">' + esc(u.ban_reason) + '</div>' : '') +
            '</div>' +
            
          '</div></td>' +
          '<td style="color:var(--muted);">' + esc(u.email || '—') + '</td>' +
          '<td style="color:var(--muted);">' + esc(u.phone || '—') + '</td>' +
          '<td style="color:var(--muted);">' + (u.instagram ? '@' + esc(u.instagram) : '—') + '</td>' +
          '<td><span class="badge-role ' + badgeClass + '">' + badgeLabel + '</span></td>' +
          '<td style="color:var(--muted);">' + formatDate(u.created_at) + '</td>' +
          '<td><div class="actions-cell">' + actionsHtml + '</div></td>';

        /* Bannir → ouvre modal */
        var btnBan = tr.querySelector('.btn-ban');
        if (btnBan) {
          btnBan.addEventListener('click', function () {
            pendingBanUser = u;
            document.getElementById('banReason').value = '';
            document.getElementById('modalBan').classList.add('open');
          });
        }

        /* Debannir */
        var btnUnban = tr.querySelector('.btn-unban');
        if (btnUnban) {
          btnUnban.addEventListener('click', function () {
            if (!confirm('Retirer le ban de ' + (u.username || u.id) + ' ?')) return;
            debannir(u);
          });
        }

        /* Supprimer */
        var btnDelete = tr.querySelector('.btn-delete');
        if (btnDelete) {
          btnDelete.addEventListener('click', function () {
            if (!confirm('Supprimer definitivement ' + (u.username || u.id) + ' ?')) return;
            supprimerUser(u);
          });
        }

        tbody.appendChild(tr);
      });
    }

    /* ── BAN permanent ── */
function bannir(u, reason) {
  var now = new Date().toISOString();

  var updateProfile = client.from('profiles')
    .update({ is_banned: true, ban_reason: reason, banned_at: now })
    .eq('id', u.id);

  var upsertBanned = client.from('banned_identifiers')
    .upsert({
      user_id:   u.id,
      username:  u.username  || null,
      phone:     u.phone     || null,
      instagram: u.instagram || null,
      reason:    reason,
      banned_at: now
    }, { onConflict: 'user_id' });

  // Les 2 appels en même temps
  Promise.all([updateProfile, upsertBanned])
    .then(function (results) {
      var err = results.find(function(r) { return r.error; });
      if (err) { showToast('Erreur : ' + err.error.message, 'error'); return; }

      showToast((u.username || 'Utilisateur') + ' banni définitivement.', 'success');
      allData = allData.map(function (x) {
        if (x.id !== u.id) return x;
        return Object.assign({}, x, { is_banned: true, ban_reason: reason, banned_at: now });
      });
      render(filtered());
    })
    .catch(function(err) {
      showToast('Erreur inattendue.', 'error');
      console.error(err);
    });
}

    /* ── DEBAN ── */
    function debannir(u) {
      client.from('profiles')
        .update({ is_banned: false, ban_reason: null, banned_at: null })
        .eq('id', u.id)
        .then(function (r) {
          if (r.error) { showToast('Erreur : ' + r.error.message, 'error'); return; }
          /* Supprimer de banned_identifiers aussi */
          client.from('banned_identifiers').delete().eq('user_id', u.id).then(function () {
            showToast((u.username || 'Utilisateur') + ' debanni.', 'success');
            allData = allData.map(function (x) {
              if (x.id !== u.id) return x;
              return Object.assign({}, x, { is_banned: false, ban_reason: null, banned_at: null });
            });
            render(filtered());
          });
        });
    }

    /* ── SUPPRIMER ── */
   function supprimerUser(u) {
  client.rpc('delete_user_completely', { target_user_id: u.id })
    .then(function(r) {
      if (r.error) { showToast('Erreur : ' + r.error.message, 'error'); return; }
      showToast('Utilisateur supprimé.', 'success');
      allData = allData.filter(function(x) { return x.id !== u.id; });
      render(filtered());
    });
}

    /* ── Modal ban — confirmer ── */
    document.getElementById('btnConfirmBan').addEventListener('click', function () {
      if (!pendingBanUser) return;
      var reason = (document.getElementById('banReason').value || '').trim();
      if (!reason) { alert('Veuillez indiquer une raison.'); return; }
      document.getElementById('modalBan').classList.remove('open');
      bannir(pendingBanUser, reason);
      pendingBanUser = null;
    });

    document.getElementById('btnCancelBan').addEventListener('click', function () {
      document.getElementById('modalBan').classList.remove('open');
      pendingBanUser = null;
    });

    /* ── Filtres ── */
    searchEl.addEventListener('input',  function () { render(filtered()); });
    filterEl.addEventListener('change', function () { render(filtered()); });

    /* ── Charger les utilisateurs ── */
    client.from('admin_users')
  .select('*')
  .order('created_at', { ascending: false })
  .then(function (r) {
    if (r.error) {
      showToast(r.error.message, 'error');
      return;
    }

    allData = r.data || [];
    render(allData);
  });

    /* ── Logout ── */
    document.getElementById('btnLogout').addEventListener('click', function () {
      client.auth.signOut().then(function () {
        localStorage.clear();
        window.location.href = '../../index.html';
      });
    });

  }, 300);
})();