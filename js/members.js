/* Member page — Current / Alumni tabs */
(function () {
  "use strict";
  const CURRENT_ROLES = ["postdoc", "phd", "ms", "undergraduate"];
  const ALUMNI_ROLES = ["alumni"];
  const ROLE_LABELS_EN = {
    professor: "Principal Investigator",
    postdoc: "Postdoctoral Researchers",
    phd: "Ph.D. Students",
    ms: "M.S. Students",
    undergraduate: "Undergraduate Researchers",
    alumni: "Alumni"
  };
  const ROLE_LABELS_KO = {
    professor: "책임연구자",
    postdoc: "박사후연구원",
    phd: "박사과정",
    ms: "석사과정",
    undergraduate: "학부연구원",
    alumni: "졸업생"
  };

  let allMembers = [];
  let piData = null;
  let curTab = "pi";

  document.addEventListener("site:ready", async () => {
    const root = document.getElementById("members-root");
    if (!root) return;
    try {
      [allMembers, piData] = await Promise.all([SiteUtils.loadJSON("data/members.json"), SiteUtils.loadJSON("data/pi.json").catch(() => null)]);
      if (location.hash === "#current") curTab = "current";
      render(root);
    } catch (err) { console.error(err); }
  });

  function render(root) {
    const lang = SiteUtils.getLang();
    const currentCount = allMembers.filter(m => CURRENT_ROLES.includes(m.role)).length;
    const alumniCount = allMembers.filter(m => ALUMNI_ROLES.includes(m.role)).length;

    const tabs = `
      <div class="member-tabs">
        <button class="member-tab ${curTab === "pi" ? "active" : ""}" data-tab="pi">
          ${lang === "ko" ? "교수" : "Professor"}
        </button>
        <button class="member-tab ${curTab === "current" ? "active" : ""}" data-tab="current">
          ${lang === "ko" ? "현재 구성원" : "Current"} <span class="member-tab-count">${currentCount}</span>
        </button>
        <button class="member-tab ${curTab === "alumni" ? "active" : ""}" data-tab="alumni">
          ${lang === "ko" ? "졸업생" : "Alumni"} <span class="member-tab-count">${alumniCount}</span>
        </button>
      </div>
    `;

    if (curTab === "pi") {
      root.innerHTML = tabs + renderPI(lang);
      root.querySelectorAll(".member-tab").forEach(btn => { btn.onclick = () => { curTab = btn.dataset.tab; render(root); }; });
      return;
    }
    const activeRoles = curTab === "current" ? CURRENT_ROLES : ALUMNI_ROLES;
    const filtered = allMembers.filter(m => activeRoles.includes(m.role));
    const grouped = {};
    filtered.forEach(m => { (grouped[m.role] ||= []).push(m); });

    const sections = activeRoles.filter(r => grouped[r]?.length).map(role => {
      const labels = lang === "ko" ? ROLE_LABELS_KO : ROLE_LABELS_EN;
      const cards = grouped[role].map(m => renderCard(m, lang, role)).join("");
      const openCard = curTab === "current" && ["phd", "ms", "undergraduate"].includes(role) ? renderOpenCard(role, lang) : "";
      return `
        <section class="member-group">
          <div class="group-head">
            <h3>${labels[role]}</h3>
            <span class="count">${String(grouped[role].length).padStart(2, "0")}</span>
          </div>
          <div class="member-grid">${cards}${openCard}</div>
        </section>`;
    }).join("");

    const emptyMsg = !filtered.length
      ? `<p style="text-align:center;color:var(--c-text-light);padding:3rem 0">${lang === "ko" ? "등록된 구성원이 없습니다." : "No members listed yet."}</p>`
      : "";

    root.innerHTML = tabs + sections + emptyMsg;

    root.querySelectorAll(".member-tab").forEach(btn => {
      btn.onclick = () => { curTab = btn.dataset.tab; render(root); };
    });
  }

  function renderCard(m, lang, role) {
    const nameKo = m.name_ko || "";
    const nameEn = m.name_en || "";
    const title = lang === "ko" ? m.title_ko : m.title_en;
    const summary = lang === "ko" ? m.summary_ko : m.summary_en;
    const tags = lang === "ko" ? (m.tags_ko || []) : (m.tags_en || []);

    const isPI = role === "professor";
    const tag = isPI ? "a" : "div";
    const href = isPI ? `href="pi.html"` : "";
    const photoEl = m.photo
      ? `<img class="photo" src="${escapeAttr(m.photo)}" alt="${escapeAttr(nameEn || nameKo)}" onerror="this.outerHTML='<div class=photo>${escapeAttr(initials(nameEn || nameKo))}</div>'" />`
      : `<div class="photo">${escapeHtml(initials(nameEn || nameKo))}</div>`;

    const joinedLine = m.joined ? `<span class="joined">since ${escapeHtml(m.joined)}</span>` : "";

    const anchorId = isPI ? `id="pi"` : `id="m-${escapeAttr(m.id)}"`;
    return `
      <${tag} class="member-card" data-role="${role}" ${href} ${anchorId}>
        ${photoEl}
        <div class="name-row">
          <span class="name-ko">${escapeHtml(nameKo)}</span>
          <span class="name-en">${escapeHtml(nameEn)}</span>
        </div>
        <div class="role-line">
          <span>${escapeHtml(title || "")}</span>
          ${m.joined ? `<span class="dot">·</span>${joinedLine}` : ""}
        </div>
        ${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ""}
        ${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag-mini">${escapeHtml(t)}</span>`).join("")}</div>` : ""}
        ${m.email ? `<div class="email-row"><a href="mailto:${m.email}">✉ ${m.email}</a></div>` : ""}
      </${tag}>`;
  }

  function renderPI(lang) {
    const p = piData;
    if (!p) return "";
    const ko = false; // profile is always shown in English (per request); only the name keeps Korean
    const name = lang === "ko" ? `${p.name_ko} (Prof. ${p.name_en})` : `Prof. ${p.name_en}`;
    const pos = `${ko ? p.title_ko : p.title_en}, ${ko ? p.affiliation_ko : p.affiliation_en}`;
    const emails = (p.emails || [p.email]).filter(Boolean);
    const edu = (p.education || []).map(e => `<li><span class="pi-period">${escapeHtml(e.period)}</span><span>${escapeHtml(ko ? `${e.institution_ko} ${e.field_ko} ${e.degree_ko}` : `${e.degree_en} in ${e.field_en}, ${e.institution_en}`)}${e.advisor ? ` <em>(Advisor: ${escapeHtml(e.advisor)})</em>` : ""}</span></li>`).join("");
    const exp = (p.experience || []).map(e => `<li><span class="pi-period">${escapeHtml(ko ? e.period_ko : e.period_en)}</span><span>${escapeHtml(ko ? `${e.org_ko} ${e.role_ko}` : `${e.role_en}, ${e.org_en}`)}</span></li>`).join("");
    const awards = (p.awards || []).map(a => `<li><span class="pi-period">${escapeHtml(String(a.year))}</span><span>${escapeHtml(ko ? `${a.title_ko}, ${a.org_ko}` : `${a.title_en}, ${a.org_en}`)}</span></li>`).join("");
    return `
      <section class="pi-profile">
        <div class="pi-profile-head">
          ${p.photo ? `<img class="pi-profile-photo" src="${escapeAttr(p.photo)}" alt="${escapeAttr(p.name_en)}" />` : ""}
          <div>
            <h2 class="pi-profile-name">${escapeHtml(name)}</h2>
            <p class="pi-profile-pos">${escapeHtml(pos)}</p>
            <ul class="pi-profile-contact">
              ${p.phone ? `<li><span>Tel</span>${escapeHtml(p.phone)}</li>` : ""}
              ${emails.length ? `<li><span>Email</span>${emails.map(e => `<a href="mailto:${escapeAttr(e)}">${escapeHtml(e)}</a>`).join(", ")}</li>` : ""}
              ${(p.address_ko || p.address_en) ? `<li><span>Address</span>${escapeHtml(ko ? p.address_ko : p.address_en)}</li>` : ""}
              ${p.links && p.links.length ? `<li><span>Links</span>${p.links.map(l => `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.label)} ↗</a>`).join(" · ")}</li>` : ""}
            </ul>
          </div>
        </div>
        ${edu ? `<h3 class="pi-section">Education</h3><ul class="pi-list">${edu}</ul>` : ""}
        ${exp ? `<h3 class="pi-section">Professional Experience</h3><ul class="pi-list">${exp}</ul>` : ""}
        ${awards ? `<h3 class="pi-section">Award</h3><ul class="pi-list">${awards}</ul>` : ""}
      </section>`;
  }

  function renderOpenCard(role, lang) {
    const labels = {
      phd: { ko: "박사과정 모집", en: "Ph.D. Position Open" },
      ms: { ko: "석사과정 모집", en: "M.S. Position Open" },
      undergraduate: { ko: "학부연구원 모집", en: "Undergrad Researcher Position" }
    };
    const desc = {
      phd: { ko: "전고체/리튬이온 전지에 진지한 관심이 있는 박사 지원자.", en: "Serious applicants in solid-state and Li-ion batteries." },
      ms: { ko: "배터리 소재·공정 연구에 열정이 있는 석사 지원자.", en: "Motivated MS applicants in battery materials and processing." },
      undergraduate: { ko: "실험실 경험을 쌓고 싶은 학부생.", en: "Undergrads seeking hands-on research experience." }
    };
    const lbl = labels[role][lang];
    const dsc = desc[role][lang];
    return `
      <a class="member-card-open" href="contact.html">
        <div class="icon">+</div>
        <h4>${lbl}</h4>
        <p>${dsc}</p>
        <span class="arrow">Get in touch →</span>
      </a>`;
  }

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  function escapeHtml(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]); }
  function escapeAttr(s) { return escapeHtml(s); }
})();
