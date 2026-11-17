// Live slide deck for the `tour` shortcode: each slide tells the embedded
// prototype which step to show (postMessage), and the stage supports
// zoom (double-click, +/−, pinch, wheel in fullscreen) and pan (drag).
(() => {
  const W = 1440, H = 900, MAX = 4;

  document.querySelectorAll('figure.tour').forEach((root) => {
    if (root.dataset.tourInit) return; // the script tag is emitted once per deck
    root.dataset.tourInit = '1';
    const slides = [...root.querySelectorAll('.tour-slide')];
    const vp = root.querySelector('.tour-viewport');
    const canvas = root.querySelector('.tour-canvas');
    const frame = root.querySelector('iframe');
    const glass = root.querySelector('.tour-glass');
    const dots = root.querySelector('.tour-dots');
    const count = root.querySelector('.tour-count');
    const zoomLabel = root.querySelector('.tour-zoom');
    const btn = (a) => root.querySelector(`[data-act="${a}"]`);
    let i = 0, ready = false, z = 1, tx = 0, ty = 0;

    slides.forEach((_, k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-label', String(k + 1)); b.onclick = () => go(k);
      dots.appendChild(b);
    });

    // ----- zoom / pan -------------------------------------------------------
    const base = () => Math.min(vp.clientWidth / W, vp.clientHeight / H);
    function apply() {
      const s = base() * z, w = W * s, h = H * s, vw = vp.clientWidth, vh = vp.clientHeight;
      tx = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, tx));
      ty = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, ty));
      canvas.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
      zoomLabel.textContent = `${Math.round(z * 100)}%`;
      root.classList.toggle('zoomed', z > 1);
    }
    function zoomAt(f, cx = vp.clientWidth / 2, cy = vp.clientHeight / 2) {
      const s0 = base() * z;
      z = Math.min(MAX, Math.max(1, z * f));
      const s1 = base() * z;
      tx = cx - (cx - tx) * (s1 / s0);
      ty = cy - (cy - ty) * (s1 / s0);
      apply();
    }
    const resetZoom = () => { z = 1; apply(); };
    const local = (e) => { const r = vp.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

    // Pointer: one finger/mouse pans when zoomed (or swipes slides at 100%), two fingers pinch.
    const pts = new Map();
    let start = null, pinch = null;
    glass.addEventListener('pointerdown', (e) => {
      glass.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, local(e));
      if (pts.size === 1) start = { p: local(e), tx, ty };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z }; }
    });
    glass.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, local(e));
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        zoomAt((pinch.z * d / pinch.d) / z, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      } else if (start && z > 1) {
        const [x, y] = local(e);
        tx = start.tx + x - start.p[0]; ty = start.ty + y - start.p[1]; apply();
      }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      if (pts.size === 1 && start && z === 1 && e.type === 'pointerup') {
        const dx = local(e)[0] - start.p[0];
        if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
      }
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (!pts.size) start = null;
    };
    glass.addEventListener('pointerup', end);
    glass.addEventListener('pointercancel', end);
    glass.addEventListener('dblclick', (e) => { const [x, y] = local(e); zoomAt(z > 1 ? 1 / z : 2.5, x, y); });
    vp.addEventListener('wheel', (e) => {
      if (!document.fullscreenElement && !e.ctrlKey) return; // keep normal page scrolling
      e.preventDefault();
      const [x, y] = local(e);
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, x, y);
    }, { passive: false });
    new ResizeObserver(apply).observe(vp);

    // ----- slides -----------------------------------------------------------
    function send() {
      if (ready && slides[i].dataset.step) frame.contentWindow.postMessage({ tour: 'step', id: slides[i].dataset.step }, '*');
    }
    function go(k) {
      i = (k + slides.length) % slides.length;
      slides.forEach((s, n) => { s.hidden = n !== i; });
      [...dots.children].forEach((d, n) => d.classList.toggle('active', n === i));
      count.textContent = `${i + 1} / ${slides.length}`;
      resetZoom();
      send();
    }
    addEventListener('message', (e) => {
      if (e.source !== frame.contentWindow || e.data?.tour !== 'ready') return;
      ready = true; root.classList.add('ready'); send();
    });

    // Load the prototype only when the deck comes near the viewport.
    new IntersectionObserver((entries, io) => {
      if (entries.some((x) => x.isIntersecting)) { frame.src = root.dataset.src; io.disconnect(); }
    }, { rootMargin: '300px' }).observe(root);

    // ----- controls ---------------------------------------------------------
    btn('prev').onclick = () => go(i - 1);
    btn('next').onclick = () => go(i + 1);
    btn('in').onclick = () => zoomAt(1.4);
    btn('out').onclick = () => zoomAt(1 / 1.4);
    btn('reset').onclick = resetZoom;
    btn('free').onclick = () => {
      const on = root.classList.toggle('free');
      btn('free').setAttribute('aria-pressed', String(on));
      if (!on) send(); // back to the slide's scripted state
    };
    btn('full').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.());
    document.addEventListener('fullscreenchange', () => requestAnimationFrame(apply));
    root.addEventListener('keydown', (e) => {
      if (e.target.closest('a, button') && (e.key === 'Enter' || e.key === ' ')) return;
      const k = { ArrowLeft: () => go(i - 1), ArrowRight: () => go(i + 1), '+': () => zoomAt(1.4), '=': () => zoomAt(1.4),
                  '-': () => zoomAt(1 / 1.4), 0: resetZoom, f: () => btn('full').click() }[e.key];
      if (k) { e.preventDefault(); k(); }
    });

    go(0);
  });
})();
