    (function() {
      var user = (function() {
        try {
          var u = localStorage.getItem('user');
          return u ? JSON.parse(u) : null;
        } catch (e) { return null; }
      })();
      if (!user) {
        window.location.href = '../../pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
      }
      if (typeof supabase !== 'undefined') {
        window.supabaseClient = supabase.createClient(
          'https://eviqzvrwjxmhwsylswqi.supabase.co',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0'
        );
      }

      var photoZone = document.getElementById('photoZone');
      var photoInput = document.getElementById('photoInput');
      var photoPreview = document.getElementById('photoPreview');
      var photoError = document.getElementById('photoError');
      var selectedFiles = [];

      function showPhotoError(msg) {
        photoError.textContent = msg || '';
        photoError.style.display = msg ? 'block' : 'none';
      }
      function renderPreviews() {
        photoPreview.innerHTML = '';
        selectedFiles.forEach(function(file, i) {
          var wrap = document.createElement('div');
          wrap.className = 'wrap';
          var img = document.createElement('img');
          img.className = 'thumb';
          img.alt = 'Preview';
          var url = URL.createObjectURL(file);
          img.src = url;
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'remove';
          btn.textContent = '×';
          btn.addEventListener('click', function() {
            selectedFiles.splice(i, 1);
            URL.revokeObjectURL(url);
            renderPreviews();
            showPhotoError('');
          });
          wrap.appendChild(img);
          wrap.appendChild(btn);
          photoPreview.appendChild(wrap);
        });
      }
      function addFiles(files) {
        var allowed = ['image/jpeg', 'image/png', 'image/webp'];
        var maxSize = 5 * 1024 * 1024;
        var maxPhotos = window.rewearArticles ? window.rewearArticles.MAX_PHOTOS : 10;
        for (var i = 0; i < files.length; i++) {
          if (selectedFiles.length >= maxPhotos) break;
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

      window.rewearArticles.getCategories().then(function(cats) {
        var sel = document.getElementById('category_id');
        cats.forEach(function(c) {
          var opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = c.name;
          sel.appendChild(opt);
        });
      });

      document.getElementById('publierForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var errEl = document.getElementById('pageError');
        var btn = document.getElementById('submitBtn');
        var msgSuccess = document.getElementById('msgSuccess');
        errEl.style.display = 'none';
        msgSuccess.style.display = 'none';
        if (selectedFiles.length === 0) {
          showPhotoError('Ajoutez au moins une photo pour votre annonce.');
          return;
        }
        btn.disabled = true;
        window.rewearArticles.uploadImages(selectedFiles)
          .then(function(urls) {
            return window.rewearArticles.createArticle({
              title: document.getElementById('title').value.trim(),
              description: document.getElementById('description').value.trim(),
              price: document.getElementById('price').value,
              etat: document.getElementById('etat').value,
              taille: document.getElementById('taille').value.trim(),
              category_id: document.getElementById('category_id').value || null,
              wilaya: document.getElementById('wilaya').value || null
            }, urls);
          })
          .then(function() {
            msgSuccess.style.display = 'block';
            msgSuccess.textContent = 'Annonce publiée avec succès. Redirection...';
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
    })();