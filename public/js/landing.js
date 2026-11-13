/* =====================================================================
   Skyward landing page
   GSAP + ScrollTrigger + SplitText + Lenis scroll experience, a three.js
   globe, live database stats and the accessibility / control features.
   Vendored globals: gsap, ScrollTrigger, SplitText, Lenis, THREE.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var MOTION_KEY = 'skyward-motion';
  var mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqSmall = window.matchMedia('(max-width: 899px)');
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var hasSplit = !!window.SplitText;

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (hasSplit) gsap.registerPlugin(SplitText);
  }

  /* ------------------------------------------------------------------
     Motion preference (HCI rule 7: internal locus of control).
     Stored as 'on' / 'off' in localStorage; the dashboard reads the same key.
     With no stored choice we follow the OS "reduce motion" setting.
     ------------------------------------------------------------------ */
  function readMotionPref() {
    try { return localStorage.getItem(MOTION_KEY); } catch (e) { return null; }
  }
  function writeMotionPref(value) {
    try { localStorage.setItem(MOTION_KEY, value); } catch (e) { /* storage blocked: keep in memory only */ }
  }
  var memoryPref = null;
  function motionAllowed() {
    var p = readMotionPref() || memoryPref;
    if (p === 'off') return false;
    if (p === 'on') return true;
    return !mqReduce.matches; // prefers-reduced-motion => off by default
  }

  /* ------------------------------------------------------------------
     Preloader: fades out on load, never later than 1.2s.
     ------------------------------------------------------------------ */
  var preloader = document.querySelector('.preloader');
  function hidePreloader() {
    if (!preloader || preloader.classList.contains('is-done')) return;
    preloader.classList.add('is-done');
    setTimeout(function () { if (preloader && preloader.parentNode) preloader.parentNode.removeChild(preloader); }, 500);
  }
  setTimeout(hidePreloader, motionAllowed() ? 1200 : 200);
  window.addEventListener('load', function () {
    setTimeout(hidePreloader, 150);
    if (hasGsap) ScrollTrigger.refresh();
  });

  /* ------------------------------------------------------------------
     Scroll engine: build / tear down every scroll animation.
     'full'   = desktop with motion on: Lenis + pinned, scrubbed timelines.
     'static' = phone, reduced motion or Motion: off: plain scroll, final states.
     ------------------------------------------------------------------ */
  var header = document.querySelector('.site-header');
  var ctx = null;
  var lenis = null;
  var lenisTick = null;
  var split = null;
  var mode = null;

  function teardown() {
    if (lenis) {
      gsap.ticker.remove(lenisTick);
      lenis.destroy();
      lenis = null;
      lenisTick = null;
    }
    if (ctx) { ctx.revert(); ctx = null; }
    if (split) { try { split.revert(); } catch (e) { /* already reverted */ } split = null; }
  }

  function startLenis() {
    if (!window.Lenis) return;
    lenis = new Lenis({ lerp: 0.05, autoRaf: false, anchors: false });
    lenis.on('scroll', ScrollTrigger.update);
    lenisTick = function (time) { lenis && lenis.raf(time * 1000); };
    gsap.ticker.add(lenisTick);
    gsap.ticker.lagSmoothing(0);
  }

  function buildHeaderTheme() {
    // Swap header colour while it sits over a cream section (keeps nav legible everywhere).
    var active = {};
    var lightSections = document.querySelectorAll('[data-header-light]');
    lightSections.forEach(function (el, i) {
      ScrollTrigger.create({
        trigger: el,
        start: 'top 40px',
        end: 'bottom 40px',
        onToggle: function (self) {
          active[i] = self.isActive;
          var any = Object.keys(active).some(function (k) { return active[k]; });
          header.classList.toggle('is-light', any);
        }
      });
    });
  }

  function buildFull() {
    /* ---- Hero: window zoom + 3D text fly-away (pinned, scrubbed) ---- */
    var heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '.hero-section',
        start: 'top top',
        end: 'bottom top',
        endTrigger: '.anchor-about',
        scrub: 1,
        pin: true,
        pinSpacing: false,
        anticipatePin: 1
      }
    });
    heroTl
      .fromTo('[data-gsap-hero-image-container]', { scale: 1.3 }, { scale: 6, ease: 'none' })
      .fromTo('.hero-text-container', { x: 0, z: 0 }, { x: -500, z: 2000, ease: 'none' }, '<');

    /* ---- Sky parallax ---- */
    gsap.timeline({
      scrollTrigger: {
        trigger: '[data-gsap-cloud-bg]',
        start: 'top top',
        end: 'top center',
        endTrigger: '[data-about-parallax]',
        scrub: 1
      }
    })
      .fromTo('[data-gsap-cloud-bg]', { y: '0vh' }, { y: '-20vh', ease: 'none' })
      .fromTo('.sky-about', { y: '0vh' }, { y: '-20vh', ease: 'none' }, '<');

    /* ---- About: container drift, char-by-char reveal, blur reveal ---- */
    gsap.fromTo('.about-text-container', { yPercent: 100 }, {
      yPercent: 50,
      ease: 'none',
      scrollTrigger: { trigger: '.about-text-container', start: 'top bottom', end: 'bottom center', scrub: 1 }
    });

    if (hasSplit) {
      split = SplitText.create('.about-text', { type: 'words, chars' });
      gsap.set(split.chars, { opacity: 0.2 });
      gsap.fromTo(split.chars, { opacity: 0.2 }, {
        opacity: 1,
        ease: 'power3.out',
        stagger: 0.05,
        scrollTrigger: { trigger: '.about-text', start: 'top 80%', end: 'bottom 90%', scrub: 1, invalidateOnRefresh: true }
      });
    }

    gsap.fromTo('[data-about-blur-reveal]', { filter: 'blur(100px)' }, {
      filter: 'blur(0px)',
      duration: 1.2,
      scrollTrigger: { trigger: '.about-text-container', start: 'top 60%', end: 'bottom center' }
    });

    /* ---- Flight: jet scales down, mask wipes jet -> blueprint, titles slide ---- */
    var flightTl = gsap.timeline({
      scrollTrigger: { trigger: '.jet-image', start: 'top center', endTrigger: '.jet-scroll-area', end: 'bottom bottom', scrub: 2 }
    });
    flightTl.to('.jet-image', { scale: 0.6, ease: 'none', duration: 10 });
    flightTl.to('.jet-image > img', { maskSize: '100% 0%', webkitMaskSize: '100% 0%', ease: 'none', duration: 8 }, 9);
    flightTl.to('.jet-blueprint', { maskSize: '100% 100%', webkitMaskSize: '100% 100%', ease: 'none', duration: 8 }, 9);
    flightTl.to('.jet-title', { y: '100vh', ease: 'none', duration: 10 }, 0);
    flightTl.to('.jet-description', { y: '100vh', ease: 'none', duration: 10 }, 0);
    flightTl.fromTo('.jet-light-bg', { opacity: 0 }, { opacity: 1, ease: 'none', duration: 4 }, 0);

    /* ---- Features: image + text parallax ---- */
    var featTrigger = { trigger: '.features-section', start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo('[data-features-image]', { y: '-15%' }, { y: '15%', ease: 'none', scrollTrigger: featTrigger });
    gsap.fromTo('.features-text', { y: '5%' }, { y: '-5%', ease: 'none', scrollTrigger: Object.assign({}, featTrigger) });

    /* ---- Footer: outline SKYWARD parallax ---- */
    gsap.fromTo('[data-global-text]', { y: '50%' }, {
      y: '-50%',
      ease: 'none',
      scrollTrigger: { trigger: '.footer-section', start: 'top bottom', end: 'bottom top', scrub: 1 }
    });
  }

  function applyMode() {
    var allowed = motionAllowed();
    var full = allowed && !mqSmall.matches && hasGsap;
    root.classList.toggle('motion-off', !allowed);
    root.classList.toggle('is-static', !full);
    updateMotionToggle(allowed);
    cityTicker.setAnimated(allowed);
    globe.setAnimated(allowed);

    if (!hasGsap) return;
    var next = full ? 'full' : 'static';
    var y = window.scrollY;
    var docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var ratio = y / docH;
    if (next === mode) return;
    var firstRun = mode === null;
    teardown();
    mode = next;
    ctx = gsap.context(function () {
      if (full) buildFull();
      buildHeaderTheme();
    });
    if (full) startLenis();
    ScrollTrigger.refresh();
    if (!firstRun) {
      // Keep the visitor at roughly the same place when the layout switches.
      var newH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(0, Math.round(ratio * newH));
      if (lenis) lenis.scrollTo(Math.round(ratio * newH), { immediate: true });
      ScrollTrigger.update();
    }
  }

  /* ------------------------------------------------------------------
     Motion toggle button in the header
     ------------------------------------------------------------------ */
  var motionBtn = document.getElementById('motionToggle');
  function updateMotionToggle(allowed) {
    if (!motionBtn) return;
    motionBtn.setAttribute('aria-pressed', allowed ? 'true' : 'false');
    motionBtn.querySelector('.motion-toggle__label').textContent = 'Motion: ' + (allowed ? 'on' : 'off');
    motionBtn.title = allowed
      ? 'Animations are on. Click to turn off smooth scrolling and scroll animations.'
      : 'Animations are off. Click to turn smooth scrolling and scroll animations back on.';
  }
  if (motionBtn) {
    motionBtn.addEventListener('click', function () {
      var next = motionAllowed() ? 'off' : 'on';
      memoryPref = next;
      writeMotionPref(next);
      applyMode();
      announce(next === 'on' ? 'Motion turned on.' : 'Motion turned off. Scroll animations are paused.');
    });
  }

  // Polite screen-reader announcements
  var liveRegion = document.createElement('div');
  liveRegion.className = 'visually-hidden';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  document.body.appendChild(liveRegion);
  function announce(msg) {
    liveRegion.textContent = '';
    setTimeout(function () { liveRegion.textContent = msg; }, 50);
  }

  /* ------------------------------------------------------------------
     In-page navigation (works with and without Lenis) + focus handling
     ------------------------------------------------------------------ */
  document.addEventListener('click', function (e) {
    var link = e.target.closest && e.target.closest('a[data-scroll]');
    if (!link) return;
    var hash = link.getAttribute('href');
    if (!hash || hash.charAt(0) !== '#') return;
    var target = hash === '#top' ? null : document.querySelector(hash);
    e.preventDefault();
    var offset = 0;
    if (target && target.id === 'about' && mode === 'full') offset = window.innerHeight * 0.9;
    if (lenis) {
      lenis.scrollTo(target || 0, { offset: offset, duration: 1.6 });
    } else if (target) {
      var top = target.getBoundingClientRect().top + window.scrollY + offset - (mqSmall.matches ? 56 : 0);
      window.scrollTo({ top: top, behavior: motionAllowed() ? 'smooth' : 'auto' });
    } else {
      window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
    }
    var focusEl = target || document.getElementById('main');
    if (focusEl) {
      if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
      focusEl.focus({ preventScroll: true });
    }
    if (history.replaceState) history.replaceState(null, '', hash === '#top' ? location.pathname : hash);
  });

  /* ------------------------------------------------------------------
     Keyboard shortcut: D opens the dashboard (HCI rule 2: shortcuts for experts)
     ------------------------------------------------------------------ */
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key !== 'd' && e.key !== 'D') return;
    var t = e.target;
    var tag = t && t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
    e.preventDefault();
    window.location.href = '/app.html#/dashboard';
  });

  /* ------------------------------------------------------------------
     Features accordion (keyboard accessible, one panel open at a time)
     ------------------------------------------------------------------ */
  var accItems = Array.prototype.slice.call(document.querySelectorAll('.acc-item'));
  var featureImgs = Array.prototype.slice.call(document.querySelectorAll('.feature-img'));
  var activeFeature = 0;
  function setFeature(index, moveFocus) {
    activeFeature = index;
    accItems.forEach(function (item, i) {
      var open = i === index;
      var btn = item.querySelector('.acc-trigger');
      var panel = item.querySelector('.acc-panel');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
      if (open && moveFocus) btn.focus();
    });
    featureImgs.forEach(function (img, i) { img.classList.toggle('is-active', i === index); });
  }
  var hoverTimer = null;
  accItems.forEach(function (item, i) {
    var btn = item.querySelector('.acc-trigger');
    btn.addEventListener('click', function () { setFeature(i, false); });
    // Hover preview (mouse only, with a short intent delay so passing over doesn't flicker)
    item.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { setFeature(i, false); }, 120);
    });
    item.addEventListener('pointerleave', function () { clearTimeout(hoverTimer); });
    btn.addEventListener('keydown', function (e) {
      var n = accItems.length;
      var to = null;
      if (e.key === 'ArrowDown') to = (i + 1) % n;
      else if (e.key === 'ArrowUp') to = (i - 1 + n) % n;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = n - 1;
      if (to === null) return;
      e.preventDefault();
      accItems[to].querySelector('.acc-trigger').focus();
    });
  });

  /* ------------------------------------------------------------------
     Local time clock
     ------------------------------------------------------------------ */
  var clock = document.getElementById('localTime');
  function tickClock() {
    if (!clock) return;
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    clock.textContent = hh + ':' + mm;
    clock.setAttribute('datetime', now.toISOString());
  }
  tickClock();
  setInterval(tickClock, 1000 * 15);

  /* ------------------------------------------------------------------
     Live database stats from /api/dashboard, with static fallbacks
     (HCI rule 3: informative feedback about the connection)
     ------------------------------------------------------------------ */
  function loadLiveStats() {
    var cells = document.getElementById('specCells');
    var status = document.getElementById('specStatus');
    if (!cells || !status) return;
    var statusText = status.querySelector('.spec-status__text');
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 5000);
    var nf = new Intl.NumberFormat('en-IN');
    var money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

    fetch('/api/dashboard', { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (data) {
        clearTimeout(timer);
        var k = data && data.kpi;
        if (!k) throw new Error('No KPI block');
        var occ = k.occupancy == null ? null : Number(k.occupancy);
        var rows = [
          ['Flights', nf.format(Number(k.flights) || 0)],
          ['Passengers', nf.format(Number(k.passengers) || 0)],
          ['Active bookings', nf.format(Number(k.activeBookings) || 0)],
          ['Occupancy', occ == null || isNaN(occ) ? 'n/a' : occ.toFixed(1) + '%'],
          ['Revenue', money.format(Number(k.collected) || Number(k.bookedRevenue) || 0)],
          ['Tables', '8']
        ];
        cells.innerHTML = rows.map(function (r) {
          return '<div class="spec-cell"><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
        }).join('');
        var t = new Date();
        status.classList.remove('is-offline');
        status.classList.add('is-live');
        statusText.textContent = 'Live from MySQL · ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      })
      .catch(function () {
        clearTimeout(timer);
        // Keep the static schema facts already in the markup.
        status.classList.remove('is-live');
        status.classList.add('is-offline');
        statusText.textContent = 'Database offline · showing schema facts';
      });
  }
  loadLiveStats();

  /* ------------------------------------------------------------------
     Footer: vertical rolling city list (airports used by the database)
     ------------------------------------------------------------------ */
  var cityTicker = (function () {
    var cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Dubai', 'London', 'Singapore', 'Tokyo', 'New York',
      'Paris', 'Goa', 'Sydney', 'Kolkata'];
    var list = document.getElementById('cityList');
    var tl = null;
    var animated = true;
    if (list) {
      var html = '';
      for (var r = 0; r < 3; r++) {
        cities.forEach(function (c) {
          // Only the middle copy is read by screen readers.
          html += '<li' + (r === 1 ? '' : ' aria-hidden="true"') + '>' + c + '</li>';
        });
      }
      list.innerHTML = html;
    }

    function build() {
      if (!list || !hasGsap) return;
      if (tl) { tl.kill(); tl = null; }
      var items = list.children;
      var itemH = items[0].offsetHeight;
      if (!itemH) return;
      var n = cities.length;
      var containerH = list.parentElement.offsetHeight;
      var center = (containerH - itemH) / 2;
      var start = n;
      gsap.set(list, { y: center - start * itemH });
      Array.prototype.forEach.call(items, function (el) { el.classList.remove('is-current'); });
      gsap.set(items, { opacity: 0.2, scale: 0.9, color: '#fff8ed' });
      gsap.set(items[start], { opacity: 1, scale: 1.1, color: '#ffffff' });
      if (!animated) return;
      tl = gsap.timeline({ repeat: -1 });
      for (var i = 0; i < n; i++) {
        var cur = start + i;
        var nxt = start + i + 1;
        tl.to(list, { y: center - nxt * itemH, duration: 1.5, ease: 'power2.inOut' })
          .to(items[cur], { opacity: 0.2, scale: 0.9, duration: 1.5, ease: 'power2.inOut' }, '<')
          .to(items[nxt], { opacity: 1, scale: 1.1, duration: 1.5, ease: 'power2.inOut' }, '<')
          .to({}, { duration: 1 });
      }
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);

    return {
      setAnimated: function (on) {
        var changed = on !== animated;
        animated = on;
        if (changed || !tl) build();
      }
    };
  })();

  /* ------------------------------------------------------------------
     Footer globe (three.js): textured earth + pulsing route-arrow sphere,
     auto-rotates, drag to rotate, pauses off-screen.
     ------------------------------------------------------------------ */
  var globe = (function () {
    var host = document.getElementById('globe');
    var animated = true;
    var started = false;
    var visible = false;
    var running = false;
    var renderer, scene, camera, group, arrow, clockStart;
    var rotY = 0, rotX = 0.15, velY = 0, velX = 0;
    var dragging = false, lastX = 0, lastY = 0;
    var lastT = 0;

    function makeArrowTexture(done) {
      // The SVG uses 100% width/height, so give it a fixed size before rasterising.
      fetch('img/landing/earth-arrow.svg')
        .then(function (r) { return r.text(); })
        .then(function (svg) {
          svg = svg.replace(/width="100%"/, 'width="1024"').replace(/height="100%"/, 'height="1024"');
          var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
          var img = new Image();
          img.onload = function () {
            var c = document.createElement('canvas');
            c.width = 1024; c.height = 1024;
            c.getContext('2d').drawImage(img, 0, 0, 1024, 1024);
            URL.revokeObjectURL(url);
            var tex = new THREE.CanvasTexture(c);
            tex.colorSpace = THREE.SRGBColorSpace;
            done(tex);
          };
          img.onerror = function () { URL.revokeObjectURL(url); };
          img.src = url;
        })
        .catch(function () { /* the earth still renders without the arrows */ });
    }

    function init() {
      if (started || !host || !window.THREE) return;
      started = true;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch (e) {
        host.classList.add('no-webgl');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      host.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-hidden', 'true');

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.set(0, 0, 6.5);

      scene.add(new THREE.AmbientLight(0xffffff, 2));
      var p1 = new THREE.PointLight(0xffffff, 3, 0, 0); p1.position.set(-5, 5, 5); scene.add(p1);
      var p2 = new THREE.PointLight(0xffffff, 1.5, 0, 0); p2.position.set(5, -5, -5); scene.add(p2);

      group = new THREE.Group();
      scene.add(group);

      var earthTex = new THREE.TextureLoader().load('img/landing/earth-rotation.webp', function () { requestFrame(); });
      earthTex.colorSpace = THREE.SRGBColorSpace;
      var earth = new THREE.Mesh(
        new THREE.SphereGeometry(1.8, 64, 64),
        new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.4, metalness: 0.3, emissive: 0x222222, color: 0xffffff })
      );
      group.add(earth);

      makeArrowTexture(function (tex) {
        arrow = new THREE.Mesh(
          new THREE.SphereGeometry(1.85, 64, 64),
          new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
        );
        arrow.scale.setScalar(1.02);
        group.add(arrow);
        requestFrame();
      });

      clockStart = performance.now();
      resize();
      if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
      else window.addEventListener('resize', resize);

      // Drag to rotate (pointer events: mouse, pen and touch)
      host.addEventListener('pointerdown', function (e) {
        dragging = true; lastX = e.clientX; lastY = e.clientY; velX = velY = 0;
        host.classList.add('is-dragging');
        if (host.setPointerCapture) host.setPointerCapture(e.pointerId);
        loop();
      });
      host.addEventListener('pointermove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - lastX, dy = e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        velY = dx * 0.005; velX = dy * 0.005;
        rotY += velY;
        rotX = Math.max(-0.6, Math.min(0.6, rotX + velX));
        requestFrame();
      });
      function endDrag() { dragging = false; host.classList.remove('is-dragging'); }
      host.addEventListener('pointerup', endDrag);
      host.addEventListener('pointercancel', endDrag);
      host.addEventListener('lostpointercapture', endDrag);

      loop();
    }

    function resize() {
      if (!renderer) return;
      var w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      requestFrame();
    }

    function render(now) {
      var dt = Math.min(0.05, (now - (lastT || now)) / 1000);
      lastT = now;
      if (!dragging) {
        // inertia after a drag, then the gentle auto-rotate
        velY *= 0.95; velX *= 0.95;
        rotY += velY;
        rotX = Math.max(-0.6, Math.min(0.6, rotX + velX));
        if (animated) rotY += 0.157 * dt;
      }
      group.rotation.y = rotY;
      group.rotation.x = rotX;
      if (arrow) {
        if (animated) {
          var t = (now - clockStart) / 1000;
          var spike = Math.random() > 0.97 ? 0.15 : 0;
          var jump = 1.02 + Math.abs(Math.sin(t * 4)) * 0.05 + spike;
          var s = arrow.scale.x + (jump - arrow.scale.x) * 0.1;
          arrow.scale.setScalar(s);
          arrow.rotation.z = Math.sin(t * 3) * 0.1;
        } else {
          arrow.scale.setScalar(1.02);
          arrow.rotation.z = 0;
        }
      }
      renderer.render(scene, camera);
    }

    function needsLoop() {
      return visible && !document.hidden && (animated || dragging || Math.abs(velY) > 0.0005 || Math.abs(velX) > 0.0005);
    }
    function loop() {
      if (running || !renderer) return;
      running = true;
      lastT = 0;
      requestAnimationFrame(function step(now) {
        render(now);
        if (needsLoop()) requestAnimationFrame(step);
        else running = false;
      });
    }
    function requestFrame() {
      if (!renderer || running) return;
      requestAnimationFrame(function (now) { if (!running) render(now); });
    }

    if (host && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) { init(); loop(); }
      }, { rootMargin: '300px 0px' }).observe(host);
    } else if (host) {
      visible = true;
      window.addEventListener('load', init);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) loop(); });

    return {
      setAnimated: function (on) { animated = on; if (on) loop(); else requestFrame(); }
    };
  })();

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  if ('scrollRestoration' in history && !location.hash) {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }
  applyMode();

  function onMediaChange() { applyMode(); }
  if (mqReduce.addEventListener) {
    mqReduce.addEventListener('change', onMediaChange);
    mqSmall.addEventListener('change', onMediaChange);
  } else if (mqReduce.addListener) {
    mqReduce.addListener(onMediaChange);
    mqSmall.addListener(onMediaChange);
  }

  if (document.fonts && document.fonts.ready && hasGsap) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
