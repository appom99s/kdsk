(function () {
  'use strict';
  var pending = 0, timer;
  function mount() {
    if (document.getElementById('kdLoading')) return;
    var panel = document.createElement('div'); panel.id = 'kdLoading'; panel.hidden = true;
    panel.setAttribute('role', 'status'); panel.setAttribute('aria-live', 'polite');
    var img = document.createElement('img'); img.src = '../shared/assets/logo.png'; img.alt = ''; img.width = 44; img.height = 44;
    var label = document.createElement('span'); label.id = 'kdLoadingLabel'; label.textContent = 'Chargement en cours…';
    panel.append(img, label); document.body.appendChild(panel);
  }
  window.KD_LOADING = {
    start: function () { mount(); if (++pending === 1) {
      document.getElementById('kdLoading').hidden = false;
      document.getElementById('kdLoadingLabel').textContent = 'Chargement en cours…';
      timer = setTimeout(function () { document.getElementById('kdLoadingLabel').textContent = 'Le serveur prend plus de temps que prévu. Vous pouvez rester sur cette page.'; }, 12000);
    } },
    end: function () { pending = Math.max(0, pending - 1); if (!pending) { clearTimeout(timer); var p = document.getElementById('kdLoading'); if (p) p.hidden = true; } }
  };
})();
