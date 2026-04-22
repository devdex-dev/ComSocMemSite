/**
 * app.js — COMSOC v2.0 SPA
 * Pure vanilla JS · No frameworks · No dependencies
 *
 * Features:
 *  - Hash-based SPA router (#home #verify #members #events #about #admin)
 *  - CSV-driven data (members, events, officers, academic_year)
 *  - SHA-256 hashed admin password via Web Crypto API
 *  - Admin panel: analytics, member viewer, filtered CSV export, academic year download
 *  - Fuzzy/Levenshtein search on verify page
 *  - Paginated member directory with program filter
 */

'use strict';

// ════════════════════════════════════════════════════════════════
// CONFIG
// ════════════════════════════════════════════════════════════════
const CFG = {
  csvBase: (() => {
    const href = window.location.href;
    // strip trailing filename if any
    return href.endsWith('/') ? href : href.replace(/\/[^\/]*$/, '/');
  })(),
  csvFiles: {
    members:     'members.csv',
    academicYear:'academic_year.csv',
    events:      'events.csv',
    officers:    'officers.csv',
    adminConfig: 'admin_config.csv',
  },
  dirPageSize:    20,
  adminPageSize:  25,
  fuzzyMaxDist:   3,
  fuzzyMaxResults:5,
};

// ════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ════════════════════════════════════════════════════════════════
const STATE = {
  members:     [],
  events:      [],
  officers:    [],
  academicYear:'—',
  adminHash:   '',
  adminLoggedIn: false,
  dirPage:     1,
  dirFilter:   '',
  dirQuery:    '',
  adminMemberPage:   1,
  adminMemberFilter: '',
  adminMemberQuery:  '',
};

// ════════════════════════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════════════════════════
const ROUTES = ['home', 'verify', 'members', 'events', 'about', 'admin'];

function navigate(route) {
  if (!ROUTES.includes(route)) route = 'home';
  window.location.hash = route;
}

function activateRoute(route) {
  if (!ROUTES.includes(route)) route = 'home';

  // views
  ROUTES.forEach(r => {
    const v = document.getElementById(`view-${r}`);
    if (v) v.classList.toggle('active', r === route);
  });

  // nav links (desktop + drawer)
  document.querySelectorAll('[data-route]').forEach(el => {
    if (el.tagName === 'A') {
      el.classList.toggle('active', el.dataset.route === route);
    }
  });

  // close mobile drawer
  setDrawer(false);

  // lazy-render per page
  switch (route) {
    case 'members': renderDirectory(); break;
    case 'events':  renderEvents();    break;
    case 'about':   renderOfficers();  break;
    case 'admin':   renderAdminPage(); break;
  }
}

window.addEventListener('hashchange', () => {
  activateRoute(window.location.hash.replace('#',''));
});

// ════════════════════════════════════════════════════════════════
// NAV / HAMBURGER
// ════════════════════════════════════════════════════════════════
function setDrawer(open) {
  const btn    = document.getElementById('navHamburger');
  const drawer = document.getElementById('navDrawer');
  if (!btn || !drawer) return;
  btn.classList.toggle('open', open);
  btn.setAttribute('aria-expanded', String(open));
  drawer.classList.toggle('open', open);
  drawer.setAttribute('aria-hidden', String(!open));
}

document.getElementById('navHamburger')?.addEventListener('click', () => {
  const isOpen = document.getElementById('navDrawer').classList.contains('open');
  setDrawer(!isOpen);
});

// All nav links & feature card clicks
document.addEventListener('click', e => {
  const el = e.target.closest('[data-route]');
  if (el) {
    e.preventDefault();
    navigate(el.dataset.route);
  }
});

// ════════════════════════════════════════════════════════════════
// CSV LOADER UTIL
// ════════════════════════════════════════════════════════════════
async function fetchCSV(filename) {
  const url = CFG.csvBase + filename;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} loading ${filename}`);
  return res.text();
}

function parseCSV(text) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n');
  const rows  = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    rows.push(splitCSVLine(line));
  }
  return rows;
}

function splitCSVLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], nx = line[i+1];
    if (ch === '"') {
      if (inQ && nx === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ════════════════════════════════════════════════════════════════
// DATA LOADERS
// ════════════════════════════════════════════════════════════════
async function loadMembers() {
  const rows = parseCSV(await fetchCSV(CFG.csvFiles.members));
  STATE.members = rows
    .filter(c => c.length >= 3)
    .map(c => ({
      id:               c[0].trim(),
      name:             c[1].trim(),
      course:           c[2].trim().replace(/^undefined$/i, '—'),
      verificationCode: (c[3] || '').trim(),
    }));
}

async function loadAcademicYear() {
  try {
    const text  = await fetchCSV(CFG.csvFiles.academicYear);
    const lines = text.replace(/\r\n/g,'\n').trim().split('\n');
    STATE.academicYear = lines.length > 1 ? lines[1].trim() : String(new Date().getFullYear());
  } catch {
    STATE.academicYear = String(new Date().getFullYear());
  }
}

async function loadEvents() {
  try {
    const rows = parseCSV(await fetchCSV(CFG.csvFiles.events));
    STATE.events = rows
      .filter(c => c.length >= 4)
      .map(c => ({
        title:  c[0].trim(),
        date:   c[1].trim(),
        desc:   c[2].trim(),
        tag:    c[3].trim(),
        status: (c[4]||'').trim().toLowerCase() || 'upcoming',
      }));
  } catch { STATE.events = []; }
}

async function loadOfficers() {
  try {
    const rows = parseCSV(await fetchCSV(CFG.csvFiles.officers));
    STATE.officers = rows
      .filter(c => c.length >= 2)
      .map(c => ({
        name:     c[0].trim(),
        position: c[1].trim(),
        course:   (c[2]||'').trim(),
        bio:      (c[3]||'').trim(),
        photo:    (c[4]||'').trim(),
      }));
  } catch { STATE.officers = []; }
}

async function loadAdminConfig() {
  try {
    const rows = parseCSV(await fetchCSV(CFG.csvFiles.adminConfig));
    STATE.adminHash = rows.length > 0 ? rows[0][0].trim().toLowerCase() : '';
  } catch { STATE.adminHash = ''; }
}

// ════════════════════════════════════════════════════════════════
// SHA-256 via Web Crypto API
// ════════════════════════════════════════════════════════════════
async function sha256(str) {
  const buf  = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2,'0'))
    .join('');
}

// ════════════════════════════════════════════════════════════════
// HOME PAGE — populate stats
// ════════════════════════════════════════════════════════════════
function populateHomeStats() {
  const courses = new Set(
    STATE.members.map(m => m.course.split('-')[0].trim()).filter(c => c && c !== '—')
  );
  const el = id => document.getElementById(id);
  if (el('homeTotalMembers')) el('homeTotalMembers').textContent = STATE.members.length;
  if (el('homePrograms'))     el('homePrograms').textContent     = courses.size;
  if (el('homeAcadYear'))     el('homeAcadYear').textContent     = STATE.academicYear;
}

// ════════════════════════════════════════════════════════════════
// VERIFY PAGE — search logic (preserved from v1.1 + enhanced)
// ════════════════════════════════════════════════════════════════
const searchInput    = () => document.getElementById('searchInput');
const searchBtn      = () => document.getElementById('searchBtn');
const clearBtn       = () => document.getElementById('clearBtn');
const codeInput      = () => document.getElementById('codeInput');
const resultArea     = () => document.getElementById('resultArea');
const suggestionsBox = () => document.getElementById('suggestionsBox');
const statsStrip     = () => document.getElementById('statsStrip');

function enableVerifyUI() {
  const si = searchInput(), sb = searchBtn();
  if (si) { si.disabled = false; si.placeholder = 'Enter name or Member ID…'; }
  if (sb) sb.disabled = false;

  const courses = new Set(
    STATE.members.map(m => m.course.split('-')[0].trim()).filter(c => c && c !== '—')
  );
  const ss = statsStrip();
  if (ss) {
    document.getElementById('statTotal').textContent   = STATE.members.length;
    document.getElementById('statCourses').textContent = courses.size;
    document.getElementById('statYear').textContent    = STATE.academicYear;
    ss.style.display = 'flex';
  }
}

// --- search helpers ---
function normalize(s) { return s.toLowerCase().trim().replace(/\s+/g,' '); }

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length:m+1},(_,i)=>Array.from({length:n+1},(_,j)=>i===0?j:j===0?i:0));
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function extractLast(n)  { const i=n.indexOf(','); return i===-1?n.trim():n.slice(0,i).trim(); }
function extractFirst(n) { const i=n.indexOf(','); return i===-1?'':n.slice(i+1).trim(); }

function lastNameStartsWith(normName, q) {
  const last = extractLast(normName);
  if (last.startsWith(q)) return true;
  const words = last.split(' ');
  return words.some(w => w.startsWith(q) && q.length >= 2);
}

function findMatches(query) {
  const q    = normalize(query);
  const isId = q.startsWith('comsoc-');

  if (isId) {
    const exact = STATE.members.find(m => normalize(m.id) === q);
    return { exact: exact||null, multiple: exact ? [] : [] };
  }

  // exact full name
  const exactFull = STATE.members.find(m => normalize(m.name) === q);
  if (exactFull) return { exact: exactFull, multiple: [] };

  // partial last name / first name
  const partials = STATE.members.filter(m => {
    const nm = normalize(m.name);
    return lastNameStartsWith(nm, q) || extractFirst(nm).startsWith(q) || nm.includes(q);
  });

  if (partials.length === 1) return { exact: partials[0], multiple: [] };
  if (partials.length > 1)   return { exact: null, multiple: partials };
  return { exact: null, multiple: [] };
}

function findFuzzy(query) {
  const q = normalize(query);
  return STATE.members
    .map(m => {
      const nm   = normalize(m.name);
      const last = extractLast(nm);
      const dist = Math.min(levenshtein(q, last), levenshtein(q, nm));
      return { member: m, dist };
    })
    .filter(x => x.dist <= CFG.fuzzyMaxDist)
    .sort((a,b) => a.dist - b.dist)
    .slice(0, CFG.fuzzyMaxResults)
    .map(x => x.member);
}

function getInitials(name) {
  const parts = name.replace(/[^a-zA-Z\s,]/g,'').split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  // name format: Last, First
  return (parts[0][0] + (parts[1]?.[0]||'')).toUpperCase();
}

function escapeHtml(str) {
  const map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

function renderMemberCard(member, code) {
  let codeHtml = '';
  if (code) {
    const ok = normalize(code) === normalize(member.verificationCode);
    codeHtml = `<div class="info-cell">
      <span class="info-label">Verification Code</span>
      <span class="info-value">${ok
        ? `<span class="code-verified">✔ Verified</span>`
        : `<span class="code-unverified">⚠ Code Mismatch</span>`}</span>
    </div>`;
  }
  return `
    <div class="member-card glass-panel">
      <div class="card-header">
        <div class="card-header-left">
          <div class="member-avatar">${escapeHtml(getInitials(member.name))}</div>
          <div class="card-name">${escapeHtml(member.name)}</div>
        </div>
        <div class="verified-badge">✅ Verified Member</div>
      </div>
      <div class="card-body">
        <div class="info-cell">
          <span class="info-label">Member ID</span>
          <span class="info-value id-value">${escapeHtml(member.id)}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Full Name</span>
          <span class="info-value">${escapeHtml(member.name)}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Program / Year</span>
          <span class="info-value">${escapeHtml(member.course)}</span>
        </div>
        ${codeHtml}
      </div>
    </div>`;
}

function renderNotFound(q, soft=false) {
  return `
    <div class="notfound-card">
      <div class="notfound-icon">🚫</div>
      <div class="notfound-title">Not an Official Member</div>
      <p class="notfound-sub">
        No record found for <strong>"${escapeHtml(q)}"</strong> in the official COMSOC registry.
        ${soft ? '' : '<br/><br/>If you believe this is an error, contact your chapter officers or check the spelling.'}
      </p>
    </div>`;
}

function hideSuggestions() {
  const sb = suggestionsBox();
  if (sb) { sb.style.display='none'; sb.innerHTML=''; }
}

function renderSuggestions(matches, label='Did you mean?') {
  const sb = suggestionsBox();
  if (!sb || matches.length===0) { hideSuggestions(); return; }
  sb.innerHTML = matches.map(m=>`
    <div class="suggestion-item" role="option" data-id="${escapeHtml(m.id)}" tabindex="0">
      <span class="sug-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(m.name)}</strong>
      <span class="sug-id">${escapeHtml(m.id)}</span>
    </div>`).join('');
  sb.style.display = 'block';
  sb.querySelectorAll('.suggestion-item').forEach(item => {
    const handler = () => {
      const m = STATE.members.find(x=>x.id===item.dataset.id);
      if (!m) return;
      const si = searchInput();
      if (si) si.value = m.name;
      hideSuggestions();
      updateClearBtn();
      performSearch();
    };
    item.addEventListener('click', handler);
    item.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') handler(); });
  });
}

function updateClearBtn() {
  const si = searchInput(), cb = clearBtn();
  if (cb && si) cb.style.display = si.value.length > 0 ? 'block' : 'none';
}

function performSearch() {
  const si = searchInput(), ra = resultArea();
  if (!si || !ra) return;
  const query = si.value.trim();
  const code  = codeInput()?.value.trim() || '';
  hideSuggestions();
  if (!query) { ra.innerHTML=''; return; }
  if (!STATE.members.length) { ra.innerHTML='<p style="color:var(--muted);text-align:center;padding:20px;">Still loading…</p>'; return; }

  const { exact, multiple } = findMatches(query);
  if (exact) {
    ra.innerHTML = renderMemberCard(exact, code);
    hideSuggestions();
  } else if (multiple.length > 0) {
    ra.innerHTML = '';
    renderSuggestions(multiple, 'Multiple found — select one:');
  } else {
    const fuzzy = findFuzzy(query);
    if (fuzzy.length > 0) {
      ra.innerHTML = renderNotFound(query, true);
      renderSuggestions(fuzzy, 'Did you mean?');
    } else {
      ra.innerHTML = renderNotFound(query);
    }
  }
}

function initVerifyListeners() {
  document.getElementById('searchBtn')?.addEventListener('click', performSearch);
  document.getElementById('searchInput')?.addEventListener('keydown', e => {
    if (e.key==='Enter') performSearch();
    if (e.key==='Escape') hideSuggestions();
  });
  document.getElementById('searchInput')?.addEventListener('input', () => {
    updateClearBtn();
    if (resultArea()) resultArea().innerHTML = '';
    hideSuggestions();
  });
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    const si=searchInput(), ci=codeInput(), ra=resultArea(), cb=clearBtn();
    if (si) si.value='';
    if (ci) ci.value='';
    if (ra) ra.innerHTML='';
    if (cb) cb.style.display='none';
    hideSuggestions();
    si?.focus();
  });
  document.addEventListener('click', e => {
    const sb=suggestionsBox(), si=searchInput();
    if (sb && si && !sb.contains(e.target) && e.target!==si) hideSuggestions();
  });
}

// ════════════════════════════════════════════════════════════════
// MEMBER DIRECTORY
// ════════════════════════════════════════════════════════════════
function getDirectoryFiltered() {
  const q = STATE.dirQuery.toLowerCase().trim();
  const f = STATE.dirFilter;
  return STATE.members.filter(m => {
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    const matchF = !f || m.course.startsWith(f);
    return matchQ && matchF;
  });
}

function renderDirectory() {
  if (!STATE.members.length) return;
  const filtered = getDirectoryFiltered();
  const total    = filtered.length;
  const pageSize = CFG.dirPageSize;
  const maxPage  = Math.max(1, Math.ceil(total/pageSize));
  if (STATE.dirPage > maxPage) STATE.dirPage = maxPage;

  const slice = filtered.slice((STATE.dirPage-1)*pageSize, STATE.dirPage*pageSize);

  // count
  const cnt = document.getElementById('dirCount');
  if (cnt) cnt.textContent = `${total} member${total!==1?'s':''}`;

  // populate filter select (once)
  const sel = document.getElementById('dirFilter');
  if (sel && sel.options.length <= 1) {
    const courses = [...new Set(STATE.members.map(m=>m.course).filter(c=>c&&c!=='—'))].sort();
    courses.forEach(c => {
      const o = document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o);
    });
    sel.value = STATE.dirFilter;
  }

  // table body
  const tbody = document.getElementById('dirBody');
  if (tbody) {
    if (slice.length===0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--muted);">No members found.</td></tr>`;
    } else {
      const offset = (STATE.dirPage-1)*pageSize;
      tbody.innerHTML = slice.map((m,i)=>`
        <tr>
          <td style="color:var(--muted);font-size:12px;">${offset+i+1}</td>
          <td class="td-id">${escapeHtml(m.id)}</td>
          <td class="td-name">${escapeHtml(m.name)}</td>
          <td><span class="dir-course-badge">${escapeHtml(m.course)}</span></td>
        </tr>`).join('');
    }
  }

  renderPagination('dirPagination', STATE.dirPage, maxPage, p => { STATE.dirPage=p; renderDirectory(); });
}

function initDirectoryListeners() {
  document.getElementById('dirSearch')?.addEventListener('input', e => {
    STATE.dirQuery = e.target.value;
    STATE.dirPage  = 1;
    renderDirectory();
  });
  document.getElementById('dirFilter')?.addEventListener('change', e => {
    STATE.dirFilter = e.target.value;
    STATE.dirPage   = 1;
    renderDirectory();
  });
}

// ════════════════════════════════════════════════════════════════
// PAGINATION UTIL
// ════════════════════════════════════════════════════════════════
function renderPagination(containerId, current, max, onPage) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (max <= 1) { el.innerHTML=''; return; }

  let html = `<button class="pag-btn" data-p="${current-1}" ${current===1?'disabled':''}>←</button>`;
  const range = [];
  for (let i=1;i<=max;i++) {
    if (i===1||i===max||Math.abs(i-current)<=2) range.push(i);
    else if (range[range.length-1]!=='…') range.push('…');
  }
  range.forEach(p => {
    if (p==='…') html+=`<span class="pag-info" style="padding:0 4px;">…</span>`;
    else html+=`<button class="pag-btn${p===current?' active':''}" data-p="${p}">${p}</button>`;
  });
  html += `<button class="pag-btn" data-p="${current+1}" ${current===max?'disabled':''}>→</button>`;
  el.innerHTML = html;
  el.querySelectorAll('.pag-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => onPage(+btn.dataset.p));
  });
}

// ════════════════════════════════════════════════════════════════
// EVENTS PAGE
// ════════════════════════════════════════════════════════════════
let eventsActiveFilter = 'all';

function renderEvents() {
  const grid = document.getElementById('eventsGrid');
  if (!grid) return;
  if (!STATE.events.length) {
    grid.innerHTML = `<p style="color:var(--muted);font-size:13px;grid-column:1/-1;">No events found. Add them to events.csv in your repository.</p>`;
    return;
  }
  const filtered = eventsActiveFilter==='all'
    ? STATE.events
    : STATE.events.filter(e=>e.status===eventsActiveFilter);

  if (!filtered.length) {
    grid.innerHTML = `<p style="color:var(--muted);font-size:13px;grid-column:1/-1;">No ${eventsActiveFilter} events.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(ev => `
    <div class="event-card glass-panel">
      <div class="event-tag-row">
        <span class="event-tag tag-${ev.status}">${ev.status.charAt(0).toUpperCase()+ev.status.slice(1)}</span>
        <span class="event-status-dot dot-${ev.status}"></span>
      </div>
      <div class="event-title">${escapeHtml(ev.title)}</div>
      <div class="event-date">📅 ${escapeHtml(ev.date)}</div>
      <div class="event-desc">${escapeHtml(ev.desc)}</div>
      <div class="event-cat">${escapeHtml(ev.tag)}</div>
    </div>`).join('');
}

function initEventsListeners() {
  document.getElementById('eventsFilterRow')?.addEventListener('click', e => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    eventsActiveFilter = pill.dataset.filter;
    document.querySelectorAll('.filter-pill').forEach(p=>p.classList.toggle('active',p===pill));
    renderEvents();
  });
}

// ════════════════════════════════════════════════════════════════
// OFFICERS / ABOUT PAGE
// ════════════════════════════════════════════════════════════════
function renderOfficers() {
  const grid = document.getElementById('officersGrid');
  if (!grid) return;
  if (!STATE.officers.length) {
    grid.innerHTML = `<p style="color:var(--muted);font-size:13px;">No officers found. Add them to officers.csv in your repository.</p>`;
    return;
  }
  grid.innerHTML = STATE.officers.map(o => {
    const initials = o.name.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
    const avatarContent = o.photo
      ? `<img src="${escapeHtml(o.photo)}" alt="${escapeHtml(o.name)}" loading="lazy"/>`
      : initials;
    return `
      <div class="officer-card glass-panel">
        <div class="officer-avatar">${avatarContent}</div>
        <div class="officer-name">${escapeHtml(o.name)}</div>
        <span class="officer-pos">${escapeHtml(o.position)}</span>
        ${o.course ? `<div class="officer-course">${escapeHtml(o.course)}</div>` : ''}
        ${o.bio    ? `<div class="officer-bio">${escapeHtml(o.bio)}</div>` : ''}
      </div>`;
  }).join('');
}

function initInquiryForm() {
  document.getElementById('inqSubmit')?.addEventListener('click', () => {
    const name   = document.getElementById('inqName')?.value.trim()   || '';
    const course = document.getElementById('inqCourse')?.value.trim() || '';
    const email  = document.getElementById('inqEmail')?.value.trim()  || '';
    const msg    = document.getElementById('inqMsg')?.value.trim()    || '';
    if (!name || !email || !msg) {
      alert('Please fill in your name, email, and message before sending.'); return;
    }
    const subject = encodeURIComponent(`COMSOC Membership Inquiry — ${name}`);
    const body    = encodeURIComponent(
      `Name: ${name}\nProgram/Year: ${course}\nEmail: ${email}\n\nMessage:\n${msg}`
    );
    window.location.href = `mailto:comsoc.officers@example.com?subject=${subject}&body=${body}`;
  });
}

// ════════════════════════════════════════════════════════════════
// ADMIN PAGE
// ════════════════════════════════════════════════════════════════
function renderAdminPage() {
  if (STATE.adminLoggedIn) {
    showAdminPanel();
  } else {
    document.getElementById('adminLogin').style.display = '';
    document.getElementById('adminPanel').style.display = 'none';
  }
}

// ── Login ──
function initAdminLogin() {
  const loginBtn = document.getElementById('adminLoginBtn');
  const pwInput  = document.getElementById('adminPwInput');
  const pwToggle = document.getElementById('adminPwToggle');
  const errEl    = document.getElementById('adminError');

  pwToggle?.addEventListener('click', () => {
    const isPass = pwInput.type === 'password';
    pwInput.type = isPass ? 'text' : 'password';
    pwToggle.textContent = isPass ? '🙈' : '👁';
  });

  async function attemptLogin() {
    const pw = pwInput?.value || '';
    if (!pw) { if (errEl) errEl.textContent='Enter a password.'; return; }
    if (errEl) errEl.textContent = '';
    loginBtn.textContent = 'Verifying…';
    loginBtn.disabled    = true;
    try {
      const hash = await sha256(pw);
      if (!STATE.adminHash) {
        if (errEl) errEl.textContent = 'admin_config.csv not loaded or empty.';
      } else if (hash === STATE.adminHash) {
        STATE.adminLoggedIn = true;
        showAdminPanel();
      } else {
        if (errEl) errEl.textContent = 'Incorrect password. Try again.';
        pwInput.value = '';
        pwInput.focus();
      }
    } catch(e) {
      if (errEl) errEl.textContent = 'Error verifying password.';
    } finally {
      loginBtn.textContent = 'Unlock Panel';
      loginBtn.disabled    = false;
    }
  }

  loginBtn?.addEventListener('click', attemptLogin);
  pwInput?.addEventListener('keydown', e => { if (e.key==='Enter') attemptLogin(); });
}

function showAdminPanel() {
  document.getElementById('adminLogin').style.display = 'none';
  document.getElementById('adminPanel').style.display = '';
  renderAnalytics();
  populateAdminFilters();
  renderAdminMembers();
}

document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
  STATE.adminLoggedIn = false;
  document.getElementById('adminPanel').style.display  = 'none';
  document.getElementById('adminLogin').style.display  = '';
  document.getElementById('adminPwInput').value = '';
  document.getElementById('adminError').textContent    = '';
});

// ── Tabs ──
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
    if (tab.dataset.tab === 'analytics') renderAnalytics();
    if (tab.dataset.tab === 'members')   renderAdminMembers();
  });
});

// ── Analytics ──
function renderAnalytics() {
  const total   = STATE.members.length;
  const courses = new Set(STATE.members.map(m=>m.course).filter(c=>c&&c!=='—'));
  const courseMap = {};
  STATE.members.forEach(m => {
    const k = m.course||'—';
    courseMap[k] = (courseMap[k]||0)+1;
  });

  const cards = document.getElementById('analyticsCards');
  if (cards) {
    cards.innerHTML = `
      <div class="analytics-card glass-panel">
        <div class="analytics-val">${total}</div>
        <div class="analytics-label">Total Members</div>
      </div>
      <div class="analytics-card glass-panel">
        <div class="analytics-val">${courses.size}</div>
        <div class="analytics-label">Programs</div>
      </div>
      <div class="analytics-card glass-panel">
        <div class="analytics-val">${STATE.academicYear}</div>
        <div class="analytics-label">Academic Year</div>
      </div>
      <div class="analytics-card glass-panel">
        <div class="analytics-val">${Math.max(...Object.values(courseMap)||[0])}</div>
        <div class="analytics-label">Largest Group</div>
      </div>`;
  }

  const chart = document.getElementById('barChart');
  if (chart && total > 0) {
    const sorted = Object.entries(courseMap).sort((a,b)=>b[1]-a[1]);
    const maxVal = sorted[0]?.[1] || 1;
    chart.innerHTML = sorted.map(([label,count])=>`
      <div class="bar-row">
        <span class="bar-label">${escapeHtml(label)}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${Math.round((count/maxVal)*100)}%"></div>
        </div>
        <span class="bar-count">${count}</span>
      </div>`).join('');
  }

  // update academic year display
  const ayEl = document.getElementById('currentAyDisplay');
  if (ayEl) ayEl.textContent = STATE.academicYear;
}

// ── Admin member table ──
function getAdminFiltered() {
  const q = STATE.adminMemberQuery.toLowerCase().trim();
  const f = STATE.adminMemberFilter;
  return STATE.members.filter(m => {
    const matchQ = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    const matchF = !f || m.course === f;
    return matchQ && matchF;
  });
}

function populateAdminFilters() {
  const courses = [...new Set(STATE.members.map(m=>m.course).filter(c=>c&&c!=='—'))].sort();

  ['adminMemberFilter','exportFilterSelect'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel || sel.options.length > 1) return;
    courses.forEach(c => {
      const o = document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o);
    });
  });
}

function renderAdminMembers() {
  const filtered = getAdminFiltered();
  const pageSize = CFG.adminPageSize;
  const maxPage  = Math.max(1, Math.ceil(filtered.length/pageSize));
  if (STATE.adminMemberPage > maxPage) STATE.adminMemberPage = maxPage;
  const slice = filtered.slice((STATE.adminMemberPage-1)*pageSize, STATE.adminMemberPage*pageSize);

  const cntEl = document.getElementById('adminMemberCount');
  if (cntEl) cntEl.textContent = `${filtered.length} member${filtered.length!==1?'s':''}`;

  const tbody = document.getElementById('adminMemberBody');
  if (tbody) {
    const offset = (STATE.adminMemberPage-1)*pageSize;
    tbody.innerHTML = slice.length ? slice.map((m,i)=>`
      <tr>
        <td style="color:var(--muted);font-size:12px;">${offset+i+1}</td>
        <td class="td-id">${escapeHtml(m.id)}</td>
        <td class="td-name">${escapeHtml(m.name)}</td>
        <td><span class="dir-course-badge">${escapeHtml(m.course)}</span></td>
        <td style="font-size:12px; color:var(--muted);">${escapeHtml(m.verificationCode)}</td>
      </tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--muted);">No members found.</td></tr>`;
  }
  renderPagination('adminMemberPag', STATE.adminMemberPage, maxPage,
    p => { STATE.adminMemberPage=p; renderAdminMembers(); });
}

function initAdminMemberListeners() {
  document.getElementById('adminMemberSearch')?.addEventListener('input', e => {
    STATE.adminMemberQuery = e.target.value;
    STATE.adminMemberPage  = 1;
    renderAdminMembers();
  });
  document.getElementById('adminMemberFilter')?.addEventListener('change', e => {
    STATE.adminMemberFilter = e.target.value;
    STATE.adminMemberPage   = 1;
    renderAdminMembers();
  });
}

// ── CSV Export ──
function membersToCSV(members) {
  const header = 'id,name,course,verificationCode';
  const rows   = members.map(m =>
    [m.id, `"${m.name.replace(/"/g,'""')}"`, m.course, m.verificationCode].join(',')
  );
  return [header, ...rows].join('\n');
}

function downloadFile(content, filename, type='text/csv') {
  const blob = new Blob([content], {type});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function initExportListeners() {
  document.getElementById('exportAllBtn')?.addEventListener('click', () => {
    downloadFile(membersToCSV(STATE.members), 'members.csv');
  });

  document.getElementById('exportFilteredBtn')?.addEventListener('click', () => {
    const f = document.getElementById('exportFilterSelect')?.value || '';
    const filtered = f ? STATE.members.filter(m=>m.course===f) : STATE.members;
    const fname    = f ? `members_${f.replace(/[^a-z0-9]/gi,'_')}.csv` : 'members_all.csv';
    downloadFile(membersToCSV(filtered), fname);
  });

  document.getElementById('downloadAyBtn')?.addEventListener('click', () => {
    const val = document.getElementById('newAyInput')?.value.trim();
    if (!val) { alert('Enter a new academic year value first (e.g. 2026-2027)'); return; }
    downloadFile(`academic_year\n${val}\n`, 'academic_year.csv');
  });
}

// ════════════════════════════════════════════════════════════════
// BOOTSTRAP — load all data then wire everything up
// ════════════════════════════════════════════════════════════════
async function boot() {
  // load core data
  try {
    await Promise.all([
      loadMembers(),
      loadAcademicYear(),
      loadAdminConfig(),
    ]);
  } catch(e) {
    console.error('Core data load error:', e);
    const ra = resultArea();
    if (ra) ra.innerHTML = `
      <div class="notfound-card">
        <div class="notfound-icon">⚠️</div>
        <div class="notfound-title">Could not load member registry</div>
        <p class="notfound-sub"><strong>Error:</strong> ${escapeHtml(e.message)}<br/><br/>
        Make sure <code>members.csv</code> is in the same folder as <code>index.html</code> and has been pushed to GitHub.</p>
      </div>`;
  }

  // load secondary data (non-blocking)
  loadEvents().then(() => { if (window.location.hash==='#events') renderEvents(); });
  loadOfficers().then(() => { if (window.location.hash==='#about') renderOfficers(); });

  // populate UI
  enableVerifyUI();
  populateHomeStats();

  // init listeners
  initVerifyListeners();
  initDirectoryListeners();
  initEventsListeners();
  initInquiryForm();
  initAdminLogin();
  initAdminMemberListeners();
  initExportListeners();

  // activate initial route
  const initRoute = window.location.hash.replace('#','') || 'home';
  activateRoute(initRoute);
}

boot();
