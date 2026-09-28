/* Home page — featured publications, news, citations chart */
(function () {
  "use strict";

  document.addEventListener("site:ready", async () => {
    const lang = SiteUtils.getLang();
    document.querySelectorAll(".hero-v2-sub").forEach(el => { el.style.display = (el.getAttribute("lang") === lang) ? "" : "none"; });
    try {
      const [topics, pubs, gallery] = await Promise.all([
        SiteUtils.loadJSON("data/research_topics.json"),
        SiteUtils.loadJSON("data/publications.json"),
        SiteUtils.loadJSON("data/gallery.json")
      ]);
      renderTopics(topics);
      renderNewsFromGallery(gallery);
      renderGallerySlider(gallery);
      renderPubSlider(pubs);
      renderCitationsChart(SiteUtils.getConfig().citations_history || []);
    } catch (err) { console.error(err); }
  });

  // Scholar 비동기 fetch 완료 시 차트 다시 그림
  document.addEventListener("scholar:history", (e) => {
    if (e.detail && e.detail.length) renderCitationsChart(e.detail);
  });

  function renderTeam(members) {
    const host = document.getElementById("home-team");
    if (!host) return;
    const lang = SiteUtils.getLang();
    const ROLE_ORDER = ["phd", "ms", "bs", "undergraduate"];
    const ROLE_LABELS = {
      phd:          { ko: "박사과정",    en: "Ph.D. Student" },
      ms:           { ko: "석사과정",    en: "M.S. Student" },
      bs:           { ko: "학부연구생",  en: "Undergraduate Researcher" },
      undergraduate:{ ko: "학부연구생",  en: "Undergraduate Researcher" }
    };
    const students = members
      .filter(m => m.role !== "professor")
      .sort((a, b) => {
        const ai = ROLE_ORDER.indexOf(a.role);
        const bi = ROLE_ORDER.indexOf(b.role);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

    host.innerHTML = students.map(m => {
      const nameKo = escapeHtml(m.name_ko || "");
      const nameEn = escapeHtml(m.name_en || "");
      const roleLabel = ROLE_LABELS[m.role] ? (lang === "ko" ? ROLE_LABELS[m.role].ko : ROLE_LABELS[m.role].en) : escapeHtml(m.role);
      const joinedYear = m.joined ? m.joined.slice(0, 4) : "";
      const photoSrc = escapeAttr(m.photo || "");
      const fallbackInitials = escapeAttr(initials(m.name_en || m.name_ko));
      const photoEl = m.photo
        ? `<img src="${photoSrc}" alt="${escapeAttr(m.name_en || m.name_ko)}" onerror="this.outerHTML='<div class=\\'team-card-initials\\'>${fallbackInitials}</div>'" />`
        : `<div class="team-card-initials">${escapeHtml(initials(m.name_en || m.name_ko))}</div>`;
      return `
        <a class="team-card" href="member.html#m-${escapeAttr(m.id)}">
          <div class="team-card-photo">${photoEl}</div>
          <div class="team-card-body">
            <div class="team-card-name-ko">${nameKo}</div>
            <div class="team-card-name-en">${nameEn}</div>
            <div class="team-card-role">${escapeHtml(roleLabel)}${joinedYear ? `<span class="team-card-year">${joinedYear}</span>` : ""}</div>
          </div>
        </a>`;
    }).join("");
  }

  function renderTopics(topics) {
    const host = document.getElementById("home-topics");
    if (!host) return;
    const lang = SiteUtils.getLang();
    host.innerHTML = topics.sort((a, b) => a.order - b.order).map((t, i) => {
      const raw = lang === "ko" ? t.title_ko : t.title_en;
      const name = lang === "ko" ? raw.replace(/\s*\(.*\)\s*$/, "") : raw;
      return `
        <a class="rcard reveal" style="transition-delay:${i * 90}ms" href="research.html#${t.id}">
          <div class="rcard-icon">${t.svg || ""}</div>
          <div class="rcard-tag">Research 0${i + 1}</div>
          <h3>${escapeHtml(name)}</h3>
        </a>`;
    }).join("");
    host.querySelectorAll(".reveal").forEach(el => {
      if (window.SiteUtils && SiteUtils.observeReveal) SiteUtils.observeReveal(el); else el.classList.add("visible");
    });
  }

  function renderNewsFromGallery(items) {
    const host = document.getElementById("home-news");
    if (!host) return;
    const lang = SiteUtils.getLang();
    const sorted = [...items].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
    host.innerHTML = sorted.map(g => {
      const title = lang === "ko" ? (g.title_ko || g.title_en) : (g.title_en || g.title_ko);
      const body = lang === "ko" ? (g.body_ko || g.body_en) : (g.body_en || g.body_ko);
      const [y, m, d] = (g.date || "").split("-");
      const cover = g.cover || (g.images && g.images[0] && g.images[0].src) || "";
      return `
        <li>
          <a href="gallery.html#${encodeURIComponent(g.id)}">
            <div class="news-date"><b>${escapeHtml(d || "")}</b><span>${escapeHtml(y || "")}.${escapeHtml(m || "")}</span></div>
            <div class="news-text"><h4>${escapeHtml(title || "")}</h4>${body ? `<p>${escapeHtml(truncate(body.replace(/\n+/g, " "), 70))}</p>` : ""}</div>
            ${cover ? `<div class="news-thumb"><img src="${escapeAttr(cover)}" alt="" loading="lazy" /></div>` : ""}
          </a>
        </li>`;
    }).join("");
  }

  function renderGallerySlider(items) {
    const host = document.getElementById("home-gallery");
    if (!host) return;
    const lang = SiteUtils.getLang();
    const withImg = [...items].filter(g => g.cover || (g.images && g.images.length))
      .sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
    if (!withImg.length) {
      host.innerHTML = `<a class="gal-slide gal-empty" href="gallery.html"><div class="gal-badge">Gallery</div><div class="gal-cap"><b>${lang === "ko" ? "연구실 사진 보기" : "View lab photos"}</b></div></a>`;
      return;
    }
    host.innerHTML = withImg.map((g, i) => {
      const title = lang === "ko" ? (g.title_ko || g.title_en) : (g.title_en || g.title_ko);
      const src = g.cover || g.images[0].src;
      return `<a class="gal-slide${i === 0 ? " active" : ""}" href="gallery.html#${encodeURIComponent(g.id)}">
        <img src="${escapeAttr(src)}" alt="" loading="lazy" />
        <div class="gal-badge">Gallery</div>
        <div class="gal-cap"><b>${escapeHtml(title || "")}</b><span>${escapeHtml(g.date || "")}</span></div>
      </a>`;
    }).join("") + `<div class="gal-dots">${withImg.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("")}</div>`;
    const slides = host.querySelectorAll(".gal-slide"), dots = host.querySelectorAll(".gal-dots i");
    let cur = 0;
    const go = n => { slides[cur].classList.remove("active"); dots[cur].classList.remove("on"); cur = (n + slides.length) % slides.length; slides[cur].classList.add("active"); dots[cur].classList.add("on"); };
    dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
    if (slides.length > 1) setInterval(() => go(cur + 1), 4500);
  }

  function renderPubSlider(pubs) {
    const host = document.getElementById("home-pubs");
    if (!host) return;
    const list = [...pubs].sort((a, b) => (b.year - a.year)).slice(0, 8);
    host.innerHTML = list.map(p => {
      const href = p.doi ? `https://doi.org/${p.doi}` : (p.link || "publications.html");
      return `<a class="pub-card" href="${escapeAttr(href)}" ${p.doi || p.link ? 'target="_blank" rel="noopener"' : ""}>
        <div class="pub-year">${p.year}</div>
        <h3>${escapeHtml(p.title)}</h3>
        <p><em>${escapeHtml(p.venue || "")}</em>${p.volume ? `, ${escapeHtml(p.volume)}` : ""}</p>
        <p class="pub-authors">${escapeHtml(truncate(p.authors || "", 120))}</p>
      </a>`;
    }).join("");
    const wrap = host.parentElement;
    const step = () => (host.querySelector(".pub-card")?.offsetWidth || 320) + 24;
    wrap.querySelector(".pub-nav.prev")?.addEventListener("click", () => host.scrollBy({ left: -step(), behavior: "smooth" }));
    wrap.querySelector(".pub-nav.next")?.addEventListener("click", () => host.scrollBy({ left: step(), behavior: "smooth" }));
  }

  function renderFeatured(pubs) {
    const host = document.getElementById("home-featured");
    if (!host) return;
    const top = pubs.filter(p => p.top_pick).slice(0, 3);
    host.innerHTML = top.map(p => `
      <a class="featured-card" href="publications.html">
        <div class="meta-top"><span>${escapeHtml(p.venue)}</span><span class="year">${p.year}</span></div>
        <h3>${escapeHtml(p.title)}</h3>
        <div class="authors">${escapeHtml(truncate(p.authors, 110))}</div>
      </a>
    `).join("");
  }

  function renderNews(news) {
    const host = document.getElementById("home-news");
    if (!host) return;
    const lang = SiteUtils.getLang();
    const sorted = [...news].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
    host.innerHTML = sorted.map(n => `
      <li>
        <a href="board.html">
          <span class="date">${n.date}</span>
          <span class="title">${escapeHtml(lang === "ko" ? n.title_ko : n.title_en)}</span>
        </a>
      </li>
    `).join("");
  }

  function renderChartUpdated() {
    const el = document.getElementById("chart-updated");
    if (!el) return;
    const m = (SiteUtils.getConfig() || {}).scholar_metrics;
    const iso = m && m.updated_at;
    if (!iso) return;
    const d = new Date(iso);
    if (isNaN(d)) return;
    const ko = SiteUtils.getLang() === "ko";
    const y = d.getFullYear(), mo = String(d.getMonth() + 1).padStart(2, "0"), da = String(d.getDate()).padStart(2, "0");
    el.textContent = ko ? `Google Scholar 기준 · ${y}.${mo}.${da} 업데이트` : `Source: Google Scholar · Updated ${y}-${mo}-${da}`;
  }
  document.addEventListener("scholar:totals", renderChartUpdated);

  function renderCitationsChart(history) {
    const host = document.getElementById("citations-chart");
    if (!host) return;
    if (!history.length) {
      host.innerHTML = `<p style="text-align:center;color:var(--c-text-light);padding:3rem 0;font-size:.875rem">Loading from Google Scholar...</p>`;
      return;
    }
    const W = 720, H = 280;
    const PAD_L = 50, PAD_R = 20, PAD_T = 30, PAD_B = 38;
    const innerW = W - PAD_L - PAD_R;
    const innerH = H - PAD_T - PAD_B;
    const maxN = Math.max(...history.map(d => d.n));
    const x = i => PAD_L + (innerW * i) / Math.max(1, history.length - 1);
    const y = n => PAD_T + innerH - (innerH * n) / maxN;

    const linePath = history.map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.n)}`).join(" ");
    const areaPath = `${linePath} L${x(history.length - 1)},${PAD_T + innerH} L${x(0)},${PAD_T + innerH} Z`;

    // Y-axis ticks (4 levels)
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(maxN * t));

    host.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Citations per year">
        ${yTicks.map(v => `
          <line class="grid-line" x1="${PAD_L}" x2="${W - PAD_R}" y1="${y(v)}" y2="${y(v)}" />
          <text class="axis-label" x="${PAD_L - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>
        `).join("")}
        <path class="area-fill" d="${areaPath}" />
        <path class="line" d="${linePath}" />
        ${history.map((d, i) => `
          <circle class="point" cx="${x(i)}" cy="${y(d.n)}" r="3.5" />
          <text class="axis-label" x="${x(i)}" y="${H - PAD_B + 18}" text-anchor="middle">${d.year}</text>
          <text class="point-label" x="${x(i)}" y="${y(d.n) - 12}">${d.n}</text>
        `).join("")}
      </svg>
      <div class="chart-updated" id="chart-updated"></div>
    `;
    renderChartUpdated();
  }

  function truncate(s, n) { return s && s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function escapeAttr(s) { return escapeHtml(s); }
  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
})();
