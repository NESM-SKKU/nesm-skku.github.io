/* Gallery page — chronological timeline: date, title, caption, photos (newest first) */
(function () {
  "use strict";

  document.addEventListener("site:ready", async () => {
    const root = document.getElementById("gallery-root");
    if (!root) return;
    try {
      const items = await SiteUtils.loadJSON("data/gallery.json");
      render(root, items);
    } catch (err) {
      console.error(err);
      root.innerHTML = `<p style="color:var(--c-text-muted)">Failed to load gallery.</p>`;
    }
  });

  function render(root, items) {
    const lang = SiteUtils.getLang();
    const i18n = SiteUtils.getI18n();
    if (!items || items.length === 0) {
      root.innerHTML = `<p style="color:var(--c-text-muted);text-align:center;padding:var(--space-16) 0;">${(i18n?.gallery?.empty) || "No photos yet."}</p>`;
      return;
    }
    const sorted = items.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

    let html = "";
    let curYear = "";
    sorted.forEach(g => {
      const year = (g.date || "").slice(0, 4);
      if (year && year !== curYear) {
        curYear = year;
        html += `<h2 class="tl-year">${escapeHtml(year)}</h2>`;
      }
      const title = lang === "ko" ? (g.title_ko || g.title_en) : (g.title_en || g.title_ko);
      const body = lang === "ko" ? (g.body_ko || g.summary_ko || g.body_en || g.summary_en)
                                 : (g.body_en || g.summary_en || g.body_ko || g.summary_ko);
      const dateLabel = g.date_label || (g.date || "").replace(/-/g, ".");
      const imgs = (g.images || []).filter(im => im && im.src);
      const photos = imgs.length ? `<div class="tl-photos tl-photos-${Math.min(imgs.length, 3)}">${
        imgs.map((im, i) => {
          const cap = lang === "ko" ? (im.caption_ko || im.caption_en) : (im.caption_en || im.caption_ko);
          return `<figure class="tl-photo">
            <a href="gallery-detail.html?id=${encodeURIComponent(g.id)}&i=${i}"><img src="${escapeAttr(im.src)}" alt="${escapeAttr(cap || title || "")}" loading="lazy" /></a>
            ${cap ? `<figcaption>${escapeHtml(cap)}</figcaption>` : ""}
          </figure>`;
        }).join("")
      }</div>` : "";
      html += `
        <article class="tl-entry" id="${escapeAttr(g.id)}">
          <div class="tl-date">${escapeHtml(dateLabel)}</div>
          <h3 class="tl-title">${escapeHtml(title || "")}</h3>
          ${body ? `<p class="tl-body">${escapeHtml(body)}</p>` : ""}
          ${photos}
        </article>`;
    });
    root.innerHTML = `<div class="tl">${html}</div>`;
  }

  function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
  function escapeAttr(s) { return escapeHtml(s); }
})();
