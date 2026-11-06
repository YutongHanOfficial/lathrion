// Lathrion: clock, menu, scroll reveals, label scramble, doctrine focus and the hero object.
// No dependencies. Everything here is an enhancement: the page reads fine without it.
(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasIO = 'IntersectionObserver' in window;

  // ---------------------------------------------------------------- UTC clock and year

  const clocks = document.querySelectorAll('[data-clock]');
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const d = new Date();
    const s = `UTC ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    clocks.forEach((el) => { el.textContent = s; });
  };
  if (clocks.length) {
    tick();
    setTimeout(() => { tick(); setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));
  }
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  // ---------------------------------------------------------------- nav: scrolled state, menu, current section

  const nav = document.querySelector('[data-nav]');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.getElementById('menu');
  const setMenu = (open) => {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav__toggle-label').textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    if (open) menu.scrollTop = 0;
    root.classList.toggle('menu-open', open);
  };
  if (toggle && menu) {
    toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  // ---------------------------------------------------------------- plain addresses for sections
  // Sections live at /holdings, /doctrine, /name and /contact (no #). GitHub Pages serves each of those
  // from a copy of index.html (tools/routes.mjs), and this script scrolls to the matching section.

  const SECTIONS = { holdings: 'Holdings', doctrine: 'Doctrine', name: 'The name', contact: 'Contact' };
  const home = location.pathname.replace(/[^/]*$/, ''); // the folder the site lives in, usually "/"
  const sectionOf = (path) => {
    if (path.slice(0, home.length) !== home) return null;
    const rest = path.slice(home.length).replace(/\.html$/, '').replace(/\/+$/, '');
    return Object.prototype.hasOwnProperty.call(SECTIONS, rest) ? rest : null;
  };
  const isHome = (path) => path === home || path === `${home}index.html`;
  const onePage = Boolean(document.getElementById('holdings'));

  // Smooth unless the visitor prefers reduced motion; an instant jump has to switch off the CSS smooth scroll.
  const scrollToTarget = (target, smooth) => {
    if (smooth && !reduceMotion.matches) {
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const before = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    if (target) target.scrollIntoView({ block: 'start' });
    else window.scrollTo(0, 0);
    root.style.scrollBehavior = before;
  };
  const show = (id, smooth = true) => {
    scrollToTarget(id ? document.getElementById(id) : null, smooth);
    document.title = id ? `${SECTIONS[id]} · Lathrion` : 'Lathrion';
  };

  if (onePage) {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    // Old links such as /#name become /name.
    const legacy = location.hash.slice(1);
    if (Object.prototype.hasOwnProperty.call(SECTIONS, legacy)) history.replaceState(null, '', home + legacy);
    const initial = sectionOf(location.pathname);
    if (initial) {
      show(initial, false);
      // Web fonts can shift the layout after the first jump; settle again if the visitor hasn't scrolled since.
      const landed = window.scrollY;
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { if (Math.abs(window.scrollY - landed) < 2) show(initial, false); });
      }
    }
    window.addEventListener('popstate', () => show(sectionOf(location.pathname), true));
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self')) return;
    const raw = a.getAttribute('href');
    if (raw.charAt(0) === '#') { // in-page targets such as the skip link: move there without touching the address
      const target = document.getElementById(raw.slice(1));
      if (!target) return;
      e.preventDefault();
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      scrollToTarget(target, true);
      return;
    }
    if (!onePage) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const id = sectionOf(url.pathname);
    if (!id && !isHome(url.pathname)) return;
    e.preventDefault();
    const path = id ? home + id : home;
    if (path !== location.pathname) history.pushState(null, '', path + url.search);
    show(id, true);
  });

  const links = [...document.querySelectorAll('.nav__links a')];
  if (links.length && hasIO) {
    const byId = new Map(links.map((a) => [sectionOf(new URL(a.href, location.href).pathname), a]).filter(([id]) => id));
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) seen.add(e.target.id); else seen.delete(e.target.id); });
      const current = [...byId.keys()].filter((id) => seen.has(id)).pop();
      links.forEach((a) => a.classList.toggle('is-current', a === byId.get(current)));
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // ---------------------------------------------------------------- reveals and label scramble

  const GLYPHS = 'ΛΔΞΣΦΨΩ/\\<>#=+01';
  const prepScramble = (el) => {
    const text = el.textContent;
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    shown.textContent = text;
    el.replaceChildren(sr, shown);
    return { text, shown };
  };
  const scramble = ({ text, shown }) => {
    const start = performance.now();
    const dur = 320 + text.length * 34;
    const frame = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const settled = Math.floor(p * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        out += i < settled || ch === ' ' || ch === '[' || ch === ']' ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      shown.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const reveals = document.querySelectorAll('[data-reveal], [data-scramble]');
  if (hasIO && !reduceMotion.matches) {
    const jobs = new Map();
    document.querySelectorAll('[data-scramble]').forEach((el) => jobs.set(el, prepScramble(el)));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        if (jobs.has(e.target)) scramble(jobs.get(e.target));
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  // ---------------------------------------------------------------- doctrine: the tenet in the middle of the screen is lit

  const tenets = document.querySelector('[data-tenets]');
  if (tenets) {
    const items = [...tenets.children];
    let queued = false;
    const focus = () => {
      queued = false;
      const mid = window.innerHeight * 0.5;
      let best = null;
      let bestDist = Infinity;
      items.forEach((li) => {
        const r = li.getBoundingClientRect();
        const dist = mid < r.top ? r.top - mid : mid > r.bottom ? mid - r.bottom : 0;
        if (dist < bestDist) { bestDist = dist; best = li; }
      });
      items.forEach((li) => li.classList.toggle('is-active', li === best));
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(focus); } };
    focus();
    tenets.classList.add('is-tracking');
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
  }

  // ---------------------------------------------------------------- hero object

  const canvas = document.querySelector('[data-pyramid]');
  if (canvas && canvas.getContext) pyramid(canvas);

  function pyramid(canvas) {
    const ctx = canvas.getContext('2d');
    const hero = canvas.closest('.hero') || document.body;
    const outAz = document.querySelector('[data-readout="az"]');
    const outLift = document.querySelector('[data-readout="lift"]');

    const BONE = '236, 232, 225';
    const EMBER = '255, 75, 38';

    // Square base of half-width 1 on y = 0. The sides rise at the brand slope (1.92, about 62.5 degrees).
    const APEX = 1.92;
    const CUT = 0.66; // the capstone is the top third
    const cutY = APEX * CUT;
    const k = 1 - CUT; // half-width at the cut
    const GAP = 0.15;
    const MID = 1.0; // the height the camera looks at

    const FRUSTUM_FACES = [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]];
    const CAP_FACES = [[0, 1, 2, 3], [1, 0, 4], [2, 1, 4], [3, 2, 4], [0, 3, 4]];
    const edgesOf = (faces) => {
      const map = new Map();
      faces.forEach((f, fi) => f.forEach((a, i) => {
        const b = f[(i + 1) % f.length];
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (!map.has(key)) map.set(key, { a: Math.min(a, b), b: Math.max(a, b), faces: [] });
        map.get(key).faces.push(fi);
      }));
      return [...map.values()];
    };
    const FRUSTUM_EDGES = edgesOf(FRUSTUM_FACES);
    const CAP_EDGES = edgesOf(CAP_FACES);
    const COURSES = 9; // stone courses drawn on the sides of the base

    // ground: a field of points, denser near the object
    const ground = [];
    for (let x = -4.5; x <= 4.51; x += 0.3) {
      for (let z = -4.5; z <= 4.51; z += 0.3) {
        const r = Math.hypot(x, z);
        if (r > 4.6 || (Math.abs(x) < 1.08 && Math.abs(z) < 1.08)) continue;
        ground.push([x, 0, z, r]);
      }
    }

    let W = 0, H = 0, dpr = 1, unit = 1, cx = 0, cy = 0;
    const D = 6.4; // camera distance

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      unit = Math.min(W, H) * (W < 520 ? 0.255 : 0.285); // a little smaller on phones, clear of the corner labels
      cx = W / 2;
      cy = H * 0.57;
    };

    const state = { az: -0.62, tilt: 0.34, px: 0, py: 0, tx: 0, ty: 0, lift: 0, t: 0 };

    const view = (az, tilt) => {
      const ca = Math.cos(az), sa = Math.sin(az), ct = Math.cos(tilt), st = Math.sin(tilt);
      return ([x, y, z]) => {
        const yy = y - MID;
        const x1 = x * ca + z * sa;
        const z1 = -x * sa + z * ca;
        return [x1, yy * ct - z1 * st, yy * st + z1 * ct];
      };
    };
    const project = ([x, y, z]) => {
      const s = (unit * D) / (z + D);
      return [cx + x * s, cy - y * s];
    };
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const centroid = (pts) => pts.reduce((c, p) => [c[0] + p[0] / pts.length, c[1] + p[1] / pts.length, c[2] + p[2] / pts.length], [0, 0, 0]);
    const LIGHT = (() => { const l = [-0.55, 0.75, -0.4]; const n = Math.hypot(...l); return l.map((v) => v / n); })();

    // faces in camera space with outward normals, front-facing flags and shading
    const faceInfo = (verts, faces) => {
      const c = centroid(verts);
      return faces.map((f) => {
        const p = f.map((i) => verts[i]);
        let n = cross(sub(p[1], p[0]), sub(p[2], p[0]));
        const fc = centroid(p);
        if (dot(n, sub(fc, c)) < 0) n = n.map((v) => -v);
        const len = Math.hypot(...n) || 1;
        n = n.map((v) => v / len);
        const front = dot(n, [fc[0], fc[1], fc[2] + D]) < 0;
        return { idx: f, p, n, front, light: Math.max(0, dot(n, LIGHT)) };
      });
    };

    const path = (pts2d) => {
      ctx.beginPath();
      pts2d.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    };

    const draw = () => {
      const az = state.az + state.px * 0.45;
      const tilt = state.tilt + state.py * 0.1;
      const gap = GAP + state.lift;
      const V = view(az, tilt);

      const frustumW = [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1], [-k, cutY, -k], [k, cutY, -k], [k, cutY, k], [-k, cutY, k]];
      const capW = [[-k, cutY + gap, -k], [k, cutY + gap, -k], [k, cutY + gap, k], [-k, cutY + gap, k], [0, APEX + gap, 0]];
      const fr = frustumW.map(V);
      const cp = capW.map(V);
      const fr2 = fr.map(project);
      const cp2 = cp.map(project);
      const frFaces = faceInfo(fr, FRUSTUM_FACES);
      const cpFaces = faceInfo(cp, CAP_FACES);

      ctx.clearRect(0, 0, W, H);

      // ground points
      for (const [x, y, z, r] of ground) {
        const p = V([x, y, z]);
        const s = project(p);
        const fade = Math.max(0, 1 - r / 4.6);
        const depth = Math.max(0.25, Math.min(1, 1 - p[2] / 7));
        ctx.fillStyle = `rgba(${BONE}, ${(0.05 + fade * 0.32) * depth})`;
        const size = 1.1 * depth;
        ctx.fillRect(s[0] - size / 2, s[1] - size / 2, size, size);
      }

      // ember light pooled on the ground around the base
      const g0 = project(V([0, 0, 0]));
      const pool = ctx.createRadialGradient(g0[0], g0[1], 0, g0[0], g0[1], unit * 2.2);
      pool.addColorStop(0, `rgba(${EMBER}, ${0.07 + state.lift * 0.1})`);
      pool.addColorStop(1, `rgba(${EMBER}, 0)`);
      ctx.save();
      ctx.translate(g0[0], g0[1]);
      ctx.scale(1, 0.38);
      ctx.translate(-g0[0], -g0[1]);
      ctx.fillStyle = pool;
      ctx.fillRect(g0[0] - unit * 2.4, g0[1] - unit * 2.4, unit * 4.8, unit * 4.8);
      ctx.restore();

      // the base, then the light leaking out of the cut, then the capstone above it
      const shade = (f) => {
        const v = 9 + f.light * 18;
        return `rgb(${v | 0}, ${(v + 1) | 0}, ${(v + 3) | 0})`;
      };
      frFaces.forEach((f, i) => {
        if (!f.front) return;
        path(f.idx.map((j) => fr2[j]));
        if (i === 1) { // the cut face glows
          const a = fr2[f.idx[0]], b = fr2[f.idx[2]];
          const grad = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
          grad.addColorStop(0, `rgba(${EMBER}, 0.95)`);
          grad.addColorStop(1, 'rgba(255, 150, 110, 0.95)');
          ctx.fillStyle = grad;
        } else {
          ctx.fillStyle = shade(f);
        }
        ctx.fill();
      });

      // stone courses on the visible sides of the base
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${BONE}, 0.07)`;
      frFaces.forEach((f, i) => {
        if (i < 2 || !f.front) return;
        const [a, b, c, d] = f.idx; // a, d on the ground; b, c at the cut
        for (let s = 1; s < COURSES; s++) {
          const t = s / COURSES;
          const lerp = (p, q) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
          const p1 = project(lerp(fr[a], fr[b]));
          const p2 = project(lerp(fr[d], fr[c]));
          ctx.beginPath();
          ctx.moveTo(p1[0], p1[1]);
          ctx.lineTo(p2[0], p2[1]);
          ctx.stroke();
        }
      });

      // edges: hidden ones dashed, like a technical drawing; the cut in ember
      const drawEdges = (edges, faces, pts2, isCut) => {
        edges.forEach((e) => {
          const visible = e.faces.some((fi) => faces[fi].front);
          const cut = isCut(e);
          ctx.beginPath();
          ctx.moveTo(pts2[e.a][0], pts2[e.a][1]);
          ctx.lineTo(pts2[e.b][0], pts2[e.b][1]);
          if (visible) {
            ctx.setLineDash([]);
            ctx.strokeStyle = cut ? `rgba(${EMBER}, 0.95)` : `rgba(${BONE}, 0.78)`;
          } else {
            ctx.setLineDash([2, 4]);
            ctx.strokeStyle = cut ? `rgba(${EMBER}, 0.3)` : `rgba(${BONE}, 0.14)`;
          }
          ctx.stroke();
        });
        ctx.setLineDash([]);
      };
      drawEdges(FRUSTUM_EDGES, frFaces, fr2, (e) => e.a >= 4 && e.b >= 4);

      // the capstone covers whatever of the base is behind it
      cpFaces.forEach((f) => {
        if (!f.front) return;
        path(f.idx.map((j) => cp2[j]));
        ctx.fillStyle = shade(f);
        ctx.fill();
      });

      // light leaking out of the cut
      const g = project(V([0, cutY + gap / 2, 0]));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(g[0], g[1], 0, g[0], g[1], unit * 1.3);
      const intensity = 0.3 + Math.min(1, state.lift * 2.2) * 0.35;
      glow.addColorStop(0, `rgba(${EMBER}, ${intensity})`);
      glow.addColorStop(0.35, `rgba(${EMBER}, ${intensity * 0.28})`);
      glow.addColorStop(1, `rgba(${EMBER}, 0)`);
      ctx.translate(g[0], g[1]);
      ctx.scale(1, 0.42);
      ctx.translate(-g[0], -g[1]);
      ctx.fillStyle = glow;
      ctx.fillRect(g[0] - unit * 1.4, g[1] - unit * 1.4, unit * 2.8, unit * 2.8);
      ctx.restore();

      drawEdges(CAP_EDGES, cpFaces, cp2, (e) => e.a < 4 && e.b < 4);

      // apex marker
      const apex = cp2[4];
      ctx.strokeStyle = `rgba(${BONE}, 0.35)`;
      ctx.beginPath();
      ctx.moveTo(apex[0], apex[1] - 10);
      ctx.lineTo(apex[0], apex[1] - 22);
      ctx.stroke();

      return { az, gap };
    };

    let last = 0;
    let lastReadout = 0;
    let running = false;
    let visible = true;
    let raf = 0;

    const readout = (az, lift) => {
      const deg = ((((az * 180) / Math.PI) % 360) + 360) % 360;
      if (outAz) outAz.textContent = `Az ${deg.toFixed(1).padStart(5, '0')}°`;
      if (outLift) outLift.textContent = `${W < 520 ? 'Sep.' : 'Separation'} +${lift.toFixed(3)}`;
    };

    const scrollLift = () => {
      const r = hero.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.8)));
      return p * 0.55;
    };

    const frame = (now) => {
      raf = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      state.t += dt;
      state.az += dt * ((Math.PI * 2) / 52);
      state.px += (state.tx - state.px) * 0.05;
      state.py += (state.ty - state.py) * 0.05;
      const targetLift = scrollLift() + 0.025 * Math.sin(state.t * 1.1);
      state.lift += (targetLift - state.lift) * 0.08;
      const { az } = draw();
      if (now - lastReadout > 120) { readout(az, GAP + state.lift); lastReadout = now; }
      if (running) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduceMotion.matches || !visible || document.hidden) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const still = () => {
      const { az } = draw();
      readout(az, GAP + state.lift);
    };

    resize();
    still();

    if ('ResizeObserver' in window) {
      new ResizeObserver(() => { resize(); if (!running) still(); }).observe(canvas);
    } else {
      window.addEventListener('resize', () => { resize(); if (!running) still(); });
    }

    if (hasIO) {
      new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) start(); else stop();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    reduceMotion.addEventListener('change', () => { if (reduceMotion.matches) { stop(); still(); } else start(); });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      state.tx = e.clientX / window.innerWidth - 0.5;
      state.ty = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    start();
  }
})();
