/**
 * app.js — COMSOC Member Verification System
 * Pure vanilla JS. No frameworks, no dependencies.
 *
 * Data source: members.csv (fetched at runtime, parsed in-browser)
 *
 * CSV format expected (first row = headers):
 *   Member ID, Name, Course/Year, Verification Code
 *
 * Features:
 *  - Loads members.csv via fetch() — no JSON conversion needed
 *  - Exact match on Member ID or full name (case-insensitive)
 *  - Optional verification code validation
 *  - Fuzzy / Levenshtein suggestions when no exact match found
 *  - Real-time clear button, Enter key support
 */

// ─── DOM REFERENCES ────────────────────────────────────────────
const searchInput    = document.getElementById('searchInput');
const searchBtn      = document.getElementById('searchBtn');
const clearBtn       = document.getElementById('clearBtn');
const codeInput      = document.getElementById('codeInput');
const resultArea     = document.getElementById('resultArea');
const suggestionsBox = document.getElementById('suggestionsBox');
const statsStrip     = document.getElementById('statsStrip');
const statTotal      = document.getElementById('statTotal');
const statCourses    = document.getElementById('statCourses');
const statYear       = document.getElementById('statYear');

// ─── GLOBAL MEMBER STORE ───────────────────────────────────────
// Populated after CSV is fetched and parsed.
let MEMBERS_DATA = [];

// ─── CSV LOADER ────────────────────────────────────────────────

/**
 * Fetch members.csv, parse it, and populate MEMBERS_DATA.
 * Called once on page load.
 */
async function loadCSV() {
  resultArea.innerHTML = `<p style="color:var(--muted);font-size:13px;text-align:center;padding:24px 0;">
    Loading member registry…
  </p>`;

  const base   = window.location.href.replace(/\/[^\/]*$/, '/');
  const csvUrl = base + 'members.csv';

  try {
    const response = await fetch(csvUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} — ${response.statusText} (tried: ${csvUrl})`);
    }

    const text = await response.text();
    MEMBERS_DATA = parseCSV(text);

    if (MEMBERS_DATA.length === 0) {
      throw new Error('CSV loaded but has no data rows. Check the file format.');
    }

    resultArea.innerHTML = '';

    const courses = new Set(
      MEMBERS_DATA
        .map(m => m.course.split('-')[0].trim())
        .filter(course => course && course !== 'undefined')
    );

    statTotal.textContent    = MEMBERS_DATA.length;
    statCourses.textContent  = courses.size;
    statYear.textContent     = await loadAcademicYear();
    statsStrip.style.display = 'flex';

    searchInput.disabled    = false;
    searchBtn.disabled      = false;
    searchInput.placeholder = 'Enter name or Member ID…';

  } catch (err) {
    console.error('CSV load error:', err);
    resultArea.innerHTML = `
      <div class="notfound-card">
        <div class="notfound-icon">⚠️</div>
        <div class="notfound-title">Could not load member registry</div>
        <p class="notfound-sub">
          <strong>Error:</strong> ${escapeHtml(err.message)}<br/><br/>
          <strong>Checklist:</strong><br/>
          1. Is <code>members.csv</code> uploaded to your GitHub repo?<br/>
          2. Is the filename exactly <code>members.csv</code> (all lowercase, no spaces)?<br/>
          3. Is it in the <strong>same folder</strong> as <code>index.html</code>?<br/>
          4. Did you <strong>commit and push</strong> it — not just save locally?<br/><br/>
          After fixing, wait ~1 min for GitHub Pages to rebuild, then hard-refresh
          (<kbd>Ctrl+Shift+R</kbd> or <kbd>Cmd+Shift+R</kbd>).
        </p>
      </div>`;
  }
}

// ─── CSV PARSER ────────────────────────────────────────────────

/**
 * Parse a CSV string into an array of member objects.
 *
 * Handles:
 *  - First row as headers (skipped — column order is used instead)
 *  - Quoted fields containing commas or line breaks
 *  - Windows (CRLF) and Unix (LF) line endings
 *  - Blank/empty lines (skipped)
 *
 * Expected column order:
 *   Column 0 → id               (Member ID)
 *   Column 1 → name             (Full Name)
 *   Column 2 → course           (Course/Year)
 *   Column 3 → verificationCode (Verification Code)
 *
 * @param {string} csvText - Raw CSV file contents
 * @returns {Array<{id, name, course, verificationCode}>}
 */
function parseCSV(csvText) {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const members = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = splitCSVLine(line);
    if (cols.length < 4) continue;

    members.push({
      id:               cols[0].trim(),
      name:             cols[1].trim(),
      course:           cols[2].trim(),
      verificationCode: cols[3].trim()
    });
  }

  return members;
}

/**
 * Split a single CSV line respecting double-quoted fields.
 * A quoted field may contain commas; double-double-quotes ("") represent a literal ".
 *
 * @param {string} line
 * @returns {string[]}
 */
function splitCSVLine(line) {
  const fields = [];
  let current  = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch   = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current);
  return fields;
}

// ─── SEARCH LOGIC ─────────────────────────────────────────────

/**
 * Normalize a string: lowercase, trim, collapse internal whitespace.
 */
function normalize(str) {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Compute the Levenshtein edit distance between two strings.
 * Used for fuzzy "Did you mean?" suggestions.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

/**
 * CSV name format: "Last, First"  (e.g. "De Asis, Marie")
 *
 * extractLastName — returns everything before the comma (the last name).
 *   "De Asis, Marie"  → "de asis"
 *   "Santos, Juan"    → "santos"
 *   "Cruz"            → "cruz"   (no comma — treat whole string as last name)
 *
 * extractFirstName — returns everything after the comma (the first name).
 *   "De Asis, Marie"  → "marie"
 */
function extractLastName(normalizedName) {
  const commaIdx = normalizedName.indexOf(',');
  if (commaIdx === -1) return normalizedName.trim();
  return normalizedName.slice(0, commaIdx).trim();
}

function extractFirstName(normalizedName) {
  const commaIdx = normalizedName.indexOf(',');
  if (commaIdx === -1) return '';
  return normalizedName.slice(commaIdx + 1).trim();
}

/**
 * True if the last name (before the comma) starts with q.
 * Also handles compound last names like "De Asis", "De Los Santos":
 * checks both the full last-name string and each word within it.
 *
 * Examples (name = "de asis, marie"):
 *   lastNameStartsWith("de asis, marie", "de")       → true
 *   lastNameStartsWith("de asis, marie", "de asis")  → true
 *   lastNameStartsWith("de asis, marie", "asis")     → true  (word match)
 *   lastNameStartsWith("de asis, marie", "mar")      → false (first name)
 *   lastNameStartsWith("de asis, marie", "sis")      → false (mid-word)
 */
function lastNameStartsWith(normalizedName, q) {
  const lastName = extractLastName(normalizedName);
  if (lastName.startsWith(q)) return true;

  const qWords = q.split(' ');
  const lWords = lastName.split(' ');

  if (qWords.length === 1) {
    return lWords.some(w => w.startsWith(q));
  }

  // Multi-word query: check every consecutive window inside the last name
  for (let i = 0; i <= lWords.length - qWords.length; i++) {
    const run = lWords.slice(i, i + qWords.length).join(' ');
    if (run.startsWith(q)) return true;
  }
  return false;
}

/**
 * Master search — returns { exact, multiple }
 *
 *   exact    {object|null}  single definitive hit  → show member card
 *   multiple {object[]}     2+ hits                → show all as suggestions
 *
 * Priority (tuned for "Last, First" CSV format where users type last names):
 *  1. Exact Member ID             ("COM-2025-001")
 *  2. Exact full stored name      ("De Asis, Marie")
 *  3. Exact last-name match       ("De Asis"  → all members with that last name)
 *  4. Last-name starts-with       ("De A"     → last names starting with "de a")
 *  5. Last-name word starts-with  ("Asis"     → last names containing word "asis")
 */
function findMatches(query) {
  const q = normalize(query);

  // 1. Exact Member ID
  const byId = MEMBERS_DATA.find(m => normalize(m.id) === q);
  if (byId) return { exact: byId, multiple: [] };

  // 2. Exact full stored name (e.g. user typed "De Asis, Marie" exactly)
  const byFullName = MEMBERS_DATA.filter(m => normalize(m.name) === q);
  if (byFullName.length === 1) return { exact: byFullName[0], multiple: [] };
  if (byFullName.length  >  1) return { exact: null, multiple: byFullName };

  if (q.length < 2) return { exact: null, multiple: [] };

  // 3. Exact last-name match (most common: user types "De Asis")
  const byLastExact = MEMBERS_DATA.filter(m => extractLastName(normalize(m.name)) === q);
  if (byLastExact.length === 1) return { exact: byLastExact[0], multiple: [] };
  if (byLastExact.length  >  1) return { exact: null, multiple: byLastExact };

  // 4. Last-name starts-with (user types partial last name "De A")
  const byLastPartial = MEMBERS_DATA.filter(m => lastNameStartsWith(normalize(m.name), q));
  if (byLastPartial.length === 1) return { exact: byLastPartial[0], multiple: [] };
  if (byLastPartial.length  >  1) return { exact: null, multiple: byLastPartial };

  return { exact: null, multiple: [] };
}

/**
 * Fuzzy / typo-tolerant fallback — only called when findMatches() finds nothing.
 *
 * Scoring strategy (primary focus: last name, since that's what users type):
 *  - Score 0  : last name starts with query (left-to-right, already a near-miss)
 *  - Score 1+ : Levenshtein distance against the last name, each word in it,
 *               and the full stored name as a safety net
 *
 * Acceptance threshold: up to 40% of the query length in edits, minimum 2.
 * This is intentionally more generous than before so that short typos like
 * "Sanots" → "Santos" or "De Asiss" → "De Asis" are always surfaced.
 *
 * Returns up to 5 closest members sorted by score (best first).
 */
function findFuzzy(query) {
  const q = normalize(query);
  if (q.length < 2) return [];

  // Generous threshold: allow ~1 typo per 2.5 chars, minimum 2 edits accepted
  const threshold = Math.max(2, Math.ceil(q.length * 0.4));

  return MEMBERS_DATA
    .map(m => {
      const nName    = normalize(m.name);
      const nId      = normalize(m.id);
      const lastName = extractLastName(nName);
      const lWords   = lastName.split(' ');

      // Left-to-right last-name match → best possible score
      if (lastNameStartsWith(nName, q) || nId.startsWith(q)) {
        return { member: m, score: 0 };
      }

      // Levenshtein: check last name as a whole, each word in it, and full name
      const minDist = Math.min(
        levenshtein(lastName, q),
        ...lWords.map(w => levenshtein(w, q)),
        levenshtein(nName, q)
      );

      if (minDist <= threshold) {
        return { member: m, score: minDist };
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(x => x.member);
}

// ─── UI BUILDERS ──────────────────────────────────────────────

/**
 * Render the verified member card.
 */
function renderMemberCard(member, codeEntered) {
  let codeHtml = '';
  if (codeEntered && codeEntered.trim() !== '') {
    const codeMatch = normalize(codeEntered) === normalize(member.verificationCode);
    codeHtml = `
      <div class="info-cell">
        <span class="info-label">Verification Code</span>
        <span class="info-value">
          ${codeMatch
            ? `<span class="code-verified">✅ Code Matched</span>`
            : `<span class="code-unverified">⚠ Code Mismatch — check your code</span>`}
        </span>
      </div>`;
  }

  return `
    <div class="member-card">
      <div class="card-header">
        <div class="card-name">${escapeHtml(member.name)}</div>
        <div class="verified-badge">
          <span class="check-icon">✅</span> Verified Member
        </div>
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
          <span class="info-label">Course / Year</span>
          <span class="info-value">${escapeHtml(member.course)}</span>
        </div>
        ${codeHtml}
      </div>
    </div>`;
}

/**
 * Soft "no exact match" message shown above fuzzy suggestions.
 * Used when there's no match but we have nearby suggestions to offer.
 */
function renderNoExactMatch(query) {
  return `
    <div class="notfound-card">
      <div class="notfound-icon">🚫</div>
      <div class="notfound-title">Not an Official Member</div>
      <p class="notfound-sub">
        No record found for <strong>"${escapeHtml(query)}"</strong> in the official COMSOC member registry.
        <br/><br/>
        If you believe this is an error, please contact your chapter officers or check if your name/ID is spelled correctly.
      </p>
    </div>`;
}

/**
 * Hard "not found" card — shown only when fuzzy search also returns nothing.
 * This is the definitive "this person is not in the registry" message.
 */
function renderNotFound(query) {
  return `
    <div class="notfound-card">
      <div class="notfound-icon">🚫</div>
      <div class="notfound-title">Not an Official Member</div>
      <p class="notfound-sub">
        No record found for <strong>"${escapeHtml(query)}"</strong> in the official COMSOC member registry.
        <br/><br/>
        If you believe this is an error, please contact your chapter officers or check if your name/ID is spelled correctly.
      </p>
    </div>`;
}

/**
 * Render fuzzy suggestion items below the search card.
 */
function renderSuggestions(matches, label = 'Did you mean?') {
  if (matches.length === 0) {
    suggestionsBox.style.display = 'none';
    return;
  }

  suggestionsBox.innerHTML = matches.map(m => `
    <div class="suggestion-item" role="option" data-id="${escapeHtml(m.id)}" tabindex="0">
      <span class="sug-label">${escapeHtml(label)}</span>
      <strong>${escapeHtml(m.name)}</strong>
      <span class="sug-id">${escapeHtml(m.id)}</span>
    </div>`).join('');

  suggestionsBox.style.display = 'block';

  suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
    const handler = () => {
      const member = MEMBERS_DATA.find(m => m.id === item.dataset.id);
      if (member) {
        searchInput.value = member.name;
        hideSuggestions();
        updateClearBtn();
        performSearch();
      }
    };
    item.addEventListener('click', handler);
    item.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') handler();
    });
  });
}

function hideSuggestions() {
  suggestionsBox.style.display = 'none';
  suggestionsBox.innerHTML = '';
}

// ─── MAIN SEARCH HANDLER ───────────────────────────────────────

/**
 * Runs only when the Verify button is clicked or Enter is pressed.
 * - Exact/partial match  → show member card + "Other matches" suggestions
 * - No match             → show Not Found card + fuzzy "Did you mean?" suggestions
 */
function performSearch() {
  const query = searchInput.value.trim();
  const code  = codeInput ? codeInput.value.trim() : '';

  hideSuggestions();

  if (!query) {
    resultArea.innerHTML = '';
    return;
  }

  if (MEMBERS_DATA.length === 0) {
    resultArea.innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px;">
      Member data is still loading. Please wait…
    </p>`;
    return;
  }

  const { exact, multiple } = findMatches(query);

  if (exact) {
    // Single definitive match — show the member card
    resultArea.innerHTML = renderMemberCard(exact, code);
    hideSuggestions();
  } else if (multiple.length > 0) {
    // Multiple matches — show all as suggestions so user picks the right person
    resultArea.innerHTML = '';
    renderSuggestions(multiple, 'Multiple members found — select one:');
  } else {
    // No exact match — run fuzzy to find nearby names
    const fuzzy = findFuzzy(query);
    if (fuzzy.length > 0) {
      // Show soft "no exact match" message + clickable fuzzy suggestions
      resultArea.innerHTML = renderNoExactMatch(query);
      renderSuggestions(fuzzy, 'Did you mean?');
    } else {
      // Nothing close either — show the hard "not a member" card
      resultArea.innerHTML = renderNotFound(query);
      hideSuggestions();
    }
  }
}

// ─── EVENT LISTENERS ──────────────────────────────────────────

searchBtn.addEventListener('click', performSearch);

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') performSearch();
  if (e.key === 'Escape') hideSuggestions();
});

// Real-time input: only manages the clear button and resets stale results.
// No search logic runs here — everything is deferred to performSearch().
searchInput.addEventListener('input', () => {
  updateClearBtn();

  // Clear any previous results so stale cards don't linger while the user
  // is still typing.
  resultArea.innerHTML = '';
  hideSuggestions();
});

function updateClearBtn() {
  clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
}

clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  if (codeInput) codeInput.value = '';
  resultArea.innerHTML = '';
  hideSuggestions();
  clearBtn.style.display = 'none';
  searchInput.focus();
});

// Close suggestions when clicking outside the search area
document.addEventListener('click', e => {
  if (!suggestionsBox.contains(e.target) && e.target !== searchInput) {
    hideSuggestions();
  }
});

// ─── UTILITY ──────────────────────────────────────────────────

/** Escape HTML to prevent XSS when rendering CSV data into the DOM */
function escapeHtml(str) {
  const map = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' };
  return String(str).replace(/[&<>"']/g, c => map[c]);
}

// ─── BOOTSTRAP ────────────────────────────────────────────────
// Disable inputs until CSV has finished loading
searchInput.disabled    = true;
searchBtn.disabled      = true;
searchInput.placeholder = 'Loading registry…';

// Kick off CSV fetch
loadCSV();

/**
 * Fetch and parse academic_year.csv to get the current academic year.
 * Returns the academic year string (e.g., "2025-2026").
 * Falls back to current year if the file cannot be loaded.
 */
async function loadAcademicYear() {
  try {
    const base = window.location.href.replace(/\/[^\/]*$/, '/');
    const yearUrl = base + 'academic_year.csv';
    const response = await fetch(yearUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    const lines = text.trim().split('\n');

    if (lines.length > 1) {
      return lines[1].trim();
    }

    return new Date().getFullYear();
  } catch (err) {
    console.warn('Could not load academic year, falling back to current year:', err);
    return new Date().getFullYear();
  }
}
