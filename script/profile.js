/**
 * REWEAR DZ — Profile Page Script
 * Dépendances : supabase-js@2 chargé avant ce fichier
 */
(function () {
  var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';

  /* ── Auth ── */
  var user = (function () {
    try { var u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; }
    catch (e) { return null; }
  })();
  if (!user) {
    window.location.href = '../pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return;
  }

  var client = window.supabaseClient || (window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY));

  var ICON_INSTA = '<svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:-3px"><rect width="24" height="24" rx="6" fill="#E4405F"/><rect x="6" y="6" width="12" height="12" rx="3.5" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" stroke-width="1.6"/><circle cx="16.1" cy="7.9" r="0.9" fill="#fff"/></svg>';
  var ICON_FB    = '<svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:-3px"><rect width="24" height="24" rx="6" fill="#1877F2"/><path d="M15.5 8.5h-1.6c-.5 0-1 .3-1 1v1.6h2.5l-.3 2.4h-2.2V21h-2.7v-7.5H8.3v-2.4h2v-1.9c0-2 1.2-3.2 3.2-3.2h2v2.5z" fill="#fff"/></svg>';

  /* ── Toast ── */
  function showToast(msg, type) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + (type || '');
    setTimeout(function () { t.className = 'toast'; }, 3000);
  }

  /* ── Helpers ── */
  function initials(name) {
    if (!name) return '?';
    var parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name[0].toUpperCase();
  }
  function safeUrl(val, prefix) {
    if (!val) return '';
    val = val.trim();
    if (val.startsWith('http')) return val;
    return prefix + val;
  }
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ── Fill profile (base) ── */
  var username = user.username
    || (user.user_metadata && user.user_metadata.username)
    || (user.email && user.email.split('@')[0])
    || 'Utilisateur';
  var email = user.email || '';

  document.getElementById('avatarCircle').textContent = initials(username);
  document.getElementById('profileName').textContent  = username;
  document.getElementById('profileEmail').textContent = email;

  /* ── Load profile extras (phone, instagram, facebook) ── */
  client.from('profiles')
    .select('phone, instagram, facebook')
    .eq('id', user.id)
    .maybeSingle()
    .then(function (r) {
      var p = (r && r.data) ? r.data : {};
      renderSocialChips(p.phone || '', p.instagram || '', p.facebook || '');
    });

  function renderSocialChips(phone, instagram, facebook) {
    var chipsEl = document.getElementById('socialChips');
    chipsEl.innerHTML = '';

    if (phone) {
      chipsEl.innerHTML +=
        '<a class="meta-chip" href="tel:' + esc(phone) + '">' +
          '<span class="icon">📞</span>' + esc(phone) +
        '</a>';
    }
    if (instagram) {
      chipsEl.innerHTML +=
        '<a class="meta-chip meta-chip--insta" href="' + esc(safeUrl(instagram, 'https://instagram.com/')) + '" target="_blank" rel="noopener">' +
          '<span class="icon">' + ICON_INSTA + '</span>@' + esc(instagram.replace(/^@/, '')) +
        '</a>';
    }
    if (facebook) {
      chipsEl.innerHTML +=
        '<a class="meta-chip meta-chip--fb" href="' + esc(safeUrl(facebook, 'https://facebook.com/')) + '" target="_blank" rel="noopener">' +
          '<span class="icon">' + ICON_FB + '</span>' + esc(facebook.replace(/^@/, '')) +
        '</a>';
    }

    if (!phone && !instagram && !facebook) {
      chipsEl.innerHTML = '<span class="meta-chip meta-chip--empty">Aucun contact renseigné</span>';
    }
  }

  /* ── Load articles ── */
  client.from('articles')
    .select('id,title,price,etat,images,is_active,created_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .then(function (r) {
      var container = document.getElementById('articlesContainer');

      if (r.error || !r.data || r.data.length === 0) {
        container.innerHTML =
          '<div class="empty-state">' +
            '<div class="empty-icon">👗</div>' +
            '<p>Vous n\'avez pas encore d\'annonces publiées.</p>' +
            '<a href="../roles/vendeur/publier.html" class="btn-publish-sm">Publier ma première annonce</a>' +
          '</div>';
        document.getElementById('statArticles').textContent = '0';
        return;
      }

      var articles = r.data;
      document.getElementById('statArticles').textContent = articles.length;

      var grid = document.createElement('div');
      grid.className = 'articles-grid';

      articles.forEach(function (a) {
        var card = document.createElement('div');
        card.className = 'article-card';

        var imgHtml = (a.images && a.images.length > 0)
          ? '<img src="' + a.images[0] + '" alt="' + a.title + '" loading="lazy">'
          : '<div class="article-card-img-placeholder">📦</div>';

        card.innerHTML =
          imgHtml +
          '<div class="article-card-body">' +
            '<h4>' + (a.title || '').replace(/</g, '&lt;') + '</h4>' +
            '<div class="price">' + Number(a.price).toLocaleString('fr-DZ') + ' DA</div>' +
            '<div class="etat">' + (a.etat || '') + '</div>' +
          '</div>' +
          '<div class="article-card-actions">' +
            '<button class="btn-card-sm btn-card-edit"   data-id="' + a.id + '">✏️ Modifier</button>' +
            '<button class="btn-card-sm btn-card-delete" data-id="' + a.id + '">🗑️ Supprimer</button>' +
          '</div>';

        grid.appendChild(card);
      });

      container.innerHTML = '';
      container.appendChild(grid);

      /* Delete */
      grid.querySelectorAll('.btn-card-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = this.getAttribute('data-id');
          if (!confirm('Supprimer cette annonce ?')) return;
          client.from('articles').delete().eq('id', id).then(function (res) {
            if (res.error) { showToast('Erreur lors de la suppression.', 'error'); return; }
            showToast('Annonce supprimée.', 'success');
            btn.closest('.article-card').remove();
            var cur = parseInt(document.getElementById('statArticles').textContent, 10);
            document.getElementById('statArticles').textContent = Math.max(0, cur - 1);
          });
        });
      });

      /* Edit redirect */
      grid.querySelectorAll('.btn-card-edit').forEach(function (btn) {
        btn.addEventListener('click', function () {
          window.location.href = '../roles/vendeur/publier.html?edit=' + this.getAttribute('data-id');
        });
      });
    });

  /* ── Edit profile modal ── */
  var modal = document.getElementById('editModal');

  document.getElementById('btnEditProfile').addEventListener('click', function () {
    document.getElementById('editUsername').value = username;
    /* Pre-fill social fields from Supabase */
    client.from('profiles').select('phone,instagram,facebook,wilaya').eq('id', user.id).maybeSingle()
      .then(function (r) {
        var p = (r && r.data) ? r.data : {};
        document.getElementById('editPhone').value     = p.phone     || '';
        document.getElementById('editInstagram').value = p.instagram || '';
        document.getElementById('editFacebook').value  = p.facebook  || '';
        document.getElementById('editWilaya').value    = p.wilaya    || '';
      });
    modal.classList.add('open');
  });

  document.getElementById('btnCancelEdit').addEventListener('click', function () {
    modal.classList.remove('open');
  });
  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.classList.remove('open');
  });

  document.getElementById('btnSaveEdit').addEventListener('click', function () {
    var newName   = document.getElementById('editUsername').value.trim();
    var newWilaya = document.getElementById('editWilaya').value.trim();
    var newPhone  = document.getElementById('editPhone').value.trim();
    var newInsta  = document.getElementById('editInstagram').value.trim().replace(/^@/, '');
    var newFb     = document.getElementById('editFacebook').value.trim().replace(/^@/, '');
    var errEl     = document.getElementById('editError');

    if (!newName) {
      errEl.textContent   = 'Le nom est requis.';
      errEl.style.display = 'block';
      return;
    }
    if (newPhone && !/^(0\d{9}|\+213\d{9})$/.test(newPhone)) {
      errEl.textContent   = 'Numéro invalide. Utilisez le format 0XXXXXXXXX ou +213XXXXXXXXX, sans espaces.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    var btn = document.getElementById('btnSaveEdit');
    btn.disabled = true;
    btn.textContent = 'Enregistrement...';

    /* Le nom affiché partout ailleurs (header, cartes...) vient de user_metadata.username,
       donc on le met à jour là — en plus de la table profiles — sinon le changement ne
       survit pas à la prochaine connexion. */
    Promise.all([
      client.auth.updateUser({ data: { username: newName } }),
      client.from('profiles').upsert({
        id:        user.id,
        username:  newName,
        wilaya:    newWilaya || null,
        phone:     newPhone  || null,
        instagram: newInsta  || null,
        facebook:  newFb     || null
      })
    ]).then(function (results) {
      btn.disabled = false;
      btn.textContent = 'Enregistrer';

      var authRes = results[0], profileRes = results[1];
      if (authRes.error || profileRes.error) {
        if (profileRes.error && profileRes.error.code === '23505') {
          errEl.textContent   = 'Ce numéro de téléphone est déjà utilisé par un autre compte.';
          errEl.style.display = 'block';
          return;
        }
        showToast('Erreur : ' + ((authRes.error || profileRes.error).message), 'error');
        return;
      }

      /* Update localStorage */
      user.username = newName;
      localStorage.setItem('user', JSON.stringify(user));
      document.getElementById('profileName').textContent  = newName;
      document.getElementById('avatarCircle').textContent = initials(newName);
      username = newName;

      /* Refresh chips */
      renderSocialChips(newPhone, newInsta, newFb);

      modal.classList.remove('open');
      showToast('Profil mis à jour !', 'success');
    });
  });

  /* ── Voir mon profil public ── */
  document.getElementById('btnViewPublic').addEventListener('click', function () {
    window.location.href = 'seller.html?id=' + user.id;
  });

  /* ── Logout ── */
  document.getElementById('btnLogout').addEventListener('click', function () {
    if (!confirm('Se déconnecter ?')) return;
    localStorage.removeItem('user');
    client.auth.signOut().finally(function () {
      window.location.href = '../index.html';
    });
  });

})();