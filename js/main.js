/* ============================================================
   RITS Landing — интерактив
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Шапка: тень при скролле ---------- */
  var header = $('#header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Мобильное меню ---------- */
  var burger = $('#burger');
  var nav = $('#nav');

  if (burger && nav) {
    var closeNav = function () {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    };

    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
    });

    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeNav); });

    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target) && !burger.contains(e.target)) closeNav();
    });
  }

  /* ---------- Появление блоков при скролле ---------- */
  var revealables = $$('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // лёгкая каскадная задержка внутри одной группы
        var siblings = $$('.reveal', el.parentNode);
        var idx = siblings.indexOf(el);
        el.style.transitionDelay = (idx > 0 ? Math.min(idx, 6) * 60 : 0) + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Счётчики в статистике ---------- */
  var counters = $$('.counter');
  var fmt = function (n) { return n.toLocaleString('ru-RU'); };

  var runCounter = function (el) {
    var to = parseInt(el.dataset.to, 10) || 0;
    var suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = fmt(to) + suffix; return; }

    var dur = 1400;
    var start = null;
    var tick = function (ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(to * eased)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        cio.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------- Схема экосистемы: линии от карточек к ядру ---------- */
  var orbit = $('.orbit');
  var links = orbit ? $('.orbit__links', orbit) : null;
  var NS = 'http://www.w3.org/2000/svg';

  var drawLinks = function () {
    if (!orbit || !links) return;

    // на узких экранах колонки складываются в столбик — линии не нужны
    if (window.getComputedStyle(links).display === 'none') return;

    var core = $('.orbit__core', orbit);
    var ob = orbit.getBoundingClientRect();
    var cb = core.getBoundingClientRect();
    if (!ob.width || !cb.width) return;

    // координаты считаем относительно .orbit, поэтому общий transform
    // блока (reveal-анимация) на результат не влияет
    var cx = cb.left - ob.left + cb.width / 2;
    var cy = cb.top - ob.top + cb.height / 2;
    var r = cb.width / 2 * 0.84; // линия обрывается у края светящегося ядра

    links.setAttribute('viewBox', '0 0 ' + ob.width + ' ' + ob.height);
    links.setAttribute('preserveAspectRatio', 'none');
    links.textContent = '';

    $$('.onode', orbit).forEach(function (node, i) {
      var nb = node.getBoundingClientRect();
      var fromRight = nb.left - ob.left + nb.width / 2 < cx;

      var sx = nb.left - ob.left + (fromRight ? nb.width : 0);
      var sy = nb.top - ob.top + nb.height / 2;

      // конец — точка на окружности ядра со стороны карточки
      var dx = sx - cx;
      var dy = sy - cy;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ex = cx + dx / len * r;
      var ey = cy + dy / len * r;

      var d = 'M' + sx + ' ' + sy +
              ' C' + (sx + (ex - sx) * 0.55) + ' ' + sy +
              ',' + (ex - (ex - sx) * 0.45) + ' ' + ey +
              ',' + ex + ' ' + ey;

      var base = document.createElementNS(NS, 'path');
      base.setAttribute('class', 'olink');
      base.setAttribute('d', d);
      links.appendChild(base);

      if (reduced) return;
      var flow = document.createElementNS(NS, 'path');
      flow.setAttribute('class', 'oflow');
      flow.setAttribute('d', d);
      flow.style.animationDelay = (i * 0.45).toFixed(2) + 's';
      links.appendChild(flow);
    });
  };

  if (orbit) {
    var redrawTimer;
    var scheduleRedraw = function () {
      clearTimeout(redrawTimer);
      redrawTimer = setTimeout(drawLinks, 120);
    };

    window.addEventListener('resize', scheduleRedraw);
    // шрифты меняют высоту карточек — пересчитываем после их загрузки
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLinks);
    if ('ResizeObserver' in window) new ResizeObserver(scheduleRedraw).observe(orbit);
    drawLinks();
  }

  /* ---------- Год в подвале ---------- */
  var yearHolder = $('.footer__bottom span');
  if (yearHolder) {
    yearHolder.textContent = '© 2019–' + new Date().getFullYear() + ' RITS. Все права защищены.';
  }

  /* ---------- Модальное окно ---------- */
  var modal = $('#modal');
  if (!modal) return;

  var modalBox = $('.modal__box', modal);
  var lastFocused = null;

  var openModal = function () {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var closeButton = $('.modal__close', modal);
    if (closeButton) closeButton.focus();
  };

  var closeModal = function () {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  };

  $$('.js-modal-open').forEach(function (btn) {
    btn.addEventListener('click', openModal);
  });

  $$('[data-close]', modal).forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;

    // ловушка фокуса внутри модалки
    var focusable = $$('button, iframe, a[href]', modalBox)
      .filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!focusable.length) return;

    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

})();
