/* yumm lab · behaviour: i18n, preloader, smooth scroll, reveals, recipe loop, particle hero. */
(() => {
  "use strict";

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const animate = hasGsap && !reduceMotion;

  // Storage can throw (private mode, blocked site data): never let it break the page.
  const safeStore = (area) => ({
    get(key) { try { return window[area].getItem(key); } catch { return null; } },
    set(key, value) { try { window[area].setItem(key, value); } catch { /* ignore */ } },
  });
  const local = safeStore("localStorage");
  const session = safeStore("sessionStorage");

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- i18n ---------- */
  const DICT = window.YUMM_I18N || { en: {} };
  const SUPPORTED = ["en", "th"];
  const t = (lang, key) => (DICT[lang] && DICT[lang][key]) ?? DICT.en[key];
  const langListeners = [];

  function initialLang() {
    const saved = local.get("yumm-lang");
    if (SUPPORTED.includes(saved)) return saved;
    return (navigator.language || "").toLowerCase().startsWith("th") ? "th" : "en";
  }

  function applyLang(lang) {
    root.lang = lang;
    document.title = t(lang, "meta.title");
    $('meta[name="description"]')?.setAttribute("content", t(lang, "meta.desc"));
    $$("[data-i18n]").forEach((el) => {
      const value = t(lang, el.dataset.i18n);
      if (typeof value === "string") el.textContent = value;
    });
    $$("[data-i18n-aria]").forEach((el) => {
      const value = t(lang, el.dataset.i18nAria);
      if (typeof value === "string") el.setAttribute("aria-label", value);
    });
    $$(".lang__btn").forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang)));
    langListeners.forEach((fn) => fn(lang));
  }

  let currentLang = initialLang();
  applyLang(currentLang);
  $$(".lang__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = btn.dataset.lang;
      if (next === currentLang || !SUPPORTED.includes(next)) return;
      currentLang = next;
      local.set("yumm-lang", next);
      applyLang(next);
      if (hasGsap) ScrollTrigger.refresh();
    });
  });

  /* ---------- clock (Bangkok) ---------- */
  const clock = $("#clock");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
    const tick = () => { const now = new Date(); clock.textContent = fmt.format(now); clock.dateTime = now.toISOString(); };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- smooth scroll + anchors ---------- */
  let lenis = null;
  if (animate && typeof window.Lenis !== "undefined") {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      const target = id === "#top" ? document.body : $(id);
      if (!target) return;
      event.preventDefault();
      if (lenis) lenis.scrollTo(id === "#top" ? 0 : target, { offset: -110, duration: 1.2 });
      else if (id === "#top") window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      if (id !== "#top") { target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true }); }
    });
  });

  /* ---------- nav: status strip tucks away while scrolling down ---------- */
  const nav = $("#nav");
  if (hasGsap && nav) {
    let lastY = 0;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate(self) {
        const y = self.scroll();
        if (y < 80) nav.classList.remove("is-compact");
        else if (y > lastY + 2) nav.classList.add("is-compact");
        else if (y < lastY - 2) nav.classList.remove("is-compact");
        lastY = y;
      },
    });
  }

  /* ---------- ticker speeds up with scroll velocity ---------- */
  const ticker = $("#ticker");
  if (animate && ticker?.getAnimations) {
    const anim = ticker.getAnimations()[0];
    if (anim) {
      let boost = 1;
      ScrollTrigger.create({ start: 0, end: "max", onUpdate(self) { boost = Math.min(5, 1 + Math.abs(self.getVelocity()) / 500); } });
      gsap.ticker.add(() => { boost += (1 - boost) * 0.06; anim.playbackRate = boost; });
    }
  }

  /* ---------- intro statement: words go grey -> ink as you read ---------- */
  const words = $("#kitchen .words");
  let wordsTween = null;
  function splitWords(el) {
    const text = el.textContent;
    const seg = typeof Intl.Segmenter === "function" ? new Intl.Segmenter(root.lang, { granularity: "word" }) : null;
    const parts = seg
      ? Array.from(seg.segment(text), (s) => ({ text: s.segment, word: s.isWordLike }))
      : text.split(/(\s+)/).map((s) => ({ text: s, word: /\S/.test(s) }));
    el.textContent = "";
    parts.forEach(({ text: part, word }) => {
      if (!word) { el.appendChild(document.createTextNode(part)); return; }
      const span = document.createElement("span");
      span.className = "w";
      span.textContent = part;
      el.appendChild(span);
    });
    return $$(".w", el);
  }
  function buildWords() {
    if (!animate || !words) return;
    if (wordsTween) { wordsTween.scrollTrigger?.kill(); wordsTween.kill(); }
    wordsTween = gsap.fromTo(splitWords(words), { opacity: 0.18 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: words, start: "top 80%", end: "top 45%", scrub: 0.6 },
    });
  }
  buildWords();
  langListeners.push(buildWords);

  /* ---------- reveals ---------- */
  if (animate) {
    $$(".head, .pain, .crew__copy, .faq__copy, .foot__top").forEach((el) => {
      gsap.from(el, { y: 32, opacity: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
    gsap.from(".row", { y: 36, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".rows", start: "top 85%", once: true } });
    gsap.from(".qa", { x: 48, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".faq__list", start: "top 85%", once: true } });
    gsap.from(".faces li", { opacity: 0, y: 20, duration: 0.8, ease: "expo.out", stagger: { each: 0.05, from: "random" }, clearProps: "transform,opacity", scrollTrigger: { trigger: ".faces", start: "top 85%", once: true } });

    // band opens up from a narrow slot as it scrolls in
    gsap.fromTo("#band", { clipPath: "inset(14% 8% 14% 8% round 32px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 32px)", ease: "none",
      scrollTrigger: { trigger: ".band", start: "top 90%", end: "top 30%", scrub: 0.6 },
    });
    gsap.fromTo(".band__thin", { xPercent: -8 }, { xPercent: 0, ease: "none", scrollTrigger: { trigger: ".band", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo(".band__bold", { xPercent: 6 }, { xPercent: -2, ease: "none", scrollTrigger: { trigger: ".band", start: "top bottom", end: "bottom top", scrub: true } });

    // footer wordmark fills with volt from left to right
    gsap.fromTo("#foot-fill", { clipPath: "inset(0% 100% 0% 0%)" }, {
      clipPath: "inset(0% 0% 0% 0%)", ease: "none",
      scrollTrigger: { trigger: "#foot-mark", start: "top 95%", end: "bottom 95%", scrub: 0.8 },
    });
  }

  /* ---------- recipe: pinned loop, one step lit at a time ---------- */
  const recipe = $("#recipe");
  const loop = $("#loop");
  if (hasGsap && recipe && loop) {
    const cards = $$(".card", loop);
    const segs = $$(".loop__seg", loop);
    const track = $("#loop-track");
    const linesSvg = $("#loop-lines");
    const keycap = $("#keycap");
    const lean = [[-16, -12, -12], [16, -12, 12], [16, 12, 24], [-16, 12, -24]]; // tl, tr, br, bl
    let active = -1;
    const centre = (el, box) => { const r = el.getBoundingClientRect(); return [r.left - box.left + r.width / 2, r.top - box.top + r.height / 2]; };
    function drawLines() {
      const box = loop.getBoundingClientRect();
      linesSvg.setAttribute("viewBox", `0 0 ${box.width.toFixed(1)} ${box.height.toFixed(1)}`);
      const pts = cards.map((c) => centre(c, box));
      segs.forEach((seg, i) => seg.setAttribute("d", `M${pts[i][0]} ${pts[i][1]}L${pts[i + 1][0]} ${pts[i + 1][1]}`));
      track.setAttribute("d", `M${pts.map((p) => p.join(" ")).join("L")}Z`);
    }
    function setActive(index) {
      if (index === active) return;
      active = index;
      cards.forEach((card, i) => { card.classList.toggle("is-active", i === index); card.classList.toggle("is-done", i < index); });
      segs.forEach((seg, i) => seg.classList.toggle("is-drawn", i < index));
      const [kx, ky, kr] = lean[index];
      keycap.style.setProperty("--kx", `${kx}px`);
      keycap.style.setProperty("--ky", `${ky}px`);
      keycap.style.setProperty("--kr", `${kr}deg`);
      keycap.classList.add("is-pressed");
      setTimeout(() => keycap.classList.remove("is-pressed"), 140);
    }
    gsap.matchMedia().add("(min-width: 861px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)", () => {
      recipe.classList.add("is-pinned");
      active = -1;
      setActive(0);
      drawLines();
      ScrollTrigger.addEventListener("refresh", drawLines);
      const st = ScrollTrigger.create({ trigger: recipe, start: "top top", end: "bottom bottom", onUpdate: (self) => setActive(Math.min(3, Math.floor(self.progress * 4))) });
      return () => {
        st.kill();
        ScrollTrigger.removeEventListener("refresh", drawLines);
        recipe.classList.remove("is-pinned");
        cards.forEach((c) => c.classList.remove("is-active", "is-done"));
      };
    });
    langListeners.push(() => requestAnimationFrame(drawLines));
  }

  /* ---------- 3D particle flask ---------- */
  const canvas = $("#particles");
  let flask = null;
  // Fit the flask inside the free area of the hero: below the nav, right of the copy and
  // above the facts row (mobile: above the copy). Measured, so nothing collides.
  const MODEL_H = 1.67;        // flask height in model units (lip to base)
  const MODEL_W = 1.45;        // widest diameter
  const MODEL_MID = -0.035;    // model y at the vertical middle
  const HEADROOM = 1.3;        // room for perspective, tilt toward the cursor and the click squish
  // Dots have a fixed pixel size, so a smaller flask packs them tighter until it reads as a
  // dark blob. Match the ink density of the approved desktop flask (1440x900, ~83k dots).
  const REF_H = 470;           // just under heightPx of the flask at 1440x900 (its outline measures ~562px)
  const REF_COUNT = 83100;     // buildCloud(80000) incl. face points
  const flaskLayout = (w, h, count = REF_COUNT) => {
    const c = canvas.getBoundingClientRect();
    const nav = $("#nav");
    const mobile = w <= 860;
    const top = nav.offsetTop + nav.offsetHeight + (mobile ? 16 : 28) - (c.top + window.scrollY);
    let bottom, left, right;
    if (mobile) {
      bottom = $(".hero__copy").getBoundingClientRect().top - c.top - 12;
      left = 16;
      right = w - 16;
    } else {
      bottom = $(".facts").getBoundingClientRect().top - c.top - 32;
      left = $(".hero__copy").getBoundingClientRect().right - c.left + 48;
      right = w - 48;
    }
    const boxH = Math.max(80, bottom - top);
    const boxW = Math.max(80, right - left);
    const heightPx = Math.min(boxH / HEADROOM, (boxW / HEADROOM) * (MODEL_H / MODEL_W));
    const scale = heightPx / MODEL_H / (h / 2);
    const cx = ((left + right) / 2 / w) * 2 - 1;
    const cy = 1 - ((top + bottom) / 2 / h) * 2 - MODEL_MID * scale;
    const size = Math.min(1, heightPx / REF_H);
    const dot = mobile ? 0.75 + 0.25 * size : 1; // slightly finer dots keep more detail when small
    const keep = Math.min(1, (size * size * (REF_COUNT / count)) / (dot * dot));
    return { cx, cy, scale, dot, keep };
  };
  if (canvas && window.YummFlask) {
    try {
      flask = window.YummFlask.create(canvas, { reduce: reduceMotion, layout: flaskLayout });
      root.classList.add("has-particles");
      if (new URLSearchParams(location.search).has("debug")) window.__flask = flask; // layout tests
      // copy width changes once web fonts land and when the language switches: refit
      document.fonts?.ready.then(() => flask.relayout());
      langListeners.push(() => requestAnimationFrame(() => flask.relayout()));
      // the flask is a character: hover shows a pointer, click makes it squish and bounce
      const heroEl = $(".hero");
      const onFlask = (e) => !e.target.closest("a, button") && flask.hits(e.clientX, e.clientY);
      heroEl.addEventListener("pointermove", (e) => { heroEl.classList.toggle("is-over-flask", onFlask(e)); }, { passive: true });
      heroEl.addEventListener("click", (e) => { if (onFlask(e)) flask.poke(); });
    } catch (err) {
      console.warn("3D flask unavailable, showing the static mark", err);
    }
  }

  /* ---------- mobile menu ---------- */
  const menuBtn = $("#menu-btn");
  const menu = $("#menu");
  if (menuBtn && menu) {
    const setMenu = (open) => {
      menuBtn.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      if (open) menu.querySelector("a")?.focus();
    };
    menuBtn.addEventListener("click", () => setMenu(menu.hidden));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); }
    });
    document.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest("#nav")) setMenu(false); });
  }

  /* ---------- scroll-spy: highlight the section in view ---------- */
  const spyLinks = $$(".nav__links a, .menu nav a");
  const spySections = ["kitchen", "stove", "recipe", "crew", "faq"].map((id) => document.getElementById(id)).filter(Boolean);
  if ("IntersectionObserver" in window && spySections.length) {
    const ratios = new Map();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio + 0.001 : 0));
      let best = null, bestRatio = 0;
      ratios.forEach((ratio, id) => { if (ratio > bestRatio) { best = id; bestRatio = ratio; } });
      spyLinks.forEach((a) => {
        const on = best !== null && a.getAttribute("href") === "#" + best;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.01, 0.5, 1] });
    spySections.forEach((sec) => spy.observe(sec));
  }

  /* ---------- preloader + hero entrance ---------- */
  const loader = $("#loader");
  const hero = $(".hero");

  function heroEntrance(delay = 0) {
    flask?.assemble();
    if (!animate) return;
    hero.classList.add("is-revealing");
    gsap.timeline({ delay, onComplete: () => hero.classList.remove("is-revealing") })
      .from(".hero .line__in", { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.1 })
      .from(".hero .tag, .hero__lede, .hero__actions", { y: 20, opacity: 0, duration: 0.8, ease: "expo.out", stagger: 0.08 }, "-=0.8")
      .from(".facts > div", { y: 16, opacity: 0, duration: 0.7, ease: "expo.out", stagger: 0.06 }, "-=0.6")
      .from(".nav__pill, .nav__status", { y: -40, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, clearProps: "transform,opacity" }, 0);
  }
  function finishLoader() {
    root.classList.remove("is-loading");
    loader?.classList.add("is-gone");
    lenis?.start();
  }

  const firstVisit = session.get("yumm-preheated") !== "1";
  if (!loader || !animate || !firstVisit) {
    finishLoader();
    heroEntrance(0.05);
  } else {
    session.set("yumm-preheated", "1");
    loader.classList.add("is-driven");
    root.classList.add("is-loading");
    lenis?.stop();

    const num = $("#loader-num");
    const fill = $("#loader-fill");
    const bar = $("#loader-bar");
    const heat = $("#loader-heat");
    const outline = $("#loader-outline");
    const stats = $$("[data-curve]", loader);
    const counter = { value: 0 };
    const pad = (n) => String(Math.round(n)).padStart(3, "0");
    // every stat lands on 100 together; the curve exponent decides who rushes and who lags
    const render = () => {
      const v = counter.value;
      const p = v / 100;
      num.textContent = pad(v);
      fill.style.transform = `translateY(${(-v * 2.3).toFixed(1)}px)`;
      bar.style.transform = `scaleX(${p.toFixed(3)})`;
      heat.textContent = pad(180 * p);
      outline.style.strokeDashoffset = String(1 - Math.min(1, p * 1.6));
      stats.forEach((el) => { el.textContent = `${pad(100 * Math.pow(p, parseFloat(el.dataset.curve)))}%`; });
    };
    render();
    const pageReady = new Promise((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    });
    const capped = Promise.race([pageReady, new Promise((r) => setTimeout(r, 1800))]);
    gsap.to(counter, { value: 72, duration: 1, ease: "power2.out", onUpdate: render });
    capped.then(() => {
      gsap.timeline()
        .to(counter, { value: 100, duration: 0.5, ease: "power2.inOut", overwrite: true, onUpdate: render })
        .to(loader, { yPercent: -100, duration: 1, ease: "expo.inOut", onComplete: finishLoader }, "+=0.2")
        .add(() => heroEntrance(0), "-=0.55");
    });
  }
})();
