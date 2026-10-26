(() => {
  let lenis = null; // set later when smooth scrolling starts; the filter scrolls through it when present

  // English Grade 1 braille: letter -> raised dots (1-6)
  const DOTS = {
    a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5],
    h: [1, 2, 5], i: [2, 4], j: [2, 4, 5], k: [1, 3], l: [1, 2, 3], m: [1, 3, 4],
    n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5],
    s: [2, 3, 4], t: [2, 3, 4, 5], u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6],
    x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6], ' ': []
  };
  // Cell grid is 2 columns x 3 rows, so dots fill in this order
  const GRID = [1, 4, 2, 5, 3, 6];

  function renderBraille(el, text) {
    // cells that differ from the previous render pop in; the first render stays still
    const prev = el._cells;
    const next = [];
    el.textContent = '';
    // Unicode braille copy of the cells for screen readers and braille displays
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    el.append(sr);
    for (const ch of text.toLowerCase()) {
      const on = DOTS[ch];
      if (!on) continue;
      const code = String.fromCharCode(0x2800 + on.reduce((sum, n) => sum + (1 << (n - 1)), 0));
      sr.textContent += code;
      const cell = document.createElement('span');
      cell.className = prev && prev[next.length] !== code ? 'cell cell--new' : 'cell';
      cell.setAttribute('aria-hidden', 'true');
      GRID.forEach((n, i) => {
        const dot = document.createElement('span');
        dot.className = on.includes(n) ? 'dot on' : 'dot';
        dot.style.setProperty('--i', i);
        cell.append(dot);
      });
      el.append(cell);
      next.push(code);
    }
    el._cells = next;
  }

  document.querySelectorAll('[data-braille]').forEach(el => renderBraille(el, el.dataset.braille));

  const input = document.getElementById('braille-input');
  const output = document.querySelector('[data-braille-output]');
  if (input && output) {
    input.hidden = false;
    document.querySelector('.try__label').hidden = false;
    const update = () => renderBraille(output, input.value);
    input.addEventListener('input', update);
    update();
  }

  // Nav indicator: underline the link of the section being read (home page only)
  const navLinks = [...document.querySelectorAll('.nav__links a[href^="#"]')];
  if (navLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const seen = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => seen.set(e.target.id, e.isIntersecting));
      // the first section (in page order) that is on screen wins
      const current = [...byId.keys()].find(id => seen.get(id));
      navLinks.forEach(a => a.removeAttribute('aria-current'));
      if (current) byId.get(current).setAttribute('aria-current', 'location');
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  // Project picker: a button moves its project to the top; the others stay below in order.
  // ?project=braille|utcc|flyfood opens the page with that project first.
  const picker = document.querySelector('.tabs');
  if (picker) {
    const buttons = [...picker.querySelectorAll('button')];
    const original = buttons.map(b => document.getElementById('project-' + b.dataset.project));
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bringFirst = (key, { initial = false } = {}) => {
      const chosen = document.getElementById('project-' + key);
      if (!chosen) return;
      // chosen first, the rest keep their original order
      const order = [chosen, ...original.filter(p => p !== chosen)];
      order.forEach(p => picker.parentNode.append(p));
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.project === key)));
      if (initial) return;
      const url = new URL(location.href);
      url.searchParams.set('project', key);
      history.replaceState(null, '', url);
      if (!calm && window.gsap) {
        gsap.fromTo(chosen, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity' });
      }
      // project positions changed, so scroll-driven animations must re-measure
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    picker.addEventListener('click', e => { const b = e.target.closest('button'); if (b) bringFirst(b.dataset.project); });
    picker.hidden = false;
    const wanted = new URLSearchParams(location.search).get('project');
    if (wanted && document.getElementById('project-' + wanted)) {
      bringFirst(wanted, { initial: true });
      requestAnimationFrame(() => {
        const target = document.getElementById('projects');
        if (lenis) lenis.scrollTo(target); else target.scrollIntoView();
      });
    }
  }

  // Gallery lightbox: each [data-lightbox] link points at its full image, so without JS it still opens the picture
  const box = document.querySelector('.lightbox');
  if (box && box.showModal) {
    const boxImg = box.querySelector('img');
    const boxCap = box.querySelector('figcaption');
    document.querySelectorAll('[data-lightbox]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const img = link.querySelector('img');
        boxImg.src = link.href;
        boxImg.alt = img ? img.alt : '';
        boxCap.textContent = link.dataset.caption || '';
        box.showModal();
      });
    });
    box.querySelector('.lightbox__close').addEventListener('click', () => box.close());
    // a click on the backdrop lands on the dialog itself
    box.addEventListener('click', e => { if (e.target === box) box.close(); });
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !window.gsap || !window.ScrollTrigger) return;

  document.documentElement.classList.replace('no-js', 'js');
  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis) {
    lenis = new Lenis({ anchors: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // home and project pages share this script, so each hero piece is animated only if present
  const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (document.querySelector('[data-hero-word]')) {
    // no opacity here: .line clips the words, and keeping them opaque lets LCP fire at first paint
    intro.from('[data-hero-word]', { yPercent: 110, stagger: 0.08, duration: 0.9 });
  }
  intro.from('[data-hero-fade]', { y: 20, opacity: 0, stagger: 0.1, duration: 0.7 }, '-=0.5');
  if (document.querySelector('.detect')) {
    // signature: the detection box locks onto the face and its confidence counts up
    intro
      .from('.detect', { scale: 1.25, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.2')
      .from('[data-confidence]', {
        textContent: 0,
        duration: 0.8,
        ease: 'power1.out',
        snap: { textContent: 0.01 },
        onUpdate() { this.targets()[0].textContent = Number(this.targets()[0].textContent).toFixed(2); }
      }, '<');
  }

  gsap.utils.toArray('[data-reveal]').forEach(el => {
    gsap.from(el, { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });

  gsap.utils.toArray('[data-parallax]').forEach(el => {
    gsap.fromTo(el, { y: 40 }, { y: -40, ease: 'none', scrollTrigger: { trigger: el, scrub: true } });
  });

  gsap.utils.toArray('[data-stagger]').forEach(group => {
    gsap.from(group.children, { y: 16, opacity: 0, stagger: 0.04, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: group, start: 'top 85%', once: true } });
  });

  // Scan line: a camera line sweeps down each project picture and uncovers it, once
  gsap.utils.toArray('[data-scan]').forEach(fig => {
    const imgs = fig.querySelectorAll('img');
    const line = document.createElement('span');
    line.className = 'scanline';
    line.setAttribute('aria-hidden', 'true');
    fig.append(line);
    gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 80%', once: true } })
      .fromTo(imgs, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.1, ease: 'power2.inOut' })
      .fromTo(line, { top: '0%', opacity: 1 }, { top: '100%', duration: 1.1, ease: 'power2.inOut' }, '<')
      .to(line, { opacity: 0, duration: 0.25 });
  });

  // Hero tracking: the detection box follows the mouse over the portrait and names what it lands on
  const portrait = document.querySelector('.hero__portrait');
  const detect = document.querySelector('.detect');
  if (portrait && detect && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const frame = portrait.querySelector('.portrait__frame');
    const name = detect.querySelector('.detect__name');
    const conf = detect.querySelector('[data-confidence]');
    const moveX = gsap.quickTo(detect, 'x', { duration: 0.45, ease: 'power3.out' });
    const moveY = gsap.quickTo(detect, 'y', { duration: 0.45, ease: 'power3.out' });
    // rough regions of avatar.webp, as fractions of the frame (x from left, y from top)
    const label = (fx, fy) => {
      if (fx < 0.12 || fx > 0.88 || fy < 0) return ['background', '0.12'];
      if (fy < 0.4) return ['bavonvit', '0.99'];
      if (fy < 0.72) return fx > 0.42 && fx < 0.58 ? ['tie', '0.91'] : ['shirt', '0.94'];
      return ['pants', '0.89'];
    };
    const setLabel = ([n, c]) => { if (name.textContent !== n) { name.textContent = n; conf.textContent = c; } };
    portrait.addEventListener('pointermove', e => {
      const f = frame.getBoundingClientRect();
      // home centre of the box in frame pixels (its CSS position, ignoring the current translate)
      const homeX = detect.offsetLeft + detect.offsetWidth / 2;
      const homeY = detect.offsetTop + detect.offsetHeight / 2;
      const px = Math.min(Math.max(e.clientX - f.left, 0), f.width);
      const py = Math.min(Math.max(e.clientY - f.top, 0), f.height);
      moveX(px - homeX);
      moveY(py - homeY);
      setLabel(label(px / f.width, (e.clientY - f.top) / f.height));
    });
    portrait.addEventListener('pointerleave', () => { moveX(0); moveY(0); setLabel(['bavonvit', '0.99']); });
  }

  // Magnetic buttons: primary buttons lean a few pixels toward a mouse pointer
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 12;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 12;
        btn.style.transform = `translate(${x.toFixed(1)}px, ${(y - 2).toFixed(1)}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }
})();
