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
    energy: 0,          // 0..1, sube con cada rayo y decae sola
    now: performance.now()   // reloj del último fotograma: el único que usan las animaciones
  };
  const subs = [];
  const broken = new Set();
  let lastT = performance.now();
  let lastY = scrollY;

  function frame(now) {
    requestAnimationFrame(frame);   // lo primero: pase lo que pase, el bucle sigue
    const dt = clamp(now - lastT, 1, 50);
    lastT = now;
    S.now = now;
    const y = scrollY;
    S.sv = lerp(S.sv, (y - lastY) / dt, 0.14);
    lastY = y;
    if (Math.abs(S.sv) < 0.001) S.sv = 0;
    S.energy *= Math.pow(0.93, dt / 16.7);
    if (S.energy < 0.001) S.energy = 0;
    for (const fn of subs) {
      // un fallo en una animación no debe parar las demás; se avisa una sola vez
      try { fn(now, dt); } catch (err) {
        if (!broken.has(fn)) { broken.add(fn); console.error(err); }
      }
    }
  }

  addEventListener('pointermove', e => {
    S.px = e.clientX; S.py = e.clientY;
    S.mx = e.clientX / innerWidth;
  }, { passive: true });

  /* ------------------------------------------------------------------
     El rayo: las cinco rayas del logo (caja de 900 x 900), repetidas y
     en movimiento continuo a través de su silueta. La intro y el fondo
     del hero lo dibujan con la misma función, para pasar de una a otro
     sin corte.
     ------------------------------------------------------------------ */
  const STEP = 0.25;
  const ease3 = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // Dónde cae la caja del logo dentro de un lienzo de W x H
  function heroMap(W, H) {
    const small = W < 760;
    const s = small ? H / 1020 : Math.max(H / 850, W / 1750);
    return { s, ox: (small ? W * 0.58 : W * 0.7) - 450 * s, oy: (H - 900 * s) / 2 - H * (small ? 0.1 : 0.02) };
  }
  function introMap(W, H) {
    const s = Math.min(H / 900, W / 620);   // centrado y a toda pantalla
    return { s, ox: W / 2 - 425 * s, oy: (H - 900 * s) / 2 - H * 0.04 };
  }

  // Traza una polilínea hasta la fracción p de su longitud
  function tracePath(ctx, pts, p) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    if (p >= 1) {
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      return;
    }
    const len = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      len.push(l);
      total += l;
    }
    let rem = total * p;
    for (let i = 0; i < len.length; i++) {
      const a = pts[i], b = pts[i + 1];
      if (rem >= len[i]) { ctx.lineTo(b[0], b[1]); rem -= len[i]; continue; }
      const f = rem / len[i];
      ctx.lineTo(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
      break;
    }
  }

  /* o: s, ox, oy  posición y escala de la caja del logo
        lean       inclinación hacia el puntero (-1..1)
        flow       avance de las rayas
        far        0..1, cuánto se ve el campo de rayas fuera del logo
        dim        atenuación general
        heat       0..1, al rojo blanco (recién caído el rayo)
        prog       opcional: fracción dibujada de cada raya, por índice */
  function drawBolt(ctx, dpr, o) {
    const { s, ox, oy } = o;
    const upx = 0.62 + o.lean * 0.09;
    const pulse = 1 + S.energy * 0.6;
    const phase = ((o.flow % STEP) + STEP) % STEP;
    const tip = [ox + (175 + o.lean * 30) * s, oy + 1162 * s];
    const heat = o.heat || 0;

    ctx.lineJoin = 'miter';
    ctx.miterLimit = 8;
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'lighter';

    for (let k = -13; k <= 19; k++) {
      const u = k * STEP + phase;
      const d = Math.abs(u - 0.5);
      const fade = 1 - smooth(1.4, 4.4, d);
      if (fade <= 0) continue;
      const win = 1 - smooth(0.5, 0.82, d);   // 1 dentro de la silueta del logo
      const vis = lerp(o.far, 1, win);
      const prog = o.prog ? o.prog(k) : 1;
      if (vis < 0.004 || prog <= 0) continue;

      const Lx = 105 + u * 363, Ly = 570 - u * 235;
      const Rx = 435 + u * 310, Ry = 500 - u * 217;
      const up = Math.max(60, Ly + (oy + 60) / s);   // sube hasta salir por arriba del lienzo
      const pts = [
        [ox + (Lx + up * upx) * s, oy + (Ly - up) * s],
        [ox + Lx * s, oy + Ly * s],
        [ox + Rx * s, oy + Ry * s],
        tip
      ];
      const w = (1.3 + 1.7 * win + 9 * Math.exp(-Math.pow((u - 0.5) / 0.25, 2))) * s * pulse;
      const a = (0.13 + 0.87 * win) * fade * vis * o.dim;

      tracePath(ctx, pts, prog);
      if (win > 0.02) {
        ctx.strokeStyle = `rgba(242,110,38,${Math.min(1, a * 0.13 * win * (1 + heat * 2.5)).toFixed(3)})`;
        ctx.lineWidth = w * 3.6 + 6;
        ctx.stroke();
      }
      const hot = heat * win;
      const r = Math.round(lerp(lerp(196, 248, win), 255, hot));
      const g = Math.round(lerp(lerp(58, 116, win), 232, hot));
      const b = Math.round(lerp(lerp(26, 40, win), 205, hot));
      if (hot > 0.03) {
        ctx.shadowColor = `rgba(255,120,40,${Math.min(1, hot).toFixed(2)})`;
        ctx.shadowBlur = 34 * hot * dpr;
      }
      ctx.strokeStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`;
      ctx.lineWidth = w;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* Fondo del hero */
  function initField() {
    const cv = $('.hero__field');
    if (!cv) return { show() {}, takeover() {} };
    const ctx = cv.getContext('2d');
    const MOVE = 1300;                                  // ms que tarda en ir de la intro a su sitio
    let W = 0, H = 0, dpr = 1, visible = true, shown = false;
    let flow = 0, lean = 0, mix = 1, moveT0 = 0;        // mix: 0 = posición de la intro, 1 = la del hero

    function draw() {
      ctx.clearRect(0, 0, W, H);
      if (!shown) return;
      const hero = heroMap(W, H);
      let m = hero, far = 1, dim = W < 760 ? 0.8 : 1;
      if (mix < 1) {
        const from = introMap(W, innerHeight), e = ease3(mix);
        m = { s: lerp(from.s, hero.s, e), ox: lerp(from.ox, hero.ox, e), oy: lerp(from.oy, hero.oy, e) };
        far = mix;
        dim = lerp(1, dim, e);
      }
      drawBolt(ctx, dpr, { s: m.s, ox: m.ox, oy: m.oy, lean, flow, far, dim, heat: 0 });
    }

    function resize() {
      const rect = cv.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
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
        if (!visible || !shown) return;
        if (mix < 1) mix = Math.min(1, (now - moveT0) / MOVE);
        const speed = 0.07 + Math.min(1.4, Math.abs(S.sv) * 0.45) + S.energy * 0.8;
        flow += speed * mix * mix * dt / 1000;
        lean = lerp(lean, (S.mx - 0.5) * 2 * mix, 0.045);
        draw();
      });
    }

    return {
      // sin intro: directamente en su sitio
      show() { shown = true; mix = 1; draw(); },
      // releva a la intro en su misma posición y se desliza hasta la del hero
      takeover(now) { shown = true; mix = 0; moveT0 = now; flow = 0; lean = 0; draw(); }
    };
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
     Electricidad en el título: al pasar el ratón, la letra se carga y
     saltan descargas desde su contorno
     ------------------------------------------------------------------ */
  function initZap(strike) {
    const word = $('[data-title]');
    if (!word || !FINE || RM) return;
    const box = word.parentElement;
    const chars = $$('.ch', word);
    let geo = [];        // por letra: puntos del contorno [x, y, nx, ny], con x e y relativos a su caja
    let stale = true;
    let cur = -1, next = 0, offTimer = 0;

    // Contorno real de la letra (y hacia dónde queda el exterior), leído de un lienzo auxiliar
    function outline(ch, fs, font, baseline) {
      const w = ch.offsetWidth, h = ch.offsetHeight;
      const pad = Math.ceil(fs * 0.3);
      const c = doc.createElement('canvas');
      c.width = Math.ceil(w) + pad * 2;
      c.height = Math.ceil(h) + pad * 2;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.font = font;
      x.textBaseline = 'alphabetic';
      // si el lienzo no reproduce el ancho real de la letra, no sirve
      if (Math.abs(x.measureText(ch.textContent).width - w) > w * 0.08) return null;
      x.fillText(ch.textContent, pad, pad + baseline);
      const data = x.getImageData(0, 0, c.width, c.height).data;
      const on = (px, py) => px >= 0 && py >= 0 && px < c.width && py < c.height && data[(py * c.width + px) * 4 + 3] > 128;
      const st = Math.max(2, Math.round(fs / 60));
      const pts = [];
      for (let py = 0; py < c.height; py += st) {
        for (let px = 0; px < c.width; px += st) {
          if (!on(px, py)) continue;
          let nx = 0, ny = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if ((dx || dy) && !on(px + dx * st, py + dy * st)) { nx += dx; ny += dy; }
            }
          }
          const n = Math.hypot(nx, ny);
          if (n < 0.5) continue;   // interior de la letra (o trazo demasiado fino)
          pts.push([(px - pad) / w, (py - pad) / h, nx / n, ny / n]);
        }
      }
      return pts.length > 12 ? pts : null;
    }

    // Alternativa: el borde de la caja de la letra
    function boxOutline() {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const f = i / 12;
        pts.push([0.08, f, -1, 0], [0.92, f, 1, 0], [f, 0.1, 0, -1], [f, 0.95, 0, 1]);
      }
      return pts;
    }

    function rebuild() {
      const fs = parseFloat(getComputedStyle(box).fontSize);
      const cs = getComputedStyle(chars[0]);
      const font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      const probe = doc.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      word.appendChild(probe);
      const baseY = probe.getBoundingClientRect().top;
      word.removeChild(probe);
      geo = chars.map(ch => {
        const r = ch.getBoundingClientRect();
        const k = r.height / (ch.offsetHeight || 1) || 1;
        return outline(ch, fs, font, (baseY - r.top) / k) || boxOutline();
      });
    }

    function setLive(i) {
      if (i === cur) return;
      if (cur >= 0) chars[cur].classList.remove('is-live');
      cur = i;
      if (cur >= 0) { chars[cur].classList.add('is-live'); next = 0; }
    }

    addEventListener('resize', () => { stale = true; });
    box.addEventListener('pointermove', e => {
      if (!box.classList.contains('is-ready')) return;   // aún está entrando
      if (stale) { rebuild(); stale = false; }
      clearTimeout(offTimer);
      const ch = e.target.closest ? e.target.closest('.ch') : null;
      if (ch) setLive(chars.indexOf(ch));
    });
    box.addEventListener('pointerleave', () => { offTimer = setTimeout(() => setLive(-1), 90); });

    subs.push(now => {
      if (cur < 0 || now < next || !geo[cur]) return;
      next = now + 40 + Math.random() * 60;
      const r = chars[cur].getBoundingClientRect();
      const g = geo[cur];
      const size = r.height;
      const at = p => [r.left + p[0] * r.width, r.top + p[1] * r.height];
      // punto del contorno al azar, con preferencia por los cercanos al puntero
      const near = () => {
        let best = null, bd = Infinity;
        for (let i = 0; i < 4; i++) {
          const p = g[(Math.random() * g.length) | 0], q = at(p);
          const d = Math.hypot(q[0] - S.px, q[1] - S.py);
          if (d < bd) { bd = d; best = p; }
        }
        return best;
      };

      const count = Math.random() < 0.5 ? 2 : 1;
      for (let j = 0; j < count; j++) {
        const p = near(), a = at(p);
        if (Math.random() < 0.62) {
          // descarga: salta del contorno hacia fuera
          const ang = Math.atan2(p[3], p[2]) + (Math.random() - 0.5) * 1.2;
          const len = size * (0.2 + Math.random() * 0.45);
          const b = [a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len];
          strike.arc([a, b]);
          if (Math.random() < 0.35) strike.sparks(b[0], b[1], 2);
        } else {
          // arco que bordea la letra por fuera hasta otro punto de su contorno
          for (let tries = 0; tries < 10; tries++) {
            const q = g[(Math.random() * g.length) | 0], b = at(q);
            const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
            if (dist < size * 0.1 || dist > size * 0.5) continue;
            const bulge = dist * (0.35 + Math.random() * 0.3);
            const m = [
              (a[0] + b[0]) / 2 + (p[2] + q[2]) * 0.5 * bulge,
              (a[1] + b[1]) / 2 + (p[3] + q[3]) * 0.5 * bulge
            ];
            strike.arc([a, m, b]);
            break;
          }
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     Rayos: un clic en cualquier parte descarga un rayo en ese punto
     ------------------------------------------------------------------ */
  function initStrike() {
    const cv = $('.strike');
    const flash = $('.flash');
    if (!cv || RM) return { hit() {}, arc() {}, burst() {}, sparks() {} };
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
    function jag(x1, y1, x2, y2, disp, iters, iso) {
      let pts = [[x1, y1], [x2, y2]];
      for (let it = 0; it < iters; it++) {
        const out = [pts[0]];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1];
          out.push([
            (a[0] + b[0]) / 2 + (Math.random() - 0.5) * disp,
            (a[1] + b[1]) / 2 + (Math.random() - 0.5) * disp * (iso ? 1 : 0.35)
          ], b);
        }
        pts = out;
        disp *= 0.55;
      }
      return pts;
    }

    function flashAt(x, y) {
      if (!flash) return;
      flash.style.setProperty('--fx', x + 'px');
      flash.style.setProperty('--fy', y + 'px');
      flash.classList.remove('go');
      void flash.offsetWidth;
      flash.classList.add('go');
    }

    // Los efectos nacen con el reloj del fotograma (S.now), no con el del evento: el del clic
    // puede ir unos milisegundos por delante y daría tiempos negativos al dibujar.
    function sparksAt(x, y, n) {
      const now = S.now;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = 0.12 + Math.random() * 0.5;
        sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.22, born: now, life: 380 + Math.random() * 380 });
      }
    }

    // Rayo completo: cae desde arriba hasta el punto
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
      bolts.push({ born: S.now, life: 480, blur: 26, lines });
      rings.push({ x, y, born: S.now, life: 560 });
      sparksAt(x, y, 16);
      S.energy = 1;
      flashAt(x, y);
    }

    // Arco corto que pasa por una serie de puntos (electricidad sobre el título)
    function arc(way) {
      if (way.length < 2) return;
      let pts = [];
      for (let i = 0; i < way.length - 1; i++) {
        const a = way[i], b = way[i + 1];
        const leg = jag(a[0], a[1], b[0], b[1], Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.42, 3, true);
        pts = pts.concat(i ? leg.slice(1) : leg);
      }
      bolts.push({ born: S.now, life: 120 + Math.random() * 140, blur: 14, lines: [{ pts, w: 1.5 + Math.random() * 1.3 }] });
    }

    // Destello y chispas sin rayo (impacto de la intro)
    function burst(x, y) {
      lastHit = performance.now();
      flashAt(x, y);
      sparksAt(x, y, 22);
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
        const t = Math.max(0, (now - b.born) / b.life);
        if (t >= 1) { bolts.splice(i, 1); continue; }
        const a = Math.pow(1 - t, 1.5) * (t < 0.45 ? 0.6 + Math.random() * 0.4 : 1);
        for (const ln of b.lines) {
          ctx.beginPath();
          ctx.moveTo(ln.pts[0][0], ln.pts[0][1]);
          for (let j = 1; j < ln.pts.length; j++) ctx.lineTo(ln.pts[j][0], ln.pts[j][1]);
          ctx.shadowColor = 'rgba(242,110,38,.95)';
          ctx.shadowBlur = b.blur;
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
        const t = Math.max(0, (now - r.born) / r.life);
        if (t >= 1) { rings.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - t, 3);
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, 6 + e * 110), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(242,110,38,${((1 - t) * 0.8).toFixed(3)})`;
        ctx.lineWidth = 2.5 * (1 - t) + 0.5;
        ctx.stroke();
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        const t = Math.max(0, (now - p.born) / p.life);
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
      if (e.target.closest('input, select, textarea, label, [data-reel], .modal')) return;
      hit(e.clientX, e.clientY);
    });

    return { hit, arc, burst, sparks: sparksAt };
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

      // Solo avanzan mientras están en pantalla
      let running = true;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(es => { running = es[es.length - 1].isIntersecting; }).observe(track.parentElement);
      }

      subs.push((now, dt) => {
        if (!running) return;
        x += dir * (speed / 1000 + Math.abs(S.sv) * 0.5) * dt;
        if (dir < 0) { if (x <= -unit) x += unit; } else if (x > 0) x -= unit;
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
      // umbral 0: basta con que asome. Con un porcentaje del elemento, uno muy alto (el formulario)
      // podía quedarse invisible en pantallas bajas aunque ya estuviera en pantalla.
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
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
    const contact = $('.contact');
    const upd = () => {
      top.classList.toggle('is-stuck', scrollY > 40);
      if (!contact) return;
      // sobre la sección de contratación va opaca y sin su botón, que ahí ya no hace falta
      const r = contact.getBoundingClientRect(), h = top.offsetHeight;
      top.classList.toggle('is-contact', r.top < h && r.bottom > h);
    };
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd);
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
     Carruseles (la banda, los vídeos): en táctil no hay hover, así que
     recupera el color la tarjeta centrada. En la banda, tocar una tarjeta
     la trae al centro; si no hay carrusel (tablet), alterna su color.
     ------------------------------------------------------------------ */
  function initSwipeColor() {
    if (FINE) return;
    [['.band__list', '.member', true], ['.live__list', '.clip', false]].forEach(([listSel, itemSel, tap]) => {
      const list = $(listSel);
      if (!list) return;
      const cards = $$(itemSel, list);
      const setActive = el => cards.forEach(c => c.classList.toggle('is-active', c === el));
      const isCarousel = () => list.scrollWidth > list.clientWidth + 4;
      if (tap) cards.forEach(c => c.addEventListener('click', () => {
        if (!isCarousel()) { setActive(c.classList.contains('is-active') ? null : c); return; }
        const lr = list.getBoundingClientRect(), cr = c.getBoundingClientRect();
        list.scrollBy({ left: cr.left + cr.width / 2 - (lr.left + lr.width / 2), behavior: RM ? 'auto' : 'smooth' });
      }));
      if (!('IntersectionObserver' in window)) return;
      const io = new IntersectionObserver(entries => {
        if (!isCarousel()) return;   // sin carrusel no hay tarjeta "centrada"
        entries.forEach(en => { if (en.isIntersecting) setActive(en.target); });
      }, { root: list, rootMargin: '0px -40% 0px -40%', threshold: 0 });
      cards.forEach(c => io.observe(c));
    });
  }

  /* ------------------------------------------------------------------
     En directo: el reproductor de Instagram solo se carga al pulsar.
     Sin este script, cada tarjeta es un enlace normal al vídeo.
     ------------------------------------------------------------------ */
  function initLive() {
    const modal = $('#reel-modal');
    const links = $$('[data-reel]');
    if (!modal || !links.length) return;
    const frame = $('.modal__frame', modal);
    const out = $('.modal__out', modal);
    const closeBtn = $('.modal__close', modal);
    let opener = null;

    function close() {
      if (modal.hidden) return;
      modal.hidden = true;
      frame.textContent = '';                 // al quitar el iframe se detiene el vídeo
      root.classList.remove('is-locked');
      if (opener) opener.focus({ preventScroll: true });
    }

    function open(link) {
      opener = link;
      const f = doc.createElement('iframe');
      f.src = `https://www.instagram.com/reel/${encodeURIComponent(link.dataset.reel)}/embed/`;
      f.title = 'Vídeo de Los Himnóticos en Instagram';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; clipboard-write; web-share';
      f.allowFullscreen = true;
      f.setAttribute('scrolling', 'no');
      frame.textContent = '';
      frame.appendChild(f);
      out.href = link.href;
      modal.hidden = false;
      root.classList.add('is-locked');
      closeBtn.focus({ preventScroll: true });
    }

    links.forEach(a => a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;   // abrir en pestaña nueva sigue funcionando
      e.preventDefault();
      open(a);
    }));
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    // el foco no sale de la ventana mientras está abierta
    doc.addEventListener('focusin', e => { if (!modal.hidden && !modal.contains(e.target)) closeBtn.focus(); });
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
        form.elements.evento.dispatchEvent(new Event('input', { bubbles: true }));
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

    // Fecha mínima: hoy (en hora local). Sin rellenar se marca para mostrarla atenuada, como los demás huecos.
    const date = form.elements.fecha;
    if (date) {
      const d = new Date();
      date.min = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const empty = () => date.toggleAttribute('data-empty', !date.value);
      date.addEventListener('input', empty);
      date.addEventListener('change', empty);
      empty();
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

    /* Validación: el aviso sale junto al campo que falla y dice qué le pasa a ese campo.
       Para el contacto basta un correo o un teléfono (sin este script, el HTML sigue exigiendo el correo). */
    const mail = form.elements.email, tel = form.elements.telefono;
    const fields = [form.elements.nombre, form.elements.evento, date, mail, form.elements.privacidad].filter(Boolean);
    mail.required = false;
    const checkContact = () => {
      const hasTel = tel.value.replace(/\D/g, '').length >= 6;
      mail.setCustomValidity(mail.value.trim() || hasTel ? '' : 'Déjanos un correo o un teléfono para responderte.');
    };
    const why = el => {
      const v = el.validity;
      if (el === mail) return v.customError ? el.validationMessage : 'Ese correo no parece válido. Revísalo.';
      if (el.name === 'nombre') return 'Nos falta tu nombre.';
      if (el.name === 'evento') return 'Elige el tipo de evento.';
      if (el.name === 'fecha') return v.rangeUnderflow ? 'Esa fecha ya ha pasado.' : 'Esa fecha no es válida.';
      if (el.name === 'privacidad') return 'Para enviarla, acepta la política de privacidad.';
      return el.validationMessage;
    };

    const tip = doc.createElement('span');
    tip.className = 'tip';
    tip.id = 'booking-tip';
    tip.setAttribute('aria-hidden', 'true');   // se lee como descripción del campo, no como parte de su etiqueta
    let tipFor = null;
    const hideTip = () => {
      if (!tipFor) return;
      tipFor.removeAttribute('aria-describedby');
      tipFor = null;
      tip.remove();
    };
    const showTip = el => {
      if (el.validity.valid) { hideTip(); return; }
      if (tipFor !== el) {
        hideTip();
        tipFor = el;
        el.setAttribute('aria-describedby', tip.id);
        const label = el.closest('label');
        const flow = el.type === 'checkbox';   // bajo la casilla va en el flujo, para no tapar el botón de enviar
        tip.classList.toggle('tip--flow', flow);
        if (flow) label.after(tip); else label.append(tip);
      }
      tip.textContent = why(el);
    };
    const mark = () => fields.forEach(el => el.setAttribute('aria-invalid', String(!el.validity.valid)));
    const validated = () => form.classList.contains('was-validated');

    form.setAttribute('novalidate', '');
    form.addEventListener('input', () => {
      if (status.dataset.state === 'error') say('');
      if (!validated()) return;
      checkContact();
      mark();
      if (tipFor) showTip(tipFor);   // el aviso se actualiza al corregir y desaparece cuando el campo queda bien
    });
    form.addEventListener('focusin', e => {
      if (!validated()) return;
      if (fields.includes(e.target)) showTip(e.target); else hideTip();
    });
    form.addEventListener('focusout', e => { if (!form.contains(e.relatedTarget)) hideTip(); });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      form.classList.add('was-validated');
      checkContact();
      mark();

      const bad = fields.find(el => !el.validity.valid);
      if (bad) {
        say('');
        bad.focus();
        showTip(bad);
        return;
      }
      hideTip();
      if (form.elements._honey.value) return;   // trampa antispam

      const action = form.getAttribute('action') || '';
      if (/REEMPLAZAR/.test(action)) {
        say('El formulario todavía no está conectado. Escríbenos por Instagram: @himnoticos', 'error');
        return;
      }

      btn.disabled = true;
      form.classList.add('is-sending');
      say('Enviando…');
      try {
        // FormSubmit: su variante /ajax/ responde en JSON, sin salir de la página
        const url = action.replace('formsubmit.co/', 'formsubmit.co/ajax/').replace('/ajax/ajax/', '/ajax/');
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form)))
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || String(json.success) !== 'true') {
          if (/activat/i.test(json.message || '')) {
            // primer envío: el servicio manda a la banda un correo para activar el formulario
            say('El formulario está pendiente de activar. Mientras tanto, escríbenos por Instagram: @himnoticos', 'error');
            btn.disabled = false;
            return;
          }
          throw new Error(json.message || 'HTTP ' + res.status);
        }
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
     Intro: el rayo del logo cae desde arriba, enciende el nombre y se
     desliza a su sitio en el hero mientras aparece la home
     ------------------------------------------------------------------ */
  function runIntro(field, strike) {
    const loader = $('.loader');
    const cv = loader && $('.loader__field', loader);
    const seen = root.classList.contains('no-intro');   // ya vista en esta sesión: lo decide el script del <head>
    const enter = () => {
      root.classList.add('is-in');
      // terminada la entrada de las letras, el título ya puede desbordar (brillos)
      setTimeout(() => { const n = $('.hero__name'); if (n) n.classList.add('is-ready'); }, RM ? 0 : seen ? 1900 : 2400);
    };
    if (!loader || !cv || RM || seen) {
      if (loader) loader.remove();
      field.show();
      enter();
      return;
    }
    try { sessionStorage.setItem('himnoticos-intro', '1'); } catch (e) { /* sin almacenamiento, la intro se verá cada vez */ }

    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    addEventListener('resize', resize);

    const FALL = 430;    // ms que tarda cada raya en caer
    const GAP = 65;      // desfase entre rayas, del centro hacia fuera
    const LIT = 560;     // se enciende el nombre
    const HOLD = 1700;   // el hero toma el relevo
    let t0 = 0, struck = false, lit = false, over = false;

    const wait = ms => new Promise(r => setTimeout(r, ms));
    const fonts = doc.fonts && doc.fonts.ready ? Promise.race([doc.fonts.ready, wait(2500)]) : Promise.resolve();
    Promise.all([wait(120), fonts]).then(() => { t0 = performance.now(); });

    subs.push(now => {
      if (over || !t0) return;
      const t = now - t0;
      const m = introMap(W, H);
      const prog = k => (k < 0 || k > 4 ? 0 : Math.pow(clamp((t - Math.abs(k - 2) * GAP) / FALL, 0, 1), 2.2));
      const heat = t < FALL ? 0.85 : Math.max(0, 1 - (t - FALL) / 650);

      ctx.clearRect(0, 0, W, H);
      drawBolt(ctx, dpr, { s: m.s, ox: m.ox, oy: m.oy, lean: 0, flow: 0, far: 0, dim: 1, heat, prog });

      if (!struck && t >= FALL) { struck = true; S.energy = 1; strike.burst(W / 2, H * 0.7); }
      if (!lit && t >= LIT) { lit = true; loader.classList.add('lit'); }
      if (t >= HOLD) {
        over = true;
        removeEventListener('resize', resize);
        field.takeover(now);             // mismo rayo, misma posición: no se nota el relevo
        loader.classList.add('out');
        enter();
        setTimeout(() => loader.remove(), 600);
      }
    });
  }

  /* ------------------------------------------------------------------
     Arranque
     ------------------------------------------------------------------ */
  const field = initField();
  const title = initTitle();
  const strike = initStrike();
  initZap(strike);
  initScrollText();
  initReveal();
  initMagnetic();
  initSpot();
  initHeader();
  initSwipeColor();
  initLive();
  initRows();
  initForm(strike);
  $$('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });

  const fontsReady = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
  fontsReady.then(() => {
    title.fit();
    initFit();
    initMarquees();
  });

  runIntro(field, strike);

  requestAnimationFrame(frame);
})();
