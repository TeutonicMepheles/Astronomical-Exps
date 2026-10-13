/* Preserve the 16:9 composition at every browser size. */
(function () {
  'use strict';
  function fit() {
    const scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    document.documentElement.style.setProperty('--stage-scale', String(scale));
  }
  window.addEventListener('resize', fit);
  fit();
})();
