(function () {
  const codes = LANGS.map(l => l[0]);
  const idx = code => codes.indexOf(code);
  const store = {
    get() { try { return localStorage.getItem("lang"); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem("lang", v); } catch (e) {} }
  };

  function pickLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (codes.includes(q)) return q;
    const saved = store.get();
    if (codes.includes(saved)) return saved;
    for (const l of navigator.languages || [navigator.language || ""]) {
      const c = l.slice(0, 2).toLowerCase();
      if (codes.includes(c)) return c;
    }
    return "en";
  }

  let lang = pickLang();
  let filter = "all";
  let visible = [];
  let current = 0;

  const grid = document.querySelector(".grid");
  const filters = document.querySelector(".filters");
  const langBox = document.querySelector(".langs");
  const lb = document.querySelector(".lightbox");
  const lbImg = lb.querySelector("img");
  const lbTitle = lb.querySelector(".lb-title");

  const lbMeta = lb.querySelector(".lb-meta");
  const title = w => w[4][idx(lang)];

  // «Техника · 32 × 46 см · 2024» и пометка о музее или частной коллекции
  function meta(w) {
    const parts = [];
    const m = META[w[0]];
    if (m) {
      const i = idx(lang);
      const num = v => (lang === "en" ? String(v) : String(v).replace(".", ","));
      let size = "—";
      if (m[1]) {
        size = m[1].map(num).join(" × ") + (lang === "uk" ? " см" : " cm");
        if (lang === "en") size += " (" + m[1].map(v => (v / 2.54).toFixed(1)).join(" × ") + " in)";
      }
      parts.push(MEDIA[m[0]][i], size, m[2] ? String(m[2]) : "—");
    }
    const st = STATUS[w[0]];
    if (st) parts.push(T[lang]["st_" + st]);
    return parts.join(" · ");
  }

  // Галерея строится один раз, при смене языка меняются только подписи
  WORKS.forEach((w, i) => {
    const fig = document.createElement("figure");
    fig.className = "card";
    fig.dataset.i = i;
    fig.dataset.cat = w[3];
    const img = document.createElement("img");
    img.src = "img/thumbs/" + w[0] + ".jpg";
    img.width = w[1];
    img.height = w[2];
    img.loading = "lazy";
    img.decoding = "async";
    const cap = document.createElement("figcaption");
    fig.append(img, cap);
    fig.tabIndex = 0;
    fig.addEventListener("click", () => open(i));
    fig.addEventListener("keydown", e => { if (e.key === "Enter") open(i); });
    grid.append(fig);
  });

  LANGS.forEach(([code, label]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.dataset.lang = code;
    b.addEventListener("click", () => { lang = code; store.set(code); render(); });
    langBox.append(b);
  });

  Object.keys(CATS).forEach(cat => {
    if (cat !== "all" && !WORKS.some(w => w[3] === cat)) return;
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.cat = cat;
    b.addEventListener("click", () => { filter = cat; applyFilter(); });
    filters.append(b);
  });

  function applyFilter() {
    filters.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.cat === filter));
    grid.querySelectorAll(".card").forEach(c => { c.hidden = filter !== "all" && c.dataset.cat !== filter; });
    visible = [...grid.querySelectorAll(".card:not([hidden])")].map(c => +c.dataset.i);
  }

  function render() {
    const t = T[lang];
    document.documentElement.lang = lang;
    document.title = NAME[lang] + " — " + t.hero_eyebrow.split(" · ").slice(0, 3).join(", ");
    document.querySelectorAll("[data-t]").forEach(el => { el.textContent = t[el.dataset.t]; });
    document.querySelectorAll("[data-name]").forEach(el => { el.textContent = NAME[lang]; });
    document.querySelectorAll("[data-alt]").forEach(el => {
      const k = el.dataset.alt;
      el.alt = k.startsWith("w") ? title(WORKS[+k.slice(1) - 1]) : t[k];
    });
    langBox.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === lang));
    filters.querySelectorAll("button").forEach(b => { b.textContent = CATS[b.dataset.cat][idx(lang)]; });
    grid.querySelectorAll(".card").forEach(c => {
      const w = WORKS[+c.dataset.i];
      c.querySelector("figcaption").textContent = title(w);
      c.querySelector("img").alt = title(w);
    });

    const tl = document.querySelector(".timeline");
    tl.innerHTML = "";
    EXHIBITIONS[lang].forEach(([year, name, place, note]) => {
      const li = document.createElement("li");
      const y = document.createElement("span");
      y.className = "year";
      y.textContent = year;
      const body = document.createElement("div");
      [["ex-title", name], ["ex-place", place], ["ex-note", note]].forEach(([cls, txt]) => {
        if (!txt) return;
        const d = document.createElement("div");
        d.className = cls;
        d.textContent = txt;
        body.append(d);
      });
      li.append(y, body);
      tl.append(li);
    });

    const links = document.querySelector(".contact-links");
    links.innerHTML = "";
    const items = [
      ["Email", CONFIG.email && "mailto:" + CONFIG.email],
      ["Instagram", CONFIG.instagram],
      ["Facebook", CONFIG.facebook]
    ].filter(x => x[1]);
    if (!items.length) {
      const p = document.createElement("p");
      p.textContent = t.contact_soon;
      links.append(p);
    }
    // Видимый адрес и ник, а не пустые плашки: их можно скопировать, даже если ссылка не открылась
    items.forEach(([label, href]) => {
      const row = document.createElement("p");
      row.className = "contact-row";
      const k = document.createElement("span");
      k.className = "contact-label";
      k.textContent = label;
      const a = document.createElement("a");
      a.href = href;
      a.textContent = href.startsWith("mailto:")
        ? href.slice(7)
        : "@" + href.replace(/\/+$/, "").split("/").pop();
      if (!href.startsWith("mailto:")) { a.target = "_blank"; a.rel = "noopener"; }
      row.append(k, a);
      links.append(row);
    });

    if (!lb.hidden) show();
  }

  function show() {
    const w = WORKS[visible[current]];
    lbImg.src = "img/works/" + w[0] + ".jpg";
    lbImg.alt = title(w);
    lbTitle.textContent = title(w);
    lbMeta.textContent = meta(w);
  }
  function open(i) {
    current = Math.max(0, visible.indexOf(i));
    lb.hidden = false;
    document.body.style.overflow = "hidden";
    show();
  }
  function close() {
    lb.hidden = true;
    document.body.style.overflow = "";
  }
  function step(d) {
    current = (current + d + visible.length) % visible.length;
    show();
  }

  lb.querySelector(".lb-close").addEventListener("click", close);
  lb.querySelector(".lb-prev").addEventListener("click", () => step(-1));
  lb.querySelector(".lb-next").addEventListener("click", () => step(1));
  lb.querySelector(".lb-ask").addEventListener("click", close);
  lb.addEventListener("click", e => { if (e.target === lb) close(); });
  document.addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  let x0 = null;
  lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    x0 = null;
  });

  // Каждый пункт меню открывает свой раздел вместо прокрутки длинной страницы.
  // Адрес вида #about можно отправить ссылкой, кнопка «назад» в браузере работает.
  const pages = [...document.querySelectorAll("[data-page]")];
  const navLinks = [...document.querySelectorAll(".nav a")];
  function route() {
    const h = location.hash.slice(1);
    const page = ["about", "exhibitions", "contact"].includes(h) ? h : "gallery";
    pages.forEach(s => { s.hidden = s.dataset.page !== page; });
    navLinks.forEach(a => {
      if (a.getAttribute("href") === "#" + page) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    const target = h === "gallery" ? document.getElementById("gallery") : null;
    const y = target ? target.getBoundingClientRect().top + window.scrollY - document.querySelector(".top").offsetHeight : 0;
    window.scrollTo({ top: Math.max(0, y), behavior: "instant" });
  }
  window.addEventListener("hashchange", route);

  applyFilter();
  render();
  route();
})();
