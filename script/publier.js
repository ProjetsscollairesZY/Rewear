(function() {
  if (typeof supabase !== 'undefined' && !window.supabaseClient) {
    window.supabaseClient = supabase.createClient(
      'https://eviqzvrwjxmhwsylswqi.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0'
    );
  }

  /* ── Mode édition : ?edit=<id> dans l'URL ── */
  var editId = new URLSearchParams(window.location.search).get('edit');

  var photoZone    = document.getElementById('photoZone');
  var photoInput   = document.getElementById('photoInput');
  var photoPreview = document.getElementById('photoPreview');
  var photoError   = document.getElementById('photoError');
  var selectedFiles  = [];  // nouveaux fichiers à uploader
  var existingImages = [];  // URLs déjà en ligne (mode édition), conservées sauf suppression manuelle

  function showPhotoError(msg) {
    photoError.textContent = msg || '';
    photoError.style.display = msg ? 'block' : 'none';
  }

  function addRemovableThumb(src, alt, onRemove) {
    var wrap = document.createElement('div');
    wrap.className = 'wrap';
    var img = document.createElement('img');
    img.className = 'thumb';
    img.alt = alt;
    img.src = src;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'remove';
    btn.textContent = '×';
    btn.addEventListener('click', onRemove);
    wrap.appendChild(img);
    wrap.appendChild(btn);
    photoPreview.appendChild(wrap);
  }

  function renderPreviews() {
    photoPreview.innerHTML = '';

    /* Photos déjà en ligne (mode édition) */
    existingImages.forEach(function(url, i) {
      addRemovableThumb(url, 'Photo existante', function() {
        existingImages.splice(i, 1);
        renderPreviews();
        showPhotoError('');
      });
    });

    /* Nouvelles photos sélectionnées */
    selectedFiles.forEach(function(file, i) {
      var url = URL.createObjectURL(file);
      addRemovableThumb(url, 'Preview', function() {
        selectedFiles.splice(i, 1);
        URL.revokeObjectURL(url);
        renderPreviews();
        showPhotoError('');
      });
    });
  }

  function addFiles(files) {
    var allowed   = ['image/jpeg', 'image/png', 'image/webp'];
    var maxSize   = 5 * 1024 * 1024;
    var maxPhotos = window.rewearArticles ? window.rewearArticles.MAX_PHOTOS : 10;
    for (var i = 0; i < files.length; i++) {
      if (existingImages.length + selectedFiles.length >= maxPhotos) break;
      var f = files[i];
      if (allowed.indexOf(f.type) === -1) {
        showPhotoError('Format non autorisé. Utilisez JPEG, PNG ou WebP.');
        return;
      }
      if (f.size > maxSize) {
        showPhotoError('Chaque image doit faire moins de 5 Mo.');
        return;
      }
      selectedFiles.push(f);
    }
    showPhotoError('');
    renderPreviews();
  }
  photoZone.addEventListener('click', function() { photoInput.click(); });
  photoZone.addEventListener('dragover', function(e) {
    e.preventDefault();
    photoZone.classList.add('dragover');
  });
  photoZone.addEventListener('dragleave', function() { photoZone.classList.remove('dragover'); });
  photoZone.addEventListener('drop', function(e) {
    e.preventDefault();
    photoZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  photoInput.addEventListener('change', function() {
    if (this.files.length) addFiles(this.files);
    this.value = '';
  });

  function renderCategoryOptions(cats, selectedId) {
    var sel = document.getElementById('category_id');
    sel.innerHTML = '<option value="">— Choisir —</option>';
    cats.forEach(function(c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
    if (selectedId) sel.value = selectedId;
  }

  function init(user) {

  if (editId) {
    /* ── Pré-remplissage du formulaire à partir de l'annonce existante ── */
    var titleEl = document.querySelector('h1.pub');
    if (titleEl) titleEl.textContent = "Modifier l'annonce";
    var submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = 'Chargement...';
    submitBtn.disabled = true;

    Promise.all([
      window.rewearArticles.getCategories(),
      window.rewearArticles.getArticleById(editId)
    ]).then(function(results) {
      var cats = results[0], article = results[1];

      if (!article || article.seller_id !== user.id) {
        var errEl = document.getElementById('pageError');
        errEl.textContent = "Cette annonce n'existe pas ou ne vous appartient pas.";
        errEl.style.display = 'block';
        document.getElementById('publierForm').style.display = 'none';
        return;
      }

      renderCategoryOptions(cats, article.category_id);

      document.getElementById('title').value       = article.title || '';
      document.getElementById('description').value = article.description || '';
      document.getElementById('price').value       = article.price || '';
      document.getElementById('etat').value         = article.etat || '';
      document.getElementById('taille').value       = article.taille || '';
      document.getElementById('wilaya').value       = article.wilaya || '';

      existingImages = (article.images || []).slice();
      renderPreviews();

      submitBtn.textContent = 'Enregistrer les modifications';
      submitBtn.disabled = false;
    }).catch(function(err) {
      var errEl = document.getElementById('pageError');
      errEl.textContent = (err && err.message) || "Impossible de charger l'annonce.";
      errEl.style.display = 'block';
    });
  } else {
    window.rewearArticles.getCategories().then(function(cats) {
      renderCategoryOptions(cats, null);
    });
  }

  document.getElementById('publierForm').addEventListener('submit', function(e) {
    e.preventDefault();
    var errEl = document.getElementById('pageError');
    var btn = document.getElementById('submitBtn');
    var msgSuccess = document.getElementById('msgSuccess');
    errEl.style.display = 'none';
    msgSuccess.style.display = 'none';
    if (existingImages.length + selectedFiles.length === 0) {
      showPhotoError('Ajoutez au moins une photo pour votre annonce.');
      return;
    }
    btn.disabled = true;

    var uploadStep = selectedFiles.length > 0
      ? window.rewearArticles.uploadImages(selectedFiles)
      : Promise.resolve([]);

    uploadStep
      .then(function(newUrls) {
        var allImages = existingImages.concat(newUrls);
        var data = {
          title: document.getElementById('title').value.trim(),
          description: document.getElementById('description').value.trim(),
          price: document.getElementById('price').value,
          etat: document.getElementById('etat').value,
          taille: document.getElementById('taille').value.trim(),
          category_id: document.getElementById('category_id').value || null,
          wilaya: document.getElementById('wilaya').value || null
        };
        return editId
          ? window.rewearArticles.updateArticle(editId, data, allImages)
          : window.rewearArticles.createArticle(data, allImages);
      })
      .then(function() {
        msgSuccess.style.display = 'block';
        msgSuccess.textContent = editId
          ? 'Annonce mise à jour avec succès. Redirection...'
          : 'Annonce publiée avec succès. Redirection...';
        setTimeout(function() {
          window.location.href = '../../index.html';
        }, 1500);
      })
      .catch(function(err) {
        btn.disabled = false;
        var msg = err && err.message ? err.message : 'Erreur lors de la publication.';
        errEl.textContent = msg;
        errEl.style.display = 'block';
        showPhotoError(msg.indexOf('photo') !== -1 ? msg : '');
      });
  });

  } // fin init()

  /* ── Auth : attend la vraie session Supabase (voir auth.js) avant de charger ── */
  Promise.resolve(window.authReady).then(function (user) {
    if (!user) {
      window.location.href = '../../pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    init(user);
  });
})();
