/* Loader controller (runs before React). React calls window.__fujiReady() when the
   app, fonts and first hero assets are ready; the loader is capped at 4.5 s. */
(function () {
  document.documentElement.classList.add('has-js');
  var el = document.getElementById('boot-loader');
  if (!el) return;
  var count = el.querySelector('.bl-count');
  var bar = el.querySelector('.bl-bar i');
  var msg = el.querySelector('.bl-msg');
  var messages = ['Sharpening the knives', 'Rolling the maki', 'Warming the dashi'];
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var start = performance.now();
  var MIN = reduced ? 0 : 1100;
  var CAP = 4500;
  var shown = 0;
  var target = 0;
  var ready = false;
  var finished = false;

  function pad(n) {
    n = Math.round(n);
    return (n < 10 ? '00' : n < 100 ? '0' : '') + n;
  }
  function paint() {
    count.textContent = pad(shown);
    bar.style.transform = 'scaleX(' + shown / 100 + ')';
    msg.textContent = messages[Math.min(2, Math.floor(shown / 34))];
  }
  function open() {
    if (finished) return;
    finished = true;
    el.classList.add('is-open');
    document.documentElement.classList.remove('is-loading');
    window.dispatchEvent(new Event('fuji:loaded'));
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1100);
  }
  function tick(now) {
    var t = now - start;
    // creep towards 90 while waiting, then run to 100 once ready
    target = ready && t >= MIN ? 100 : Math.min(90, (t / (MIN || 1)) * 90);
    if (t >= CAP) target = 100;
    shown += (target - shown) * (reduced ? 1 : 0.14);
    if (target === 100 && shown > 99.4) shown = 100;
    paint();
    if (shown >= 100) {
      setTimeout(open, reduced ? 0 : 220);
      return;
    }
    requestAnimationFrame(tick);
  }
  window.__fujiReady = function () {
    ready = true;
  };
  document.documentElement.classList.add('is-loading');
  requestAnimationFrame(tick);
})();
