/* Los Himnóticos · interacciones de la home (sin dependencias) */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  root.classList.add('js-ready');   // a partir de aquí el CSS puede ocultar lo que este script va a animar
  const $ = (s, r = doc) => r.querySelector(s);
  const $$ = (s, r = doc) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ------------------------------------------------------------------
     Estado compartido y un único bucle de animación
     ------------------------------------------------------------------ */
  const S = {
    mx: 0.5,            // puntero normalizado 0..1
    px: innerWidth / 2, // puntero en px
    py: innerHeight / 2,
    sv: 0,              // velocidad de scroll suavizada (px/ms)
    energy: 0           // 0..1, sube con cada rayo y decae sola
  };
  const subs = [];
  let lastT = performance.now();
  let lastY = scrollY;

  function frame(now) {
    const dt = clamp(now - lastT, 1, 50);
    lastT = now;
    const y = scrollY;
    S.sv = lerp(S.sv, (y - lastY) / dt, 0.14);
    lastY = y;
    if (Math.abs(S.sv) < 0.001) S.sv = 0;
    S.energy *= Math.pow(0.93, dt / 16.7);
    if (S.energy < 0.001) S.energy = 0;
    for (const fn of subs) fn(now, dt);
    requestAnimationFrame(frame);
  }

  addEventListener('pointermove', e => {
    S.px = e.clientX; S.py = e.clientY;
    S.mx = e.clientX / innerWidth;
  }, { passive: true });

  /* ------------------------------------------------------------------
     Campo de rayas del hero: las cinco rayas del logo, repetidas y en
     movimiento continuo a través de la silueta del rayo.
     Coordenadas tomadas del logo (caja de 900 x 900).
     ------------------------------------------------------------------ */
  function initField() {
    const cv = $('.hero__field');
    if (!cv) return { start() {} };
    const ctx = cv.getContext('2d');
    const STEP = 0.25;
    let W = 0, H = 0, flow = 0, lean = 0, visible = true;
    let alpha = RM ? 1 : 0, target = alpha;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      if (alpha < 0.004) return;
      const small = W < 760;
      const s = small ? H / 1020 : Math.max(H / 850, W / 1750);
      const ox = (small ? W * 0.58 : W * 0.7) - 450 * s;
      const oy = (H - 900 * s) / 2 - H * (small ? 0.1 : 0.02);
      const upx = 0.62 + lean * 0.09;
      const pulse = 1 + S.energy * 0.6;
      const phase = ((flow % STEP) + STEP) % STEP;
      const tipX = ox + (175 + lean * 30) * s;
      const tipY = oy + 1162 * s;

      ctx.lineJoin = 'miter';
      ctx.miterLimit = 8;
      ctx.lineCap = 'butt';
      ctx.globalCompositeOperation = 'lighter';

      for (let k = -13; k <= 19; k++) {
        const u = k * STEP + phase;
        const d = Math.abs(u - 0.5);
        const far = 1 - smooth(1.4, 4.4, d);
        if (far <= 0) continue;
        const win = 1 - smooth(0.5, 0.82, d);   // 1 dentro de la silueta del logo

        const Lx = 105 + u * 363, Ly = 570 - u * 235;
        const Rx = 435 + u * 310, Ry = 500 - u * 217;
        const Ty = -500, Tx = Lx + (Ly - Ty) * upx;
        const w = (1.3 + 1.7 * win + 9 * Math.exp(-Math.pow((u - 0.5) / 0.25, 2))) * s * pulse;
        const a = (0.13 + 0.87 * win) * far * alpha * (small ? 0.8 : 1);

        ctx.beginPath();
        ctx.moveTo(ox + Tx * s, oy + Ty * s);
        ctx.lineTo(ox + Lx * s, oy + Ly * s);
        ctx.lineTo(ox + Rx * s, oy + Ry * s);
        ctx.lineTo(tipX, tipY);

        if (win > 0.02) {
          ctx.strokeStyle = `rgba(242,110,38,${(a * 0.13 * win).toFixed(3)})`;
          ctx.lineWidth = w * 3.6 + 6;
          ctx.stroke();
        }
        const r = Math.round(lerp(196, 248, win));
        const g = Math.round(lerp(58, 116, win));
        const b = Math.round(lerp(26, 40, win));
        ctx.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
        ctx.lineWidth = w;
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    function resize() {
      const rect = cv.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = rect.width; H = rect.height;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cv);
    else addEventListener('resize', resize);
    resize();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
    }

    if (!RM) {
      subs.push((now, dt) => {
        if (!visible) return;
        flow += (0.07 + Math.min(1.4, Math.abs(S.sv) * 0.45) + S.energy * 0.8) * dt / 1000;
        lean = lerp(lean, (S.mx - 0.5) * 2, 0.045);
        alpha = lerp(alpha, target, 0.035);
        draw();
      });
    }
    return { start() { target = 1; } };
  }

  /* ------------------------------------------------------------------
     Título del hero: se parte en letras para la entrada y se ajusta
     para llenar el ancho disponible
     ------------------------------------------------------------------ */
  function initTitle() {
    const el = $('[data-title]');
    if (!el) return { fit() {} };
    const box = el.parentElement;
    const text = el.textContent.trim();
    el.textContent = '';
    Array.from(text).forEach((c, i) => {
      const s = doc.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      s.style.setProperty('--i', i);
      el.appendChild(s);
    });

    function fit() {
      box.style.fontSize = '100px';
      const natural = el.getBoundingClientRect().width;
      if (natural > 0) box.style.fontSize = (100 * box.clientWidth / natural * 0.995).toFixed(2) + 'px';
    }
    fit();

    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 120); });
    return { fit };
  }

  /* ------------------------------------------------------------------
     Rayos: un clic en cualquier parte descarga un rayo en ese punto
     ------------------------------------------------------------------ */
  function initStrike() {
    const cv = $('.strike');
    const flash = $('.flash');
    if (!cv || RM) return { hit() {} };
    const ctx = cv.getContext('2d');
    const bolts = [], sparks = [], rings = [];
    let W = 0, H = 0, lastHit = 0, dirty = false;

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    addEventListener('resize', resize);
    resize();

    // Desplazamiento del punto medio: de una recta a un trazo quebrado
    function jag(x1, y1, x2, y2, disp, iters) {
      let pts = [[x1, y1], [x2, y2]];
      for (let it = 0; it < iters; it++) {
        const out = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          out.push([
            (a[0] + b[0]) / 2 + (Math.random() - 0.5) * disp,
            (a[1] + b[1]) / 2 + (Math.random() - 0.5) * disp * 0.35
          ], b);
        }
        pts = out;
        disp *= 0.55;
      }
      return pts;
    }

    function hit(x, y) {
      const now = performance.now();
      if (now - lastHit < 340) return;   // nunca más de tres destellos por segundo
      lastHit = now;

      const sx = clamp(x + (Math.random() - 0.5) * W * 0.5, 0, W);
      const main = jag(sx, -30, x, y, Math.hypot(x - sx, y + 30) * 0.2, 6);
      const lines = [{ pts: main, w: 3.2 }];
      const branches = 2 + (Math.random() * 2 | 0);
      for (let i = 0; i < branches; i++) {
        const p = main[Math.floor(main.length * (0.2 + Math.random() * 0.55))];
        const ang = Math.PI / 2 + (Math.random() - 0.5) * 1.7;
        const len = 70 + Math.random() * 190;
        lines.push({ pts: jag(p[0], p[1], p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len, len * 0.3, 4), w: 1.4 });
      }
      bolts.push({ born: now, life: 480, lines });
      rings.push({ x, y, born: now, life: 560 });
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2, sp = 0.12 + Math.random() * 0.5;
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.22, born: now, life: 380 + Math.random() * 380 });
      }

      S.energy = 1;
      if (flash) {
        flash.style.setProperty('--fx', x + 'px');
        flash.style.setProperty('--fy', y + 'px');
        flash.classList.remove('go');
        void flash.offsetWidth;
        flash.classList.add('go');
      }
    }

    subs.push((now, dt) => {
      if (!bolts.length && !sparks.length && !rings.length) {
        if (dirty) { ctx.clearRect(0, 0, W, H); dirty = false; }
        return;
      }
      ctx.clearRect(0, 0, W, H);
      dirty = true;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        const t = (now - b.born) / b.life;
        if (t >= 1) { bolts.splice(i, 1); continue; }
        const a = Math.pow(1 - t, 1.5) * (t < 0.45 ? 0.6 + Math.random() * 0.4 : 1);
        for (const ln of b.lines) {
          ctx.beginPath();
          ctx.moveTo(ln.pts[0][0], ln.pts[0][1]);
          for (let j = 1; j < ln.pts.length; j++) ctx.lineTo(ln.pts[j][0], ln.pts[j][1]);
          ctx.shadowColor = 'rgba(242,110,38,.95)';
          ctx.shadowBlur = 26;
          ctx.strokeStyle = `rgba(255,128,48,${a.toFixed(3)})`;
          ctx.lineWidth = ln.w * 2.4;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgba(255,246,234,${a.toFixed(3)})`;
          ctx.lineWidth = ln.w * 0.85;
          ctx.stroke();
        }
      }

      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        const t = (now - r.born) / r.life;
        if (t >= 1) { rings.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - t, 3);
        ctx.beginPath();
        ctx.arc(r.x, r.y, 6 + e * 110, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(242,110,38,${((1 - t) * 0.8).toFixed(3)})`;
        ctx.lineWidth = 2.5 * (1 - t) + 0.5;
        ctx.stroke();
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        const t = (now - p.born) / p.life;
        if (t >= 1) { sparks.splice(i, 1); continue; }
        p.vy += 0.0012 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 28, p.y - p.vy * 28);
        ctx.strokeStyle = `rgba(255,170,90,${(1 - t).toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    });

    addEventListener('click', e => {
      if (e.detail === 0) return;                                  // clic de teclado
      if (e.target.closest('input, select, textarea, label')) return;
      hit(e.clientX, e.clientY);
    });

    return { hit };
  }

  /* ------------------------------------------------------------------
     Cintas: avance continuo; el scroll las acelera y las inclina
     ------------------------------------------------------------------ */
  function initMarquees() {
    $$('[data-marquee]').forEach(track => {
      const dir = parseFloat(track.dataset.marquee) < 0 ? -1 : 1;
      const speed = parseFloat(track.dataset.speed) || 60;
      const set = track.innerHTML;
      let copies = 1;
      let unit = track.scrollWidth;
      if (!unit) return;
      while (unit * copies < innerWidth * 1.2 + unit && copies < 24) {
        track.insertAdjacentHTML('beforeend', set);
        copies++;
      }
      const measure = () => { unit = track.scrollWidth / copies; };
      measure();
      addEventListener('resize', measure);

      let x = dir < 0 ? 0 : -unit;
      track.style.transform = `translate3d(${x}px,0,0)`;
      if (RM) return;
      subs.push((now, dt) => {
        x += dir * (speed / 1000 + Math.abs(S.sv) * 0.5) * dt;
        if (x <= -unit) x += unit;
        if (x > 0) x -= unit;
        const skew = clamp(S.sv * -7 * dir, -14, 14);
        track.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${skew.toFixed(2)}deg)`;
      });
    });
  }

  /* ------------------------------------------------------------------
     Manifiesto: las palabras se encienden con el scroll
     ------------------------------------------------------------------ */
  function initScrollText() {
    $$('[data-scrolltext]').forEach(el => {
      const words = [];
      const walk = node => {
        Array.from(node.childNodes).forEach(n => {
          if (n.nodeType === 3) {
            const frag = doc.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(tok => {
              if (!tok) return;
              if (/^\s+$/.test(tok)) { frag.appendChild(doc.createTextNode(' ')); return; }
              const s = doc.createElement('span');
              s.className = 'w';
              s.textContent = tok;
              frag.appendChild(s);
              words.push(s);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1) {
            walk(n);
          }
        });
      };
      walk(el);

      if (RM) { words.forEach(w => w.classList.add('on')); return; }
      let lit = -1;
      subs.push(() => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) return;
        const p = clamp((innerHeight * 0.88 - r.top) / (r.height + innerHeight * 0.38), 0, 1);
        const count = Math.round(p * words.length);
        if (count === lit) return;
        lit = count;
        for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', i < count);
      });
    });
  }

  /* ------------------------------------------------------------------
     Apariciones al entrar en pantalla
     ------------------------------------------------------------------ */
  function initReveal() {
    const els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window) || RM) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(e => io.observe(e));
  }

  /* ------------------------------------------------------------------
     Botones magnéticos y foco de luz que sigue al puntero
     ------------------------------------------------------------------ */
  function initMagnetic() {
    if (!FINE || RM) return;
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(dx * 0.28).toFixed(1)}px,${(dy * 0.38).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  function initSpot() {
    const spot = $('.spot');
    if (!spot || !FINE || RM) return;
    let x = S.px, y = S.py, on = false;
    addEventListener('pointermove', () => { if (!on) { on = true; spot.classList.add('on'); } }, { passive: true });
    doc.addEventListener('pointerleave', () => { on = false; spot.classList.remove('on'); });
    subs.push(() => {
      x = lerp(x, S.px, 0.12);
      y = lerp(y, S.py, 0.12);
      spot.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    });
  }

  /* ------------------------------------------------------------------
     Cabecera, pie y textos ajustados al ancho
     ------------------------------------------------------------------ */
  function initHeader() {
    const top = $('.top');
    if (!top) return;
    const upd = () => top.classList.toggle('is-stuck', scrollY > 40);
    addEventListener('scroll', upd, { passive: true });
    upd();
  }

  function initFit() {
    const els = $$('[data-fit]');
    const fit = () => els.forEach(el => {
      const box = el.parentElement;
      const cs = getComputedStyle(box);
      const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      box.style.fontSize = '100px';
      const natural = el.getBoundingClientRect().width;
      if (natural > 0) box.style.fontSize = (100 * avail / natural * 0.995).toFixed(2) + 'px';
    });
    fit();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(fit, 120); });
  }

  /* ------------------------------------------------------------------
     Bolos -> formulario: elegir un formato lo deja marcado en el form
     ------------------------------------------------------------------ */
  function initRows() {
    const form = $('#booking');
    if (!form) return;
    $$('.row[data-event]').forEach(a => {
      a.addEventListener('click', () => {
        form.elements.evento.value = a.dataset.event;
        const first = form.elements.nombre;
        if (first) setTimeout(() => first.focus({ preventScroll: true }), 900);
      });
    });
  }

  /* ------------------------------------------------------------------
     Formulario de contratación
     ------------------------------------------------------------------ */
  function initForm(strike) {
    const form = $('#booking');
    if (!form) return;
    const status = $('.booking__status', form);
    const done = $('.booking-done');
    const btn = $('button[type="submit"]', form);
    const say = (msg, state) => { status.textContent = msg; status.dataset.state = state || ''; };

    // Fecha mínima: hoy (en hora local)
    const date = form.elements.fecha;
    if (date) {
      const d = new Date();
      date.min = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // Los huecos crecen con el texto donde el navegador no lo hace solo
    if (!(window.CSS && CSS.supports('field-sizing', 'content'))) {
      $$('.blank input:not([type="date"])', form).forEach(inp => {
        const base = inp.placeholder.length + 1;
        const size = () => { inp.style.width = Math.max(base, inp.value.length + 1) + 'ch'; };
        inp.addEventListener('input', size);
        size();
      });
    }

    form.setAttribute('novalidate', '');
    form.addEventListener('input', () => { if (status.dataset.state === 'error') say(''); });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      form.classList.add('was-validated');

      if (!form.checkValidity()) {
        const bad = form.querySelector(':invalid');
        if (bad) bad.focus();
        say('Nos falta algo: tu nombre, el tipo de evento y un correo válido.', 'error');
        return;
      }
      if (form.elements._gotcha.value) return;   // trampa antispam

      const action = form.getAttribute('action') || '';
      if (/REEMPLAZAR/.test(action)) {
        say('El formulario todavía no está conectado. Escríbenos por Instagram: @himnoticos', 'error');
        return;
      }

      btn.disabled = true;
      form.classList.add('is-sending');
      say('Enviando…');
      try {
        const res = await fetch(action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.hidden = true;
        done.hidden = false;
        done.focus({ preventScroll: true });
        const r = done.getBoundingClientRect();
        strike.hit(r.left + Math.min(r.width, 600) / 2, r.top + r.height / 2);
      } catch (err) {
        say('No se ha podido enviar. Inténtalo de nuevo o escríbenos por Instagram: @himnoticos', 'error');
        btn.disabled = false;
      } finally {
        form.classList.remove('is-sending');
      }
    });
  }

  /* ------------------------------------------------------------------
     Intro: el rayo se dibuja, la pantalla se parte y aparece la home
     ------------------------------------------------------------------ */
  function runLoader(done) {
    const loader = $('.loader');
    const finish = () => { root.classList.add('is-in'); done(); };
    if (!loader || RM) { if (loader) loader.remove(); finish(); return; }

    const wait = ms => new Promise(r => setTimeout(r, ms));
    const fonts = doc.fonts && doc.fonts.ready ? Promise.race([doc.fonts.ready, wait(2500)]) : Promise.resolve();
    Promise.all([wait(1250), fonts]).then(() => {
      loader.classList.add('crack');
      return wait(300);
    }).then(() => {
      loader.classList.add('open');
      finish();
      return wait(1100);
    }).then(() => loader.remove());
  }

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  const field = initField();
  const title = initTitle();
  const strike = initStrike();
  initScrollText();
  initReveal();
  initMagnetic();
  initSpot();
  initHeader();
  initRows();
  initForm(strike);
  $$('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });

  const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    title.fit();
    initFit();
    initMarquees();
  });

  runLoader(() => {
    field.start();
    if (!RM) {
      setTimeout(() => {
        const small = innerWidth < 760;
        strike.hit(innerWidth * (small ? 0.62 : 0.72), innerHeight * (small ? 0.36 : 0.42));
      }, 1150);
    }
  });

  requestAnimationFrame(frame);
})();
