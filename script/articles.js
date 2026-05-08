/**
 * REWEAR DZ - Articles & Storage
 * Formats autorisés : JPEG, PNG, WebP. Taille max : 5 Mo par image.
 */
(function() {
  var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';
  var BUCKET = 'article-images';
  var MAX_FILE_SIZE = 5 * 1024 * 1024;
  var ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var MAX_IMAGE_PIXELS = 1920 * 1920;
  var QUALITY = 0.85;

  /* ── Supabase client singleton ── */
  function getClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (typeof supabase !== 'undefined') {
      window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return window.supabaseClient;
    }
    return null;
  }

  /* ── Image helpers ── */
  function isAllowedType(type) { return ALLOWED_TYPES.indexOf(type) !== -1; }

  function compressImage(file) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var w = img.width, h = img.height;
        if (w * h > MAX_IMAGE_PIXELS) {
          var r = Math.sqrt(MAX_IMAGE_PIXELS / (w * h));
          w = Math.floor(w * r); h = Math.floor(h * r);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          blob ? resolve(blob) : reject(new Error('Compression échouée'));
        }, 'image/jpeg', QUALITY);
      };
      img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('Image invalide')); };
      img.src = url;
    });
  }

  function validateAndPrepareFiles(files) {
    var out = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!isAllowedType(f.type)) return { error: 'Format non autorisé. Utilisez JPEG, PNG ou WebP.' };
      if (f.size > MAX_FILE_SIZE) return { error: 'Chaque image doit faire moins de 5 Mo. "' + f.name + '" est trop lourd.' };
      out.push(f);
    }
    return { files: out };
  }

  /* ── Categories cache ── */
  var _categoriesCache = null;

  function getCategories() {
    var client = getClient();
    if (!client) return Promise.resolve([]);
    if (_categoriesCache) return Promise.resolve(_categoriesCache);
    return client.from('categories').select('id,name,slug,parent_id').order('name')
      .then(function(r) {
        _categoriesCache = r.error ? [] : (r.data || []);
        return _categoriesCache;
      });
  }

  /* Résout un slug (ex: "vetements") → liste de category_id
     Inclut les sous-catégories enfants */
  function resolveCategoryIds(slug) {
    if (!slug) return Promise.resolve(null);
    return getCategories().then(function(cats) {
      /* Trouver la catégorie parente */
      var parent = cats.find(function(c) { return c.slug === slug; });
      if (!parent) return null;

      /* Collecter id parent + tous enfants */
      var ids = [parent.id];
      cats.forEach(function(c) {
        if (c.parent_id === parent.id) ids.push(c.id);
      });
      return ids;
    });
  }

  /* ── Render cards ── */
  function renderArticles(data) {
    var container = document.getElementById('articles');
    var loading   = document.getElementById('articlesLoading');
    var empty     = document.getElementById('articlesEmpty');
    if (!container) return;

    if (loading) loading.style.display = 'none';

    /* Remove old cards (keep loading + empty paragraphs) */
    Array.from(container.querySelectorAll('.card')).forEach(function(c) { c.remove(); });

    if (!data || data.length === 0) {
      if (empty) empty.style.display = '';
      return;
    }
    if (empty) empty.style.display = 'none';

    data.forEach(function(a) {
      var img = (a.images && a.images.length > 0) ? a.images[0] : 'assets/placeholder.jpg';
      var card = document.createElement('div');
      card.className = 'card';
      card.style.position = 'relative';
      card.innerHTML =
        (a.etat ? '<div class="card-badge">' + a.etat + '</div>' : '') +
        '<img src="' + img + '" alt="' + escHtml(a.title) + '" loading="lazy">' +
        '<div class="card-body">' +
          '<h4>' + escHtml(a.title) + '</h4>' +
          (a.wilaya ? '<div class="card-desc">📍 ' + escHtml(a.wilaya) + (a.taille ? ' · ' + escHtml(a.taille) : '') + '</div>' : '') +
          '<div class="card-price"><span class="current-bid">' + formatPrice(a.price) + ' DZD</span></div>' +
          '<button class="buy-btn" data-id="' + a.id + '">Voir l\'article</button>' +
        '</div>';

      card.querySelector('.buy-btn').addEventListener('click', function() {
        window.location.href = 'pages/article.html?id=' + a.id;
      });
      container.appendChild(card);
    });
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatPrice(p) {
    if (p == null) return '—';
    return Number(p).toLocaleString('fr-DZ');
  }

  /* ── Load + filter ── */
  function loadAndRender(opts) {
    opts = opts || {};
    var client = getClient();
    if (!client) { renderArticles([]); return; }

    var loading = document.getElementById('articlesLoading');
    var empty   = document.getElementById('articlesEmpty');
    if (loading) loading.style.display = '';
    if (empty)   empty.style.display   = 'none';

    /* Resolve category slug → ids, then query */
    resolveCategoryIds(opts.category || '').then(function(catIds) {
      var q = client.from('articles')
        .select('id,title,description,price,etat,taille,wilaya,images,category_id,created_at,seller_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      /* ── Filtres Supabase ── */
      if (catIds && catIds.length > 0) q = q.in('category_id', catIds);

      /* Recherche texte sur le titre (insensible à la casse) */
      if (opts.search && opts.search.trim()) {
        q = q.ilike('title', '%' + opts.search.trim() + '%');
      }

      /* Wilaya (correspondance exacte, insensible à la casse) */
      if (opts.wilaya) q = q.ilike('wilaya', opts.wilaya);

      /* Taille */
      if (opts.size) q = q.ilike('taille', opts.size);

      /* État */
      if (opts.etat) q = q.ilike('etat', '%' + opts.etat + '%');

      /* Prix min / max */
      if (opts.priceMin && !isNaN(opts.priceMin)) q = q.gte('price', parseInt(opts.priceMin));
      if (opts.priceMax && !isNaN(opts.priceMax)) q = q.lte('price', parseInt(opts.priceMax));

      /* Limite */
      if (opts.limit) q = q.limit(opts.limit);

      return q;
    }).then(function(r) {
      if (r && r.error) { console.error('articles error:', r.error); renderArticles([]); return; }
      renderArticles(r ? (r.data || []) : []);
    }).catch(function(err) {
      console.error('loadAndRender error:', err);
      renderArticles([]);
    });
  }

  /* ── Public API ── */
  window.rewearArticles = {
    MAX_PHOTOS: 10,
    ALLOWED_FORMATS: 'JPEG, PNG ou WebP',
    MAX_SIZE_MB: 5,

    getCategories: function() { return getCategories(); },

    loadArticles: function(opts) {
      opts = opts || {};
      var client = getClient();
      if (!client) return Promise.resolve([]);
      var q = client.from('articles')
        .select('id,title,description,price,etat,taille,wilaya,images,category_id,created_at,seller_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (opts.category_id) q = q.eq('category_id', opts.category_id);
      if (opts.limit) q = q.limit(opts.limit);
      return q.then(function(r) { return r.error ? [] : (r.data || []); });
    },

    uploadImages: function(files) {
      var client = getClient();
      if (!client) return Promise.reject(new Error('Non connecté'));
      var userId = (function() {
        try { var u = localStorage.getItem('user'); return u ? JSON.parse(u).id : null; } catch(e) { return null; }
      })();
      if (!userId) return Promise.reject(new Error('Non connecté'));
      var validated = validateAndPrepareFiles(files);
      if (validated.error) return Promise.reject(new Error(validated.error));
      files = validated.files;
      if (files.length === 0) return Promise.reject(new Error('Ajoutez au moins une photo.'));
      if (files.length > this.MAX_PHOTOS) return Promise.reject(new Error('Maximum ' + this.MAX_PHOTOS + ' photos.'));

      var urls = [];
      var seq  = Promise.resolve();
      files.forEach(function(file) {
        seq = seq.then(function() {
          return compressImage(file).then(function(blob) {
            var name = userId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.jpg';
            return client.storage.from(BUCKET).upload(name, blob, { contentType: 'image/jpeg', upsert: false })
              .then(function(upload) {
                if (upload.error) throw upload.error;
                urls.push(client.storage.from(BUCKET).getPublicUrl(upload.data.path).data.publicUrl);
              });
          });
        });
      });
      return seq.then(function() { return urls; });
    },

    createArticle: function(data, imageUrls) {
      var client = getClient();
      if (!client) return Promise.reject(new Error('Non connecté'));
      var userId = (function() {
        try { var u = localStorage.getItem('user'); return u ? JSON.parse(u).id : null; } catch(e) { return null; }
      })();
      if (!userId) return Promise.reject(new Error('Non connecté'));
      if (!imageUrls || imageUrls.length === 0) return Promise.reject(new Error('Au moins une photo est obligatoire.'));

      return client.from('articles').insert({
        seller_id:   userId,
        category_id: data.category_id || null,
        title:       data.title,
        description: data.description || '',
        price:       parseInt(data.price, 10) || 0,
        etat:        data.etat || 'Bon état',
        taille:      data.taille || '',
        wilaya:      data.wilaya || '',
        images:      imageUrls
      }).select('id').single();
    }
  };

  /* ── Expose applyFilters pour index.html ── */
  window.applyFilters = function(opts) {
    loadAndRender(opts);
  };

  /* ── Chargement initial au DOMContentLoaded ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { loadAndRender(); });
  } else {
    loadAndRender();
  }

})();