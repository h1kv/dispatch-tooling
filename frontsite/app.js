import * as THREE from 'three';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isTouch = window.matchMedia('(hover: none)').matches;

/* ---------- Scroll reveal (gated behind .js — see styles.css) ---------- */
(() => {
  const els = document.querySelectorAll('.reveal');
  if (reduceMotion.matches) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        if (!e.target.style.transitionDelay) e.target.style.transitionDelay = (i % 4) * 0.06 + 's';
        e.target.classList.add('in'); io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(e => io.observe(e));
})();

/* ---------- Nav: scroll state + mega-menu + mobile sheet ---------- */
(() => {
  const nav = document.getElementById('nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('nav-scrolled', window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Desktop Features mega-menu (hover-intent on pointer devices, click everywhere) */
  const wrap = document.getElementById('featMenuWrap');
  const btn = document.getElementById('featMenuBtn');
  const menu = document.getElementById('featMenu');
  if (wrap && btn && menu) {
    let openTimer = null, closeTimer = null;
    const isOpen = () => wrap.classList.contains('is-open');
    const open = () => {
      clearTimeout(closeTimer);
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      menu.removeAttribute('hidden');
    };
    const close = () => {
      clearTimeout(openTimer);
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      menu.setAttribute('hidden', '');
    };
    btn.addEventListener('click', (e) => { e.stopPropagation(); isOpen() ? close() : open(); });
    if (!isTouch) {
      wrap.addEventListener('pointerenter', () => { clearTimeout(closeTimer); openTimer = setTimeout(open, 60); });
      wrap.addEventListener('pointerleave', () => { clearTimeout(openTimer); closeTimer = setTimeout(close, 140); });
    }
    // outside click + Esc
    document.addEventListener('click', (e) => { if (isOpen() && !wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) { close(); btn.focus(); }
    });
    // a menu link click closes it
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  }

  /* Mobile sheet toggle */
  const toggle = document.getElementById('navToggle');
  const sheet = document.getElementById('mobileMenu');
  const openIcon = document.getElementById('navOpenIcon');
  const closeIcon = document.getElementById('navCloseIcon');
  if (toggle && sheet) {
    const setOpen = (o) => {
      sheet.classList.toggle('hidden', !o);
      toggle.setAttribute('aria-expanded', String(o));
      toggle.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
      if (openIcon) openIcon.classList.toggle('hidden', o);
      if (closeIcon) closeIcon.classList.toggle('hidden', !o);
    };
    toggle.addEventListener('click', () => setOpen(sheet.classList.contains('hidden')));
    sheet.querySelectorAll('[data-nav-close]').forEach((el) =>
      el.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !sheet.classList.contains('hidden')) { setOpen(false); toggle.focus(); }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768 && !sheet.classList.contains('hidden')) setOpen(false);
    });

    /* Mobile Features accordion */
    const accBtn = sheet.querySelector('.nav-acc-btn');
    const accPanel = document.getElementById('navAccPanel');
    if (accBtn && accPanel) {
      accBtn.addEventListener('click', () => {
        const expanded = accBtn.getAttribute('aria-expanded') === 'true';
        accBtn.setAttribute('aria-expanded', String(!expanded));
        accPanel.toggleAttribute('hidden', expanded);
      });
    }
  }
})();

/* ---------- Number tickers ---------- */
function ticker(el, target, dur = 1400) {
  if (reduceMotion.matches) { el.textContent = target.toLocaleString(); return; }
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * e).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
(() => {
  document.querySelectorAll('[data-ticker]').forEach(el => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { ticker(el, +el.dataset.ticker); io.disconnect(); } });
    }, { threshold: 0.5 });
    io.observe(el);
  });
})();

/* ---------- Bento cursor spotlight ---------- */
(() => {
  if (isTouch) return;
  const grid = document.getElementById('bentoGrid');
  if (!grid) return;
  let raf = null, mx = 0, my = 0;
  grid.addEventListener('pointermove', (e) => {
    const r = grid.getBoundingClientRect();
    mx = e.clientX - r.left; my = e.clientY - r.top;
    if (!raf) raf = requestAnimationFrame(() => {
      grid.style.setProperty('--mx', mx + 'px');
      grid.style.setProperty('--my', my + 'px');
      raf = null;
    });
  });
})();

/* ---------- Magnetic CTA ---------- */
(() => {
  if (isTouch || reduceMotion.matches) return;
  const btn = document.getElementById('magnetCta');
  const label = document.getElementById('magnetLabel');
  const glyph = document.getElementById('ghGlyph');
  if (!btn) return;
  const R = 80;
  btn.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < R) {
      const f = (1 - dist / R);
      btn.style.transform = `translate(${dx * 0.3 * f}px, ${dy * 0.3 * f}px)`;
      label.style.transform = `translate(${dx * 0.15 * f}px, ${dy * 0.15 * f}px)`;
      glyph.style.transform = 'rotate(1deg) scale(1.1)';
    }
  });
  btn.addEventListener('pointerleave', () => {
    btn.style.transition = 'transform .3s var(--ease-out)';
    btn.style.transform = ''; label.style.transform = ''; glyph.style.transform = '';
    setTimeout(() => btn.style.transition = '', 300);
  });
})();

/* ---------- Live tools typing ---------- */
(() => {
  const out = document.getElementById('toolType');
  if (!out) return;
  const word = 'shell_exec';
  if (reduceMotion.matches) { out.textContent = word; return; }
  let started = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !started) {
        started = true;
        let i = 0;
        const type = () => { if (i <= word.length) { out.textContent = word.slice(0, i); i++; setTimeout(type, 40 + Math.random()*30); } };
        type(); io.disconnect();
      }
    });
  }, { threshold: 0.5 });
  io.observe(document.getElementById('toolList'));
})();

/* ---------- Model hotswap (real model ids) ---------- */
(() => {
  const models = {
    openai: ['gpt-4o', 'o3'],
    anthropic: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
    google: ['gemini-2.5-pro'],
  };
  const tabs = document.querySelectorAll('#provTabs button');
  const list = document.getElementById('modelList');
  const nodeModel = document.getElementById('nodeModel');
  if (!list) return;
  function render(prov) {
    list.innerHTML = models[prov].map((m, i) =>
      `<div class="px-2.5 py-1.5 ${i===0?'text-ink-2':'text-ink-muted'} hover:bg-[#fafafa] cursor-pointer" data-m="${m}">${m}</div>`
    ).join('');
    nodeModel.textContent = models[prov][0];
    list.querySelectorAll('[data-m]').forEach(el => el.addEventListener('click', () => { nodeModel.textContent = el.dataset.m; }));
  }
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { x.classList.remove('text-ink-2'); x.classList.add('text-ink-muted'); x.style.borderColor = '#eaeaea'; });
    t.classList.add('text-ink-2'); t.classList.remove('text-ink-muted'); t.style.borderColor = '#635bff';
    render(t.dataset.prov);
  }));
  const first = document.querySelector('#provTabs button');
  if (first) first.style.borderColor = '#635bff';
  render('openai');
})();

/* ---------- Live-run sequence in bento marquee ---------- */
(() => {
  const setDot = (id, cls) => { const d = document.getElementById(id); if (d) d.className = 'dot ' + cls; };
  const node = (id) => document.getElementById(id);
  const status = document.getElementById('runStatus');
  const e1 = document.getElementById('e1'), e2 = document.getElementById('e2');
  if (!status || !e1) return;
  const reduced = reduceMotion.matches;
  const setStatus = (cls, txt) => { status.innerHTML = `<span class="dot ${cls}"></span> ${txt}`; };

  function resetAll() {
    ['d1','d2','d3'].forEach(d => setDot(d, 'dot-idle'));
    ['n1','n2','n3'].forEach(n => node(n).className = node(n).id==='n3' ? 'review-node' : 'node');
    e1.classList.remove('active'); e2.classList.remove('active');
    setStatus('dot-idle','idle');
  }
  let timers = [];
  const after = (ms, fn) => timers.push(setTimeout(fn, ms));

  function run() {
    timers.forEach(clearTimeout); timers = [];
    resetAll();
    if (reduced) {
      setDot('d1','dot-done'); setDot('d2','dot-done'); setDot('d3','dot-paused');
      node('n3').className = 'review-node is-paused';
      setStatus('dot-paused','awaiting review'); return;
    }
    setStatus('dot-run','running');
    setDot('d1','dot-run'); node('n1').classList.add('is-running');
    after(900, () => { setDot('d1','dot-done'); node('n1').classList.remove('is-running'); node('n1').classList.add('is-done'); e1.classList.add('active'); });
    after(1400, () => { setDot('d2','dot-run'); node('n2').classList.add('is-running'); });
    after(2600, () => { setDot('d2','dot-done'); node('n2').classList.remove('is-running'); node('n2').classList.add('is-done'); e1.classList.remove('active'); e2.classList.add('active'); });
    after(3100, () => { setDot('d3','dot-paused'); node('n3').classList.add('is-paused'); setStatus('dot-paused','awaiting review'); });
  }

  document.getElementById('approveBtn').addEventListener('click', () => {
    e2.classList.remove('active');
    setDot('d3','dot-done'); node('n3').classList.remove('is-paused'); node('n3').classList.add('is-done');
    setStatus('dot-done','complete');
    timers.forEach(clearTimeout);
    setTimeout(run, 2600);
  });

  let started = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting && !started) { started = true; run(); } });
  }, { threshold: 0.4 });
  io.observe(document.getElementById('runEdges'));
})();

/* ---------- Agentic handoff baton (4px square, SVG path-following) ---------- */
(() => {
  const stage = document.getElementById('handoffStage');
  const baton = document.getElementById('baton');
  const path = document.getElementById('hpath');
  if (!stage || !baton || !path) return;
  const nodes = [document.getElementById('ho1'), document.getElementById('ho2'), document.getElementById('ho3')];
  const dots = [document.getElementById('hd1'), document.getElementById('hd2'), document.getElementById('hd3')];
  const provs = [document.getElementById('hp1'), document.getElementById('hp2'), document.getElementById('hp3')];

  if (reduceMotion.matches) {
    nodes.forEach(n => n.classList.add('is-done'));
    dots.forEach(d => d.className = 'dot dot-done');
    provs.forEach(p => p.style.opacity = '1');
    baton.style.display = 'none'; return;
  }
  let len = 0;
  const measure = () => { try { len = path.getTotalLength(); } catch { len = 0; } };
  measure();

  let raf = null, running = false, t = 0;
  const DUR = 2.2;
  function frame(now) {
    if (!running) return;
    if (!frame.last) frame.last = now;
    const dt = (now - frame.last) / 1000; frame.last = now;
    t += dt / DUR;
    if (t > 1) t = 0;
    const p = path.getPointAtLength(len * t);
    baton.setAttribute('x', p.x - 2); baton.setAttribute('y', p.y - 2);
    const seg = Math.min(2, Math.floor(t * 3));
    nodes.forEach((n, i) => {
      n.classList.remove('is-running', 'is-done');
      dots[i].className = 'dot ' + (i < seg ? 'dot-done' : i === seg ? 'dot-run' : 'dot-idle');
      if (i < seg) n.classList.add('is-done');
      else if (i === seg) n.classList.add('is-running');
      n.style.opacity = (i <= seg) ? '1' : '0.55';
      // provider wordmark fades in as the baton reaches its node
      if (provs[i]) provs[i].style.opacity = (i <= seg) ? '1' : '0.45';
    });
    raf = requestAnimationFrame(frame);
  }
  const start = () => { if (running) return; running = true; frame.last = 0; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; if (raf) cancelAnimationFrame(raf); raf = null; };

  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) start(); else stop(); }), { threshold: 0.3 });
  io.observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 150); });
})();

/* ---------- Voice transcript + ghost node + ghost edge draw-in ---------- */
(() => {
  const out = document.getElementById('voiceTranscript');
  const ghost = document.getElementById('ghostNode');
  const edge = document.getElementById('ghostEdge');
  if (!out || !ghost) return;
  const phrase = 'add a Review node after Investigate';
  const showEdge = () => { if (edge) { edge.style.opacity = '0.8'; edge.animate ? edge.animate([{strokeDashoffset:40},{strokeDashoffset:0}], {duration:500, fill:'forwards', easing:'cubic-bezier(.16,1,.3,1)'}) : (edge.style.strokeDashoffset='0'); } };
  const hideEdge = () => { if (edge) { edge.style.opacity = '0'; edge.style.strokeDashoffset = '40'; } };

  if (reduceMotion.matches) { out.textContent = phrase; ghost.style.opacity = '1'; ghost.style.transform = 'none'; showEdge(); return; }
  let started = false;
  const cycle = () => {
    out.textContent = ''; ghost.style.opacity = '0'; ghost.style.transform = 'translateY(8px)'; hideEdge();
    let i = 0;
    const type = () => {
      if (i <= phrase.length) { out.textContent = phrase.slice(0, i); i++; setTimeout(type, 45 + Math.random()*35); }
      else { setTimeout(() => { showEdge(); ghost.style.opacity = '1'; ghost.style.transform = 'none'; }, 400); setTimeout(cycle, 5200); }
    };
    type();
  };
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting && !started) { started = true; cycle(); io.disconnect(); } }), { threshold: 0.4 });
  io.observe(out.closest('.bg-white'));
})();

/* ---------- Terminal typing (run / retry / stream logs) ---------- */
(() => {
  const body = document.getElementById('termBody');
  if (!body) return;
  const lines = [
    { t: 'cmd', s: '$ run' },
    { t: 'log', s: '[Initialiser] trigger ✓' },
    { t: 'log', s: '[Investigate] web_search ✓  3 sources' },
    { t: 'log', s: '[Investigate] fetch_url ✓' },
    { t: 'log', s: '[Plan] claude-opus-4-8 ✓' },
    { t: 'warn', s: '[Review] paused — awaiting human' },
    { t: 'cmd', s: '$ retry investigate' },
    { t: 'log', s: '[Investigate] web_search ✓  retried' },
    { t: 'ok', s: '$ done — chain complete' },
  ];
  // light-terminal palette: dark mono text, log levels tinted on white
  const colorFor = (t) => t === 'cmd' ? '#171717' : t === 'warn' ? '#f59e0b' : t === 'ok' ? '#16a34a' : t === 'err' ? '#ef4444' : '#595959';

  if (reduceMotion.matches) {
    body.innerHTML = lines.map(l => `<div style="color:${colorFor(l.t)}">${l.s}</div>`).join('');
    return;
  }
  let started = false;
  function play() {
    body.innerHTML = '';
    let li = 0;
    function nextLine() {
      if (li >= lines.length) { setTimeout(play, 4500); return; }
      const l = lines[li++];
      const div = document.createElement('div');
      div.style.color = colorFor(l.t);
      body.appendChild(div);
      if (l.t === 'cmd') {
        let i = 0;
        const caret = document.createElement('span'); caret.className = 'caret';
        div.appendChild(caret);
        const type = () => {
          if (i <= l.s.length) { div.textContent = l.s.slice(0, i); div.appendChild(caret); i++; setTimeout(type, 38 + Math.random()*28); }
          else { caret.remove(); setTimeout(nextLine, 320); }
        };
        type();
      } else {
        div.textContent = l.s;
        setTimeout(nextLine, 360 + Math.random()*180);
      }
    }
    nextLine();
  }
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting && !started) { started = true; play(); } }), { threshold: 0.3 });
  io.observe(body);
})();

/* ---------- Copy git clone ---------- */
(() => {
  const cmd = 'git clone https://github.com/h1kv/dispatch-tooling.git';
  const wire = (btn, labelEl, doneText) => {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(cmd); } catch {}
      const prev = labelEl.textContent; labelEl.textContent = doneText;
      setTimeout(() => labelEl.textContent = prev, 1400);
    });
  };
  const cb = document.getElementById('copyBtn');
  wire(cb, cb, 'copied');
  const cc = document.getElementById('cloneCta');
  wire(cc, document.getElementById('cloneCtaLabel'), 'copied ✓');
})();

/* ---------- Contribution heatmap ---------- */
(() => {
  const wrap = document.getElementById('heatmap');
  if (!wrap) return;
  const COLS = 20, ROWS = 7, total = COLS * ROWS;
  const frag = document.createDocumentFragment();
  const cells = [];
  for (let i = 0; i < total; i++) {
    const c = document.createElement('span');
    c.className = 'heat heat-0';
    frag.appendChild(c); cells.push(c);
  }
  wrap.appendChild(frag);
  if (reduceMotion.matches) {
    cells.forEach(c => { const lv = Math.floor(Math.random()*5); c.className = 'heat heat-' + lv; c.dataset.l = lv; });
    return;
  }
  let started = false;
  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting && !started) {
      started = true;
      cells.forEach((c, i) => setTimeout(() => {
        const lv = Math.max(0, Math.min(4, Math.round(Math.random()*4 * (0.4 + 0.6*Math.random()))));
        c.className = 'heat heat-' + lv; c.dataset.l = lv;
      }, i * 14));
      io.disconnect();
    }
  }), { threshold: 0.3 });
  io.observe(wrap);
})();

/* ---------- Node grid (13 real nodes + build-your-own) ---------- */
(() => {
  const grid = document.getElementById('nodeGrid');
  if (!grid) return;
  const nodes = [
    ['Initialiser','run','Kick off the run.'],
    ['Investigate','idle','Search & gather context.'],
    ['Plan','idle','Shape goals & phases.'],
    ['Design','idle','Draft the approach.'],
    ['Create','idle','Produce the output.'],
    ['Evaluate','idle','Score against criteria.'],
    ['Doc','idle','Write it up.'],
    ['Apply','idle','Apply the change.'],
    ['Context','idle','Shared read / write store.'],
    ['Review','paused','Human Approve / Reject.'],
    ['Parallel','run','Fan-out branches.'],
    ['Merge','run','Fan-in to one.'],
    ['Deploy','idle','Ship the result.'],
  ];
  const cells = nodes.map(([name, st, desc]) =>
    `<div class="bg-white p-5 hover:bg-[#fcfcfc] transition-colors">
      <div class="flex items-center gap-2"><span class="dot dot-${st}"></span><span class="mono text-[13px] text-ink-2">${name}</span></div>
      <p class="mt-2 text-[12.5px] text-ink-body">${desc}</p>
    </div>`).join('');
  const build = `<a href="https://github.com/h1kv/dispatch-tooling" class="bg-white p-5 hover:bg-[#fcfcfc] transition-colors flex flex-col">
      <div class="flex items-center gap-2"><span class="dot is-round" style="background:#635bff"></span><span class="mono text-[13px] text-accent">Build your own node</span></div>
      <p class="mt-2 text-[12.5px] text-ink-body">Write a skill — it becomes a node on the canvas.</p>
      <span class="link-arrow mt-auto pt-3 text-[13px]">Get started
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7h8M7 3l4 4-4 4"/></svg></span>
    </a>`;
  grid.innerHTML = cells + build;
})();

/* ---------- MODELS.md typing (directive model control) ---------- */
(() => {
  const win = document.getElementById('modelsMd');
  if (!win) return;
  const raw = [
    ['## Plan', 'h'],
    ['model: anthropic/claude-opus-4-8', 't'],
    ['temperature: 0.4', 't'],
    ['tools: [web_search, read_file]', 't'],
    ['fallback: openai/gpt-4o', 'f'],
    ['', 'p'],
    ['## Deploy', 'h'],
    ['model: openai/o3', 't'],
    ['route: by_cost', 'r'],
  ];
  // restrained tint on light: headings accent, body near-ink, fallback amber, route green
  const color = (k) => k === 'h' ? '#635bff' : k === 'f' ? '#f59e0b' : k === 'r' ? '#16a34a' : '#171717';
  function rowHtml(text, kind, ln) {
    return `<div style="display:flex;gap:12px"><span class="ln" style="width:18px;text-align:right">${ln}</span><span style="color:${color(kind)}">${text || '&nbsp;'}</span></div>`;
  }
  if (reduceMotion.matches) {
    win.innerHTML = raw.map((r, i) => rowHtml(r[0], r[1], i+1)).join('');
    return;
  }
  let started = false;
  function play() {
    win.innerHTML = '';
    let ri = 0;
    function nextRow() {
      if (ri >= raw.length) { setTimeout(play, 5200); return; }
      const [text, kind] = raw[ri];
      const row = document.createElement('div');
      row.style.display = 'flex'; row.style.gap = '12px';
      const num = document.createElement('span'); num.className = 'ln'; num.style.width = '18px'; num.style.textAlign = 'right'; num.textContent = ri+1;
      const span = document.createElement('span'); span.style.color = color(kind);
      row.appendChild(num); row.appendChild(span); win.appendChild(row);
      let i = 0;
      const type = () => {
        if (i <= text.length) { span.innerHTML = (text.slice(0, i) || '&nbsp;'); i++; setTimeout(type, 22 + Math.random()*22); }
        else { ri++; setTimeout(nextRow, 120); }
      };
      type();
    }
    nextRow();
  }
  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting && !started) { started = true; play(); } }), { threshold: 0.3 });
  io.observe(win);
})();

/* ---------- Drag & drop micro-demo ---------- */
(() => {
  const stage = document.getElementById('dropStage');
  const chip = document.getElementById('dropChip');
  const slot = document.getElementById('dropSlot');
  if (!stage || !chip || !slot || isTouch || reduceMotion.matches) return;
  const slotLabel = slot.textContent;
  let settled = false;
  const settle = () => {
    if (settled) return; settled = true;
    const sr = slot.getBoundingClientRect(), cr = chip.getBoundingClientRect();
    const dx = sr.left - cr.left, dy = sr.top - cr.top;
    stage.classList.add('is-armed');
    chip.style.transition = 'transform .35s var(--ease-out), box-shadow .2s';
    chip.style.transform = `translate(${dx}px, ${dy}px) scale(0.96)`;
    chip.style.boxShadow = '0 10px 28px -12px rgba(10,10,10,.22)';
    chip.style.borderColor = '#635bff';
    setTimeout(() => { slot.textContent = '+ added'; }, 360);
    setTimeout(() => {
      settled = false;
      chip.style.transition = 'none'; chip.style.transform = 'none'; chip.style.boxShadow = 'none'; chip.style.borderColor = '';
      stage.classList.remove('is-armed');
      slot.textContent = slotLabel;
    }, 2200);
  };
  chip.addEventListener('pointerenter', settle);
})();

/* ---------- CTA: cursor spotlight + parallax + magnetic GitHub button ----------
   Spotlight: writes --mx/--my on the panel so .cta-glow follows the pointer.
   Parallax: a small counter-offset --px/--py drifts the dotted grid.
   Magnet: the primary GitHub button leans toward the cursor within a radius.
   All gated for touch + reduced-motion; one rAF coalesces the pointer work. */
(() => {
  const panel = document.getElementById('ctaPanel');
  if (!panel || isTouch || reduceMotion.matches) return;

  // spotlight + parallax (single coalesced rAF)
  let raf = null, mx = 75, my = 30, px = 0, py = 0;
  panel.addEventListener('pointermove', (e) => {
    const r = panel.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width) * 100;
    my = ((e.clientY - r.top) / r.height) * 100;
    // counter-drift the grid a few px for depth
    px = -((mx / 100) - 0.5) * 14;
    py = -((my / 100) - 0.5) * 14;
    if (!raf) raf = requestAnimationFrame(() => {
      panel.style.setProperty('--mx', mx + '%');
      panel.style.setProperty('--my', my + '%');
      panel.style.setProperty('--px', px.toFixed(2) + 'px');
      panel.style.setProperty('--py', py.toFixed(2) + 'px');
      raf = null;
    });
  });
  panel.addEventListener('pointerleave', () => {
    panel.style.setProperty('--mx', '75%');
    panel.style.setProperty('--my', '30%');
    panel.style.setProperty('--px', '0px');
    panel.style.setProperty('--py', '0px');
  });

  // magnetic primary button
  const btn = document.getElementById('ctaMagnet');
  const label = document.getElementById('ctaMagnetLabel');
  const glyph = document.getElementById('ctaGlyph');
  if (!btn) return;
  const R = 90;
  btn.addEventListener('pointermove', (e) => {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < R) {
      const f = 1 - dist / R;
      btn.style.transform = `translate(${dx * 0.3 * f}px, ${dy * 0.3 * f}px)`;
      if (label) label.style.transform = `translate(${dx * 0.15 * f}px, ${dy * 0.15 * f}px)`;
      if (glyph) glyph.style.transform = 'rotate(1deg) scale(1.1)';
    }
  });
  btn.addEventListener('pointerleave', () => {
    btn.style.transition = 'transform .3s var(--ease-out)';
    btn.style.transform = '';
    if (label) label.style.transform = '';
    if (glyph) glyph.style.transform = '';
    setTimeout(() => btn.style.transition = '', 300);
  });
})();

/* ---------- CTA live ledger: 250 credits BURN down + chain current ----------
   On first reveal: the number counts UP to 250 (credits spent), the fill bar
   tracks it, then the meta settles to "spent" and the node-chain's edges start
   marching a signal current with the final node going live. One rAF drives the
   count; the chain flow is pure CSS. IO-gated, runs once, reduced-motion shows
   the final static state. -------------------------------------------------- */
(() => {
  const stage = document.getElementById('ctaStage');
  if (!stage) return;
  const numEl  = document.getElementById('ctaBurnNum');
  const fillEl = document.getElementById('ctaBurnFill');
  const metaEl = document.getElementById('ctaStageMeta');
  const burn   = stage.querySelector('.cta-burn');
  const edges  = stage.querySelectorAll('.cta-edge');
  const lastNode = stage.querySelector('.cta-cnode[data-i="2"]');
  const target = numEl ? (+numEl.dataset.burn || 250) : 250;

  const settle = () => {
    if (numEl) numEl.textContent = target.toLocaleString();
    if (fillEl) fillEl.style.width = '100%';
    if (burn) burn.classList.add('is-spent');
    if (metaEl) metaEl.textContent = '~' + target + ' spent';
    edges.forEach(e => e.classList.add('flow'));
    if (lastNode) lastNode.classList.add('is-live');
  };

  if (reduceMotion.matches) { settle(); return; }

  let started = false;
  const run = () => {
    const dur = 1600, t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);            // easeOutCubic
      const v = Math.round(target * e);
      if (numEl)  numEl.textContent = v.toLocaleString();
      if (fillEl) fillEl.style.width = (e * 100).toFixed(1) + '%';
      if (metaEl && p < 1) metaEl.textContent = 'metering · ' + v;
      if (p < 1) { requestAnimationFrame(step); }
      else { settle(); }
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting && !started) { started = true; run(); io.disconnect(); }
  }), { threshold: 0.4 });
  io.observe(stage);
})();

/* ---------- Chat-vs-canvas: mini-canvas edge flow + run state ----------
   When the comparison enters view, the drawn accent edges switch to a
   marching "flow" and the run header settles to done — making the canvas
   side read as alive. Reduced-motion shows the static finished state. */
(() => {
  const canvas = document.getElementById('cmpCanvas');
  if (!canvas) return;
  const edges = canvas.querySelectorAll('.cmp-edge');
  const meta = document.getElementById('cmpCanvasMeta');
  const setMeta = (cls, txt) => { if (meta) meta.innerHTML = `<span class="dot ${cls}"></span> ${txt}`; };

  if (reduceMotion.matches) {
    edges.forEach(e => e.classList.add('flow'));
    setMeta('dot-paused', 'awaiting review');
    return;
  }
  let started = false;
  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting && !started) {
      started = true;
      setMeta('dot-run', 'running');
      // after the draw-in completes, start the downstream flow + settle status
      setTimeout(() => edges.forEach(ed => ed.classList.add('flow')), 1150);
      setTimeout(() => setMeta('dot-paused', 'awaiting review'), 1600);
      io.disconnect();
    }
  }), { threshold: 0.4 });
  io.observe(canvas);
})();

/* ---------- Agentic streaming: 20-agent parallel fan-out wave ----------
   Perf model: ONE requestAnimationFrame loop drives the whole 20-tile wave.
   No per-tile timers. The loop reads elapsed time, maps it to each tile's
   start/finish window, and only touches a tile's className when its phase
   actually changes (idle → running → done). IntersectionObserver gates it;
   reduced-motion renders the static finished state. ---------------------- */
(() => {
  const grid = document.getElementById('streamGrid');
  const stage = document.getElementById('streamStage');
  if (!grid || !stage) return;

  const N = 20;
  const TASKS = [
    'scan','types','tests','lint','deps','docs','perf','auth','cache','api',
    'db','ui','i18n','build','sec','infra','logs','retry','merge','diff',
  ];
  const status = document.getElementById('streamStatus');
  const resultDot = document.getElementById('streamResultDot');
  const resultLabel = document.getElementById('streamResultLabel');
  const resultNode = document.getElementById('streamResult');
  const reduced = reduceMotion.matches;

  // Build the 20 tiles once.
  const tiles = [];
  const frag = document.createDocumentFragment();
  for (let i = 0; i < N; i++) {
    const id = String(i + 1).padStart(2, '0');
    const el = document.createElement('div');
    el.className = 'agent';
    el.setAttribute('role', 'listitem');
    el.innerHTML =
      `<div class="agent-head">`
      + `<span class="a-dot"></span>`
      + `<span class="agent-id">agent ${id}</span>`
      + `<span class="agent-state">idle</span>`
      + `</div>`
      + `<div class="agent-log">`
      + `<span class="agent-bar"></span><span class="agent-bar"></span><span class="agent-bar"></span>`
      + `</div>`;
    frag.appendChild(el);
    tiles.push({ el, state: 'idle', stateEl: el.querySelector('.agent-state'), task: TASKS[i] });
  }
  grid.appendChild(frag);

  const setState = (t, s, label) => {
    if (t.state === s) return;
    t.state = s;
    t.el.classList.remove('is-running', 'is-done');
    if (s !== 'idle') t.el.classList.add(s === 'running' ? 'is-running' : 'is-done');
    t.stateEl.textContent = label;
  };
  const setStatus = (cls, txt) => { if (status) status.innerHTML = `<span class="dot ${cls}"></span> ${txt}`; };
  const setResult = (cls, label, done) => {
    if (resultDot) resultDot.className = 'dot ' + cls;
    if (resultLabel) resultLabel.textContent = label;
    if (resultNode) resultNode.classList.toggle('stream-result-done', !!done);
  };

  // Static finished state (reduced-motion / no rAF).
  function showFinished() {
    stage.classList.add('is-active');
    tiles.forEach(t => setState(t, 'done', t.task + ' ✓'));
    setStatus('dot-done', '20 / 20 complete');
    setResult('dot-done', 'Synthesized result', true);
  }
  if (reduced) { showFinished(); return; }

  // Timeline (ms). Each agent starts on a stagger and runs for a jittered span,
  // so they light up and finish in a wave; then the result converges; then loop.
  const START_SPREAD = 1500;   // last agent kicks off by here
  const RUN_MIN = 1100, RUN_JIT = 1300;
  const plan = tiles.map((t, i) => {
    const start = (i / N) * START_SPREAD + Math.random() * 140;
    const dur = RUN_MIN + Math.random() * RUN_JIT;
    return { start, end: start + dur };
  });
  const lastEnd = Math.max(...plan.map(p => p.end));
  const MERGE = lastEnd + 450;       // result lights up
  const HOLD = MERGE + 1900;         // hold the finished frame
  const TOTAL = HOLD + 600;          // then restart

  let raf = null, running = false, t0 = 0, merged = false;

  function reset() {
    merged = false;
    tiles.forEach(t => setState(t, 'idle', 'idle'));
    setStatus('dot-run', 'dispatching 20 agents');
    setResult('dot-idle', 'Synthesized result', false);
  }

  function frame(now) {
    if (!running) return;
    if (!t0) t0 = now;
    const t = now - t0;

    let done = 0, active = 0;
    for (let i = 0; i < N; i++) {
      const p = plan[i], tile = tiles[i];
      if (t >= p.end) { setState(tile, 'done', tile.task + ' ✓'); done++; }
      else if (t >= p.start) { setState(tile, 'running', tile.task); active++; }
      else setState(tile, 'idle', 'idle');
    }

    if (t < MERGE) setStatus('dot-run', `${active} streaming · ${done}/20 done`);

    if (t >= MERGE && !merged) {
      merged = true;
      setStatus('dot-done', '20 / 20 complete');
      setResult('dot-done', 'Synthesized result', true);
    }

    if (t >= TOTAL) { t0 = now; reset(); }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    stage.classList.add('is-active');
    t0 = 0; reset();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) start(); else stop();
  }), { threshold: 0.25 });
  io.observe(stage);

  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (!reduceMotion.matches) start(); });
  reduceMotion.addEventListener('change', (e) => { if (e.matches) { stop(); showFinished(); } });
})();

/* ---------- Model Prompt flagship: prompt → self-assembling graph ----------
   Auto-cycles through prompts when in view: types the prompt, streams a short
   reasoning log, then places nodes one-by-one and wires them with marching
   accent edges into a runnable chain. Pick-a-prompt chips switch the build.
   IntersectionObserver gates it; reduced-motion renders the finished static
   graph for the first prompt. Timers only — no rAF, no per-frame allocation.
   Stage is overflow:hidden (CSS) so nothing escapes the card. ---------------- */
(() => {
  const flag = document.getElementById('mpFlag');
  const stage = document.getElementById('mpfStage');
  const nodesLayer = document.getElementById('mpfNodes');
  const edgesSvg = document.getElementById('mpfEdges');
  if (!flag || !stage || !nodesLayer || !edgesSvg) return;

  const promptEl = document.getElementById('mpfPrompt');
  const caret = document.getElementById('mpfCaret');
  const logEl = document.getElementById('mpfLog');
  const statsEl = document.getElementById('mpfStats');
  const statusEl = document.getElementById('mpfStatus');
  const chipsWrap = document.getElementById('mpfChips');
  const reduced = reduceMotion.matches;

  // Each prompt → an ordered build plan. row = vertical slot; col = lane
  // (0=left, 1=center, 2=right) for parallel branches. edges: [from, to].
  const PLANS = [
    {
      text: 'Research 3 competitors and draft a one-page brief.',
      reason: ['Parse intent: research → synthesise → write',
               'Placing Initialiser · trigger',
               'Placing Investigate · web_search',
               'Fan-out: 3 competitor scans',
               'Merge findings → Draft brief'],
      nodes: [
        { name: 'Initialiser', sub: 'trigger', tool: '', row: 0, col: 1, dot: 'dot-done' },
        { name: 'Investigate', sub: 'claude · sonnet', tool: 'web_search', row: 1, col: 1, dot: 'dot-done' },
        { name: 'Parallel · 3 scans', sub: 'fan-out', tool: '', row: 2, col: 1, dot: 'dot-done', accent: 1 },
        { name: 'Merge', sub: 'gpt-4o', tool: 'synthesis', row: 3, col: 1, dot: 'dot-done' },
        { name: 'Draft brief', sub: 'claude · opus', tool: 'write_file', row: 4, col: 1, dot: 'dot-run' },
      ],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
    },
    {
      text: 'Refactor the auth layer, document it, and review.',
      reason: ['Parse intent: refactor + docs + gate',
               'Placing Investigate · read_file',
               'Fanning out: Refactor ∥ Document',
               'Merging both branches',
               'Adding Review gate · hold for sign-off'],
      nodes: [
        { name: 'Investigate', sub: 'gpt-4o', tool: 'read_file', row: 0, col: 1, dot: 'dot-done' },
        { name: 'Refactor', sub: 'claude · opus', tool: 'write_file', row: 1, col: 0, dot: 'dot-done' },
        { name: 'Document', sub: 'claude · sonnet', tool: 'write_file', row: 1, col: 2, dot: 'dot-done' },
        { name: 'Merge', sub: 'gpt-4o', tool: 'synthesis', row: 2, col: 1, dot: 'dot-done' },
        { name: 'Review · gate', sub: 'human checkpoint', tool: '', row: 3, col: 1, dot: 'dot-run', accent: 1 },
      ],
      edges: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]],
    },
    {
      text: 'Summarise these docs, then fact-check the summary.',
      reason: ['Parse intent: summarise → verify',
               'Placing Summarise · read_file',
               'Adding Fact-check · web_search',
               'Closing with Apply · final answer'],
      nodes: [
        { name: 'Summarise', sub: 'claude · sonnet', tool: 'read_file', row: 0, col: 1, dot: 'dot-done' },
        { name: 'Fact-check', sub: 'gpt-4o', tool: 'web_search', row: 1, col: 1, dot: 'dot-done', accent: 1 },
        { name: 'Apply', sub: 'claude · opus', tool: 'write_file', row: 2, col: 1, dot: 'dot-run' },
      ],
      edges: [[0, 1], [1, 2]],
    },
  ];

  let current = 0;
  let timers = [];
  let typeTimer = null;
  let running = false;     // a build is animating
  let inView = false;
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; } };
  const after = (ms, fn) => { const t = setTimeout(fn, ms); timers.push(t); return t; };

  const ROW_H = 76, TOP = 18, NODE_W = 172;
  const laneX = (col) => {
    const w = stage.clientWidth || 480;
    const center = (w - NODE_W) / 2;
    const off = Math.min(130, Math.max(70, (w - NODE_W) / 2 - 12));
    if (col === 0) return Math.max(12, center - off);
    if (col === 2) return Math.min(w - NODE_W - 12, center + off);
    return Math.max(12, center);
  };
  const nodeY = (row) => TOP + row * ROW_H;

  const setStatus = (cls, txt) => { if (statusEl) statusEl.innerHTML = `<span class="dot ${cls}"></span> ${txt}`; };

  function makeNode(n) {
    const el = document.createElement('div');
    el.className = 'mpf-node';
    el.style.left = laneX(n.col) + 'px';
    el.style.top = nodeY(n.row) + 'px';
    const pill = n.tool ? `<span class="mpf-pill">${n.tool}</span>` : '';
    const subCls = n.accent ? 'mpf-pill mpf-pill-accent' : 'mpf-pill';
    el.innerHTML =
      `<div class="mpf-node-head"><span class="dot ${n.dot}"></span>`
      + `<span class="mpf-node-name">${n.name}</span></div>`
      + `<div class="mpf-node-sub"><span class="${subCls}">${n.sub}</span>${pill}</div>`;
    nodesLayer.appendChild(el);
    return el;
  }

  function makeEdge(plan, els, a, b) {
    const from = plan.nodes[a], to = plan.nodes[b];
    const fromEl = els[a];
    const x1 = laneX(from.col) + NODE_W / 2;
    const y1 = nodeY(from.row) + (fromEl ? fromEl.offsetHeight : 54);
    const x2 = laneX(to.col) + NODE_W / 2;
    const y2 = nodeY(to.row);
    const midY = (y1 + y2) / 2;
    const d = `M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'mpf-edge');
    path.setAttribute('d', d);
    edgesSvg.appendChild(path);
    return path;
  }

  function logRow(txt, done) {
    const row = document.createElement('div');
    row.className = 'mpf-log-row';
    row.innerHTML = `<span class="mpf-log-mark${done ? ' mpf-log-mark-done' : ''}">${done ? '✓' : '›'}</span><span>${txt}</span>`;
    logEl.appendChild(row);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function resetStage() {
    clearTimers();
    nodesLayer.innerHTML = '';
    edgesSvg.innerHTML = '';
    logEl.innerHTML = '';
    if (statsEl) statsEl.textContent = '0 nodes · 0 edges';
  }

  // Render the finished graph instantly (reduced motion + static fallback).
  function showFinished(idx) {
    resetStage();
    const plan = PLANS[idx];
    if (promptEl) promptEl.textContent = plan.text;
    const els = [];
    plan.nodes.forEach((n, i) => { const el = makeNode(n); el.classList.add('in'); els[i] = el; });
    plan.edges.forEach((e) => { const p = makeEdge(plan, els, e[0], e[1]); p.classList.add('in'); });
    plan.reason.forEach((r) => logRow(r, true));
    logRow(`Graph ready · ${plan.nodes.length} nodes wired`, true);
    if (statsEl) statsEl.textContent = `${plan.nodes.length} nodes · ${plan.edges.length} edges`;
    setStatus('dot-done', 'graph ready');
  }

  function typePrompt(text, done) {
    if (!promptEl) { done(); return; }
    promptEl.textContent = '';
    let i = 0;
    const tick = () => {
      promptEl.textContent = text.slice(0, i);
      i++;
      if (i <= text.length) typeTimer = setTimeout(tick, 16);
      else { typeTimer = null; done(); }
    };
    tick();
  }

  function build(idx) {
    if (running) return;
    running = true;
    current = idx;
    resetStage();
    const plan = PLANS[idx];
    setStatus('dot-run pulse-run', 'building');

    typePrompt(plan.text, () => {
      const step = 540, lstep = 380;
      const els = [], paths = [];

      // stream reasoning
      plan.reason.forEach((r, i) => after(i * lstep, () => logRow(r, false)));

      // place nodes + wire edges into them
      const nodeStart = plan.reason.length * lstep * 0.5;
      plan.nodes.forEach((n, i) => {
        after(nodeStart + i * step, () => {
          const el = makeNode(n);
          els[i] = el;
          el.classList.add('placing');
          void el.offsetWidth;
          el.classList.add('in');
          after(260, () => el.classList.remove('placing'));
          if (statsEl) statsEl.textContent = `${els.filter(Boolean).length} nodes · ${paths.length} edges`;
          plan.edges.forEach((e) => {
            if (e[1] === i && els[e[0]]) {
              after(200, () => {
                const p = makeEdge(plan, els, e[0], e[1]);
                p.getBoundingClientRect();
                p.classList.add('in');
                paths.push(p);
                if (statsEl) statsEl.textContent = `${els.filter(Boolean).length} nodes · ${paths.length} edges`;
              });
            }
          });
        });
      });

      // finish + hold, then advance to the next prompt
      const doneAt = nodeStart + plan.nodes.length * step + 360;
      after(doneAt, () => {
        Array.prototype.forEach.call(logEl.querySelectorAll('.mpf-log-row'), (row) => {
          const mark = row.querySelector('.mpf-log-mark');
          if (mark) { mark.textContent = '✓'; mark.classList.add('mpf-log-mark-done'); }
        });
        logRow(`Graph ready · ${plan.nodes.length} nodes wired`, true);
        setStatus('dot-done', 'graph ready');
        if (statsEl) statsEl.textContent = `${plan.nodes.length} nodes · ${plan.edges.length} edges`;
        running = false;
        after(2600, () => { if (inView && !reduced) { selectChip((current + 1) % PLANS.length); build((current + 1) % PLANS.length); } });
      });
    });
  }

  function selectChip(idx) {
    if (!chipsWrap) return;
    Array.prototype.forEach.call(chipsWrap.querySelectorAll('.mpf-chip'), (c, i) => {
      const on = i === idx;
      c.classList.toggle('on', on);
      c.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  if (chipsWrap) {
    chipsWrap.addEventListener('click', (e) => {
      const chip = e.target.closest('.mpf-chip');
      if (!chip) return;
      const idx = parseInt(chip.getAttribute('data-prompt'), 10) || 0;
      selectChip(idx);
      if (reduced) { showFinished(idx); return; }
      clearTimers();
      running = false;
      build(idx);
    });
  }

  if (reduced) {
    showFinished(0);
    return;
  }

  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) {
      if (!inView) { inView = true; if (!running) { selectChip(current); build(current); } }
    } else {
      inView = false;
      clearTimers();
      running = false;
    }
  }), { threshold: 0.25 });
  io.observe(flag);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearTimers(); running = false; }
    else if (inView && !reduced && !running) { build(current); }
  });
  reduceMotion.addEventListener('change', (e) => { if (e.matches) { clearTimers(); running = false; showFinished(current); } });
})();

/* ---------- Local-network collaboration: roaming cursors ----------
   Perf model: ONE requestAnimationFrame loop drives ALL cursors. Each
   cursor follows a precomputed smooth looping path (Catmull-Rom over a
   handful of waypoints, sampled into a flat lookup table once). The loop
   advances a single phase per cursor, reads its table, and writes one
   transform — no per-cursor timers, no layout reads in the loop.
   IntersectionObserver gates it; reduced-motion leaves the static inline
   positions from the markup untouched. ------------------------------ */
(() => {
  const canvas = document.getElementById('collabCanvas');
  if (!canvas) return;

  const cursors = [
    { el: document.getElementById('cur-ana'), pts: [[22,30],[44,20],[62,34],[40,48],[18,40]], speed: 0.055, t: 0.0 },
    { el: document.getElementById('cur-kai'), pts: [[62,40],[78,58],[58,70],[40,56],[60,42]], speed: 0.047, t: 0.3 },
    { el: document.getElementById('cur-sam'), pts: [[40,52],[24,64],[34,30],[58,26],[46,50]], speed: 0.062, t: 0.6 },
    { el: document.getElementById('cur-you'), pts: [[50,38],[66,30],[72,52],[52,60],[36,44]], speed: 0.04,  t: 0.15 },
  ].filter(c => c.el);
  if (!cursors.length) return;

  // node hotspots (percent of canvas) a cursor can "select" when it passes near
  const nodes = Array.from(canvas.querySelectorAll('[data-cnode]'));

  // Catmull-Rom → flat sampled lookup table (percent coords), built once.
  function buildTable(pts, samples) {
    const n = pts.length, out = [];
    const cr = (p0, p1, p2, p3, u) => {
      const u2 = u * u, u3 = u2 * u;
      return 0.5 * ((2 * p1) + (-p0 + p2) * u +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
    };
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      for (let s = 0; s < samples; s++) {
        const u = s / samples;
        out.push([cr(p0[0], p1[0], p2[0], p3[0], u), cr(p0[1], p1[1], p2[1], p3[1], u)]);
      }
    }
    return out;
  }
  cursors.forEach(c => { c.table = buildTable(c.pts, 36); });

  // Resolve node hotspot centers in percent (recomputed on resize only).
  let nodeSpots = [];
  function measureNodes() {
    const cr = canvas.getBoundingClientRect();
    if (!cr.width || !cr.height) { nodeSpots = []; return; }
    nodeSpots = nodes.map(el => {
      const r = el.getBoundingClientRect();
      return { el, x: ((r.left + r.width / 2) - cr.left) / cr.width * 100, y: ((r.top + r.height / 2) - cr.top) / cr.height * 100 };
    });
  }

  // Reduced-motion / no rAF → keep the static inline left/top from the markup.
  const reduced = reduceMotion.matches;

  // For animation we drive translate in pixels (percent transforms are relative
  // to the element's own box, not the canvas). Convert percent → px each frame
  // using a cached canvas size, refreshed on resize.
  let cw = 0, ch = 0;
  function measureSize() {
    cw = canvas.clientWidth; ch = canvas.clientHeight;
    cursors.forEach(c => { c.el.style.left = '0'; c.el.style.top = '0'; });
  }

  let raf = null, running = false, last = 0;
  function frame(now) {
    if (!running) return;
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;

    for (let i = 0; i < cursors.length; i++) {
      const c = cursors[i], tbl = c.table, L = tbl.length;
      c.t += c.speed * dt;
      if (c.t >= 1) c.t -= 1;
      const f = c.t * L;
      const i0 = Math.floor(f) % L, i1 = (i0 + 1) % L, fr = f - Math.floor(f);
      const a = tbl[i0], b = tbl[i1];
      const px = (a[0] + (b[0] - a[0]) * fr), py = (a[1] + (b[1] - a[1]) * fr);
      c.el.style.transform = `translate3d(${px / 100 * cw}px, ${py / 100 * ch}px, 0)`;
      c.px = px; c.py = py;
    }

    // selection flashes: nearest node within range gets a brief ring
    if (nodeSpots.length) {
      let sel = null, best = 9;
      for (let i = 0; i < cursors.length; i++) {
        const c = cursors[i];
        for (let j = 0; j < nodeSpots.length; j++) {
          const s = nodeSpots[j];
          const d = Math.hypot(c.px - s.x, c.py - s.y);
          if (d < best) { best = d; sel = s.el; }
        }
      }
      for (let j = 0; j < nodeSpots.length; j++) nodeSpots[j].el.classList.toggle('is-selected', nodeSpots[j].el === sel);
    }

    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reduced) return; running = true; last = 0; measureSize(); measureNodes(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  if (reduced) return;

  const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) start(); else stop(); }), { threshold: 0.2 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (!reduceMotion.matches) start(); });
  let rt = null; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (running) { measureSize(); measureNodes(); } }, 150); });
  reduceMotion.addEventListener('change', (e) => { if (e.matches) { stop(); } });
})();

/* ============================================================
   THREE.JS — single shared mount/lifecycle helper for BOTH canvases
============================================================ */
function mountWebGL(canvas, onFallback) {
  // Feature-detect WebGL before asking three.js to build a renderer.
  let probe = null;
  try { probe = canvas.getContext('webgl2') || canvas.getContext('webgl'); } catch (e) { probe = null; }
  if (!probe) { try { onFallback(); } catch (_) {} return null; }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.innerWidth > 768, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false });
    // DPR hard-capped at 2 to bound fill cost on hi-dpi displays.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  } catch (e) { try { onFallback(); } catch (_) {} return null; }
  return renderer;
}

// Safe, capped DPR value reused by point-size uniforms.
const DPR2 = Math.min(window.devicePixelRatio || 1, 2);

/* ============ HERO DATA-FIELD (refined monochrome, NO bottom curve) ============ */
(() => {
  const canvas = document.getElementById('hero-canvas');
  const fallback = document.getElementById('hero-fallback');
  if (!canvas) return;
  const showFallback = () => { canvas.style.display = 'none'; if (fallback) fallback.classList.remove('hidden'); };

  const renderer = mountWebGL(canvas, showFallback);
  if (!renderer) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 14;
  const group = new THREE.Group();
  scene.add(group);

  const CLUSTERS = [
    new THREE.Vector3(-6, 5.5, 0), new THREE.Vector3(4, 4.0, -1),
    new THREE.Vector3(-3, 0.5, 1), new THREE.Vector3(6, -1.0, 0),
    new THREE.Vector3(-5, -4.5, -1), new THREE.Vector3(2, -5.5, 1),
  ];
  const isSmall = window.innerWidth <= 768;
  const COUNT = isSmall ? 110 : 220;

  const positions = new Float32Array(COUNT * 3);
  const phases = new Float32Array(COUNT);
  const accents = new Float32Array(COUNT);
  const pts = [];
  let accentBudget = isSmall ? 3 : 5;
  for (let i = 0; i < COUNT; i++) {
    const c = CLUSTERS[i % CLUSTERS.length];
    const x = c.x + (Math.random() - 0.5) * 7;
    const y = c.y + (Math.random() - 0.5) * 5;
    const z = c.z + (Math.random() - 0.5) * 2; // flattened z∈[-2,2]
    positions[i*3] = x; positions[i*3+1] = y; positions[i*3+2] = z;
    phases[i] = Math.random() * Math.PI * 2;
    accents[i] = (accentBudget > 0 && Math.random() < 0.04) ? (accentBudget--, 1.0) : 0.0;
    pts.push(new THREE.Vector3(x, y, z));
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  pGeo.setAttribute('aAccent', new THREE.BufferAttribute(accents, 1));

  const pMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uSize: { value: 6.0 * DPR2 } },
    vertexShader: `
      attribute float aPhase; attribute float aAccent;
      uniform float uTime; uniform float uSize;
      varying float vTw; varying float vAccent; varying float vFade;
      void main(){
        vTw = 0.8 + 0.2 * sin(uTime + aPhase);
        vAccent = aAccent;
        // vertical (+ horizontal) fade: dimmer lower-left so the headline stays legible
        vFade = clamp((position.y + 6.0) / 12.0, 0.35, 1.0);
        vFade *= clamp((position.x + 7.0) / 14.0, 0.5, 1.0);
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = uSize * vTw * (1.0 / -mv.z) * 8.0;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vTw; varying float vAccent; varying float vFade;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.15, d) * 0.5 * vTw * vFade;
        vec3 col = mix(vec3(0.067), vec3(0.388,0.357,1.0), vAccent);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const points = new THREE.Points(pGeo, pMat);
  group.add(points);

  // nearest-neighbour edges, monochrome (NO accent curve)
  const segPos = [], dashSeg = [], edgePool = [];
  const R = 4.5;
  for (let i = 0; i < COUNT; i++) {
    const a = pts[i]; let made = 0;
    for (let j = i + 1; j < COUNT && made < 3; j++) {
      const b = pts[j];
      if (a.distanceTo(b) < R) {
        segPos.push(a.x,a.y,a.z, b.x,b.y,b.z); made++;
        if (a.y > b.y && Math.random() < 0.30) dashSeg.push(a.x,a.y,a.z, b.x,b.y,b.z);
        // collect a candidate pool of edges we can later light up as "wires"
        edgePool.push([a.x,a.y,a.z, b.x,b.y,b.z]);
      }
    }
  }
  const lGeo = new THREE.BufferGeometry();
  lGeo.setAttribute('position', new THREE.Float32BufferAttribute(segPos, 3));
  const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.09 }));
  group.add(lines);

  // downstream travelling dashes marching DOWN — elegant dataflow signal, monochrome
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashSeg, 3));
  const dMat = new THREE.LineDashedMaterial({ color: 0x111111, transparent: true, opacity: 0.32, dashSize: 0.5, gapSize: 2.2 });
  const dashLines = new THREE.LineSegments(dGeo, dMat);
  dashLines.computeLineDistances();
  group.add(dashLines);

  /* "current through the wires": a handful of pre-built accent bundles, each a
     small random subset of edges. They live in the scene at opacity 0 (no
     per-frame allocation). Periodically one bundle is chosen and a bright pulse
     travels ALONG its edges (animated dashOffset) while opacity fades up then
     back to faint. Disabled under prefers-reduced-motion. */
  const ACCENT = 0x635bff;
  const BUNDLES = isSmall ? 3 : 5;          // independent groups we can light
  const PER_BUNDLE = isSmall ? 4 : 7;       // edges per pulse
  const wireBundles = [];
  if (edgePool.length) {
    for (let b = 0; b < BUNDLES; b++) {
      const seg = [];
      for (let k = 0; k < PER_BUNDLE; k++) {
        const e = edgePool[(Math.random() * edgePool.length) | 0];
        seg.push(e[0],e[1],e[2], e[3],e[4],e[5]);
      }
      const wGeo = new THREE.BufferGeometry();
      wGeo.setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
      const wMat = new THREE.LineDashedMaterial({
        color: ACCENT, transparent: true, opacity: 0,
        dashSize: 0.9, gapSize: 3.2,         // a bright dash racing along the wire
      });
      const wLines = new THREE.LineSegments(wGeo, wMat);
      wLines.computeLineDistances();
      group.add(wLines);
      wireBundles.push({ geo: wGeo, mat: wMat });
    }
  }
  // pulse state: -1 = idle, otherwise progress 0→1 over PULSE_DUR seconds
  let activeWire = -1, pulseT = 0, nextPulse = 0.8 + Math.random() * 1.4;
  const PULSE_DUR = 1.4;

  const clock = new THREE.Clock();
  let rafId = null, running = false, lost = false;
  const pointer = { x: 0, y: 0 };

  // Single guarded render — never throws into the console if the GL context died.
  function safeRender() {
    if (lost) return;
    try { renderer.render(scene, camera); } catch (e) { lost = true; stop(); showFallback(); }
  }

  function resize() {
    if (lost) return;
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();

  let dashU = 0;
  function loop() {
    if (!running || lost) return;
    const dt = clock.getDelta();
    dashU -= 1.0 * dt;
    dMat.dashOffset = dashU;
    pMat.uniforms.uTime.value = clock.elapsedTime;

    // "current through the wires" — occasional accent pulse along a random bundle
    if (wireBundles.length) {
      if (activeWire < 0) {
        nextPulse -= dt;
        if (nextPulse <= 0) {
          activeWire = (Math.random() * wireBundles.length) | 0;
          pulseT = 0;
        }
      } else {
        pulseT += dt / PULSE_DUR;
        const mat = wireBundles[activeWire].mat;
        // bright dash races along each edge (offset sweeps the dash through)
        mat.dashOffset = -pulseT * 7.0;
        // fade in on the leading half, out on the trailing half
        mat.opacity = Math.sin(Math.min(1, pulseT) * Math.PI) * 1.0;
        if (pulseT >= 1) {
          mat.opacity = 0;
          activeWire = -1;
          nextPulse = 1.2 + Math.random() * 2.2;
        }
      }
    }
    // frame-rate independent spin (≈0.021 rad/s) + subtle cursor sway on x/y
    group.rotation.y += 0.00035 * 60 * dt;
    const tx = pointer.y * 0.10, ty = pointer.x * 0.10;
    group.rotation.x += (tx - group.rotation.x) * 0.05;
    group.rotation.y += (ty - (group.rotation.y % (Math.PI*2))) * 0.0008;
    camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.05;
    camera.lookAt(0, 0, 0);
    safeRender();
    if (!running || lost) return;
    rafId = requestAnimationFrame(loop);
  }
  function start() { if (running || lost) return; running = true; clock.getDelta(); rafId = requestAnimationFrame(loop); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  // Release GPU + JS memory cleanly (called on context loss / teardown).
  function dispose() {
    stop();
    try {
      pGeo.dispose(); pMat.dispose();
      lGeo.dispose(); lines.material.dispose();
      dGeo.dispose(); dMat.dispose();
      wireBundles.forEach(w => { w.geo.dispose(); w.mat.dispose(); });
      renderer.dispose();
    } catch (_) {}
  }

  if (reduceMotion.matches) safeRender(); else start();
  reduceMotion.addEventListener('change', (e) => { if (lost) return; if (e.matches) { stop(); safeRender(); } else start(); });

  const heroSection = canvas.closest('section');
  const vio = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (reduceMotion.matches || lost) return; if (en.intersectionRatio < 0.12) stop(); else start(); });
  }, { threshold: [0, 0.12] });
  vio.observe(heroSection);

  document.addEventListener('visibilitychange', () => { if (lost) return; if (document.hidden) stop(); else if (!reduceMotion.matches) start(); });

  if (!isTouch) window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }, { passive: true });

  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; vio.disconnect(); dispose(); showFallback(); }, false);
})();

/* ============ VOICEORB PARTICLE SPHERE ============ */
(() => {
  const canvas = document.getElementById('orb-canvas');
  const fb = document.getElementById('voiceOrbFallback');
  const statusEl = document.getElementById('orbStatus');
  if (!canvas) return;
  const showFallback = () => { canvas.style.display = 'none'; if (fb) fb.classList.remove('hidden'); };

  const renderer = mountWebGL(canvas, showFallback);
  if (!renderer) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 4.2;
  const group = new THREE.Group();
  scene.add(group);

  const isSmall = window.innerWidth <= 768;
  const N = isSmall ? 3200 : 6400;
  const positions = new Float32Array(N * 3);
  const rands = new Float32Array(N);
  const GA = Math.PI * (1 + Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const phi = Math.acos(1 - 2 * (i + 0.5) / N);
    const theta = GA * (i + 0.5);
    const r = 1.6;
    positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
    positions[i*3+1] = r * Math.cos(phi);
    positions[i*3+2] = r * Math.sin(phi) * Math.sin(theta);
    rands[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rands, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uTime: { value: 0 }, uAmp: { value: 0.04 }, uEnergy: { value: 0.15 },
      uSize: { value: 26.0 * DPR2 },
      uMouse: { value: new THREE.Vector3(0, 0, 1) }, uMouseInf: { value: 0.0 },
    },
    vertexShader: `
      attribute float aRand; uniform float uTime, uAmp, uEnergy, uSize, uMouseInf;
      uniform vec3 uMouse;
      varying float vEnergy;
      void main(){
        vec3 n = normalize(position);
        float curl = sin(position.x*3.0 + uTime*1.2) * cos(position.y*3.0 - uTime) * 0.5;
        float disp = uAmp * (0.6*sin(uTime*1.4 + aRand*6.0) + curl);
        // gaussian cursor bulge — smooth lean toward the pointer
        float md = dot(n, normalize(uMouse));
        float g = exp(-pow((1.0 - md) * 2.2, 2.0));
        float bulge = uMouseInf * g * 0.35;
        vec3 p = position + n * (disp + bulge);
        vEnergy = uEnergy;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (1.0 / -mv.z) * (0.8 + 0.4*vEnergy);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying float vEnergy;
      void main(){
        vec2 c = gl_PointCoord - 0.5;
        float d = length(c);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.15, d) * 0.7;
        vec3 col = mix(vec3(0.30,0.55,1.0), vec3(0.388,0.357,1.0), vEnergy);
        gl_FragColor = vec4(col, a);
      }`,
  });
  const orb = new THREE.Points(geo, mat);
  group.add(orb);

  const STATES = {
    idle:      { amp: 0.04, spin: 0.0008, energy: 0.15, mouse: 0.0 },
    listening: { amp: 0.10, spin: 0.0012, energy: 0.35, mouse: 1.0 },
    thinking:  { amp: 0.18, spin: 0.003,  energy: 0.60, mouse: 0.2 },
    speaking:  { amp: 0.16, spin: 0.0016, energy: 0.85, mouse: 0.0 },
  };
  const SR = {
    idle: 'VoiceOrb state: idle — a gentle breathing sphere.',
    listening: 'VoiceOrb state: listening — the surface ripples toward your cursor as it captures speech.',
    thinking: 'VoiceOrb state: thinking — turbulent high-frequency motion while it plans the edit.',
    speaking: 'VoiceOrb state: speaking — rhythmic pulses in blue and accent as it applies the change.',
  };
  let target = STATES.idle, targetName = 'idle', spin = 0.0008;
  const cur = { amp: 0.04, energy: 0.15, mouse: 0.0 };
  const mouse3 = new THREE.Vector3(0, 0, 1);

  const chips = document.querySelectorAll('#voiceChips .vchip');
  function setState(name) {
    target = STATES[name]; targetName = name;
    chips.forEach(c => c.classList.toggle('active', c.dataset.state === name));
    if (statusEl) statusEl.textContent = SR[name];
  }
  chips.forEach(c => c.addEventListener('click', () => { setState(c.dataset.state); userCycle = true; }));

  // auto-cycle until the user interacts
  let userCycle = false;
  const order = ['idle','listening','thinking','speaking'];
  let ci = 0;
  setInterval(() => { if (userCycle) return; ci = (ci + 1) % order.length; setState(order[ci]); }, 3200);

  const clock = new THREE.Clock();
  let rafId = null, running = false, lost = false;

  function safeRender() {
    if (lost) return;
    try { renderer.render(scene, camera); } catch (e) { lost = true; stop(); showFallback(); }
  }

  function resize() {
    if (lost) return;
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();

  function loop() {
    if (!running || lost) return;
    const dt = clock.getDelta();
    const t = clock.elapsedTime;
    // speaking envelope — dual-modulate amp (~2.5Hz) AND energy (~2.9Hz), within 2–4Hz spec
    let tAmp = target.amp, tEnergy = target.energy;
    if (targetName === 'speaking') {
      tAmp = 0.06 + 0.16 * (0.5 + 0.5 * Math.sin(t * 16.0));
      tEnergy = 0.7 + 0.15 * (0.5 + 0.5 * Math.sin(t * 18.0));
    }
    cur.amp += (tAmp - cur.amp) * 0.06;
    cur.energy += (tEnergy - cur.energy) * 0.06;
    cur.mouse += (target.mouse - cur.mouse) * 0.06;
    spin += (target.spin - spin) * 0.06;
    mat.uniforms.uTime.value = t;
    mat.uniforms.uAmp.value = cur.amp;
    mat.uniforms.uEnergy.value = cur.energy;
    mat.uniforms.uMouseInf.value = cur.mouse;
    mat.uniforms.uMouse.value.lerp(mouse3, 0.05);
    // frame-rate independent group spin
    group.rotation.y += spin * 60 * dt;
    safeRender();
    if (!running || lost) return;
    rafId = requestAnimationFrame(loop);
  }
  function start() { if (running || lost) return; running = true; clock.getDelta(); rafId = requestAnimationFrame(loop); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }

  function dispose() {
    stop();
    try { geo.dispose(); mat.dispose(); renderer.dispose(); } catch (_) {}
  }

  if (reduceMotion.matches) safeRender(); else start();
  reduceMotion.addEventListener('change', (e) => { if (lost) return; if (e.matches) { stop(); safeRender(); } else start(); });

  const sect = canvas.closest('section');
  const vio = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (reduceMotion.matches || lost) return; if (en.intersectionRatio < 0.12) stop(); else start(); });
  }, { threshold: [0, 0.12] });
  vio.observe(sect);

  document.addEventListener('visibilitychange', () => { if (lost) return; if (document.hidden) stop(); else if (!reduceMotion.matches) start(); });

  if (!isTouch) {
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
      mouse3.set(nx, ny, 0.8).normalize();
    }, { passive: true });
    // decay cursor influence to 0 when the pointer leaves the orb
    canvas.addEventListener('pointerleave', () => { if (targetName !== 'listening') target = STATES[targetName]; });
  }

  let rt = null;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); lost = true; vio.disconnect(); dispose(); showFallback(); }, false);
})();
