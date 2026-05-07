/**
 * REWEAR DZ - Articles & Storage
 * Formats autorisés : JPEG, PNG, WebP. Taille max : 5 Mo par image.
 * Compression côté client avant upload.
 */
(function() {
  var SUPABASE_URL = 'https://eviqzvrwjxmhwsylswqi.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aXF6dnJ3anhtaHdzeWxzd3FpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0Mzk3ODAsImV4cCI6MjA4OTAxNTc4MH0.8N-e6_OHRseAZ9PvAjDV7vspJsj2qDHk6bjLfz21BZ0';
  var BUCKET = 'article-images';
  var MAX_FILE_SIZE = 5 * 1024 * 1024;
  var ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var MAX_IMAGE_PIXELS = 1920 * 1920;
  var QUALITY = 0.85;

  function getClient() {
    if (typeof supabase !== 'undefined' && window.supabaseClient) return window.supabaseClient;
    if (typeof supabase !== 'undefined') {
      window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return window.supabaseClient;
    }
    return null;
  }

  function isAllowedType(type) {
    return ALLOWED_TYPES.indexOf(type) !== -1;
  }

  function compressImage(file) {
    return new Promise(function(resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function() {
        URL.revokeObjectURL(url);
        var w = img.width;
        var h = img.height;
        if (w * h > MAX_IMAGE_PIXELS) {
          var r = Math.sqrt(MAX_IMAGE_PIXELS / (w * h));
          w = Math.floor(w * r);
          h = Math.floor(h * r);
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(function(blob) {
          if (blob) resolve(blob);
          else reject(new Error('Compression échouée'));
        }, 'image/jpeg', QUALITY);
      };
      img.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('Image invalide'));
      };
      img.src = url;
    });
  }

  function validateAndPrepareFiles(files) {
    var out = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!isAllowedType(f.type)) {
        return { error: 'Format non autorisé. Utilisez JPEG, PNG ou WebP.' };
      }
      if (f.size > MAX_FILE_SIZE) {
        return { error: 'Chaque image doit faire moins de 5 Mo. "' + f.name + '" est trop lourd.' };
      }
      out.push(f);
    }
    return { files: out };
  }

  window.rewearArticles = {
    MAX_PHOTOS: 10,
    ALLOWED_FORMATS: 'JPEG, PNG ou WebP',
    MAX_SIZE_MB: 5,

    getCategories: function() {
      var client = getClient();
      if (!client) return Promise.resolve([]);
      return client.from('categories').select('id,name,slug').order('name').then(function(r) {
        if (r.error) return [];
        return r.data || [];
      });
    },

    loadArticles: function(opts) {
      opts = opts || {};
      var client = getClient();
      if (!client) return Promise.resolve([]);
      var q = client.from('articles').select('id,title,description,price,etat,taille,wilaya,images,category_id,created_at,seller_id').eq('is_active', true).order('created_at', { ascending: false });
      if (opts.category_id) q = q.eq('category_id', opts.category_id);
      if (opts.limit) q = q.limit(opts.limit);
      return q.then(function(r) {
        if (r.error) return [];
        return r.data || [];
      });
    },

    uploadImages: function(files) {
      var client = getClient();
      if (!client) return Promise.reject(new Error('Non connecté'));
      var userId = (function() {
        try {
          var u = localStorage.getItem('user');
          return u ? JSON.parse(u).id : null;
        } catch (e) { return null; }
      })();
      if (!userId) return Promise.reject(new Error('Non connecté'));
      var validated = validateAndPrepareFiles(files);
      if (validated.error) return Promise.reject(new Error(validated.error));
      files = validated.files;
      if (files.length === 0) return Promise.reject(new Error('Ajoutez au moins une photo.'));
      if (files.length > this.MAX_PHOTOS) return Promise.reject(new Error('Maximum ' + this.MAX_PHOTOS + ' photos.'));

      var self = this;
      var urls = [];
      var seq = Promise.resolve();
      files.forEach(function(file) {
        seq = seq.then(function() {
          return compressImage(file).then(function(blob) {
            var ext = 'jpg';
            var name = userId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.' + ext;
            return client.storage.from(BUCKET).upload(name, blob, { contentType: 'image/jpeg', upsert: false }).then(function(upload) {
              if (upload.error) throw upload.error;
              var publicUrl = client.storage.from(BUCKET).getPublicUrl(upload.data.path).data.publicUrl;
              urls.push(publicUrl);
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
        try {
          var u = localStorage.getItem('user');
          return u ? JSON.parse(u).id : null;
        } catch (e) { return null; }
      })();
      if (!userId) return Promise.reject(new Error('Non connecté'));
      if (!imageUrls || imageUrls.length === 0) return Promise.reject(new Error('Au moins une photo est obligatoire.'));

      return client.from('articles').insert({
        seller_id: userId,
        category_id: data.category_id || null,
        title: data.title,
        description: data.description || '',
        price: parseInt(data.price, 10) || 0,
        etat: data.etat || 'Bon état',
        taille: data.taille || '',
        wilaya: data.wilaya || '',
        images: imageUrls
      }).select('id').single();
    }
  };
})();
