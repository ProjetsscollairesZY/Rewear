(function () {
  setTimeout(function () {
    var client = window.adminClient;
    if (!client) return;

    var tbody      = document.getElementById('tableBody');
    var filterEl   = document.getElementById('filterMotif');
    var searchEl   = document.getElementById('searchInput');
    var countLabel = document.getElementById('countLabel');
    var allData    = [];
    var pendingBanSeller = null;

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

    function userCell(profile, isSeller) {
      if (!profile) return '<div class="user-cell"><div class="user-name" style="color:#a07850;">Inconnu</div></div>';
      var banniBadge = profile.is_banned
        ? '<span class="badge-banni">Banni</span>'
        : '<span class="badge-ok">Actif</span>';
      var meta = '';
      if (profile.phone)     meta += '<span>📞 ' + profile.phone + '</span>';
      if (profile.instagram) meta += '<span>📷 @' + profile.instagram + '</span>';
      if (profile.email)     meta += '<span>✉️ ' + profile.email + '</span>';
      return '<div class="user-cell">' +
        '<div class="user-name">' + (profile.username || 'Sans nom') + (isSeller ? banniBadge : '') + '</div>' +
        (meta ? '<div class="user-meta">' + meta + '</div>' : '') +
        '</div>';
    }

    function render(data) {
      countLabel.textContent = data.length + ' signalement(s)';
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-msg">Aucun signalement.</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      data.forEach(function (s) {
        var seller   = s.seller || null;
        var author   = s.author || null;
        var isBanned = seller && seller.is_banned;

        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + userCell(seller, true) + '</td>' +
          '<td>' + userCell(author, false) + '</td>' +
          '<td><span class="badge-motif">' + (s.excuse || '—') + '</span></td>' +
          '<td><div class="comment-cell">' + (s.comment || '—') + '</div></td>' +
          '<td style="color:#a07850;white-space:nowrap;">' + formatDate(s.created_at) + '</td>' +
          '<td><div class="actions-cell">' +
            (!isBanned && seller ? '<button class="btn-action btn-ban">🚫 Bannir vendeur</button>' : '') +
            '<button class="btn-action btn-delete">🗑️ Supprimer</button>' +
          '</div></td>';

        // Bannir le vendeur
        var btnBan = tr.querySelector('.btn-ban');
        if (btnBan) {
          btnBan.addEventListener('click', function () {
            pendingBanSeller = seller;
            document.getElementById('banReason').value = '';
            document.getElementById('modalBan').classList.add('open');
          });
        }

        // Supprimer le signalement
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

        tbody.appendChild(tr);
      });
    }

    function filtered() {
      var motif  = filterEl.value;
      var search = searchEl.value.toLowerCase();
      return allData.filter(function (s) {
        var matchMotif  = !motif || s.excuse === motif;
        var sellerName  = (s.seller && s.seller.username) || '';
        var authorName  = (s.author && s.author.username) || '';
        var matchSearch = !search
          || sellerName.toLowerCase().includes(search)
          || authorName.toLowerCase().includes(search)
          || (s.comment || '').toLowerCase().includes(search);
        return matchMotif && matchSearch;
      });
    }

    // Modal ban — confirmer
    document.getElementById('btnConfirmBan').addEventListener('click', function () {
      if (!pendingBanSeller) return;
      var reason = (document.getElementById('banReason').value || '').trim();
      if (!reason) { alert('Veuillez indiquer une raison.'); return; }
      document.getElementById('modalBan').classList.remove('open');

      var now = new Date().toISOString();
      Promise.all([
        client.from('profiles').update({ is_banned: true, ban_reason: reason, banned_at: now }).eq('id', pendingBanSeller.id),
        client.from('banned_identifiers').upsert({
          user_id:   pendingBanSeller.id,
          username:  pendingBanSeller.username  || null,
          phone:     pendingBanSeller.phone     || null,
          instagram: pendingBanSeller.instagram || null,
          reason:    reason,
          banned_at: now
        }, { onConflict: 'user_id' })
      ]).then(function (results) {
        var err = results.find(function (r) { return r.error; });
        if (err) { showToast('Erreur : ' + err.error.message, 'error'); return; }
        showToast((pendingBanSeller.username || 'Vendeur') + ' banni définitivement.', 'success');
        allData = allData.map(function (s) {
          if (s.seller && s.seller.id === pendingBanSeller.id) s.seller.is_banned = true;
          return s;
        });
        render(filtered());
        pendingBanSeller = null;
      });
    });

    document.getElementById('btnCancelBan').addEventListener('click', function () {
      document.getElementById('modalBan').classList.remove('open');
      pendingBanSeller = null;
    });

    filterEl.addEventListener('change', function () { render(filtered()); });
    searchEl.addEventListener('input',  function () { render(filtered()); });

    // Charger les signalements
    client.from('seller_signalements')
      .select('id, excuse, comment, created_at, seller_id, author_id')
      .order('created_at', { ascending: false })
      .then(function (r) {
        if (r.error) { showToast('Erreur chargement : ' + r.error.message, 'error'); return; }
        var signalements = r.data || [];

        var ids = [];
        signalements.forEach(function (s) {
          if (s.seller_id && !ids.includes(s.seller_id)) ids.push(s.seller_id);
          if (s.author_id && !ids.includes(s.author_id)) ids.push(s.author_id);
        });

        if (ids.length === 0) { allData = []; render([]); return; }

        // Utiliser la vue admin_users qui contient l'email
        client.from('admin_users')
          .select('id, username, phone, instagram, email, is_banned')
          .in('id', ids)
          .then(function (r2) {
            if (r2.error) { showToast('Erreur profils : ' + r2.error.message, 'error'); return; }

            var profileMap = {};
            (r2.data || []).forEach(function (p) { profileMap[p.id] = p; });

            allData = signalements.map(function (s) {
              return Object.assign({}, s, {
                seller: profileMap[s.seller_id] || null,
                author: profileMap[s.author_id] || null
              });
            });

            render(allData);
          });
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