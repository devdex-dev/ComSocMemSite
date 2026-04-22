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

  // Derive base URL from the current page so the fetch works whether the site
  // is at a root domain OR a GitHub Pages subdirectory (e.g. /repo-name/).
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
    statYear.textContent     = new Date().getFullYear();
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
  // Normalize line endings to \n
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  const members = [];

  // Row 0 is the header — start from row 1
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip blank lines

    const cols = splitCSVLine(line);

    // Need at least 4 columns to be a valid record
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
        // Escaped quote inside quoted field: "" → "
        current += '"';
        i++; // skip the second quote
      } else {
        inQuotes = !inQuotes; // toggle quoted mode
      }
    } else if (ch === ',' && !inQuotes) {
      // Field separator (only outside quotes)
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current); // push last field
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
 * Find a match by:
 *  1. Exact Member ID  (e.g. "COM-2025-001")
 *  2. Exact full name  (e.g. "Alexandra Reyes")
 *  3. Partial name     (e.g. "Alexandra" or "Reyes" — substring match)
 *
 * If multiple partial matches exist, returns the first one; the rest
 * are shown as suggestions via findAllPartial().
 *
 * @returns {object|null}
 */
function findExact(query) {
  const q = normalize(query);

  // 1. Exact ID match
  const byId = MEMBERS_DATA.find(m => normalize(m.id) === q);
  if (byId) return byId;

  // 2. Exact full-name match
  const byName = MEMBERS_DATA.find(m => normalize(m.name) === q);
  if (byName) return byName;

  // 3. Partial name match (at least 2 chars to avoid noise)
  if (q.length >= 2) {
    const partials = MEMBERS_DATA.filter(m => normalize(m.name).includes(q));
    if (partials.length > 0) return partials[0];
  }

  return null;
}

/**
 * Return ALL members whose name contains the query as a substring.
 * Used to populate "Other matches" suggestions when multiple records hit.
 */
function findAllPartial(query) {
  const q = normalize(query);
  if (q.length < 2) return [];
  return MEMBERS_DATA.filter(m =>
    normalize(m.id) === q ||
    normalize(m.name) === q ||
    normalize(m.name).includes(q)
  );
}

/**
 * Find fuzzy / partial matches for suggestions.
 * Returns up to 5 closest members sorted by edit distance.
 */
function findFuzzy(query) {
  const q = normalize(query);
  if (q.length < 2) return [];

  return MEMBERS_DATA
    .map(m => {
      const nName = normalize(m.name);
      const nId   = normalize(m.id);

      // Substring match wins immediately (score 0)
      if (nName.includes(q) || nId.includes(q)) {
        return { member: m, score: 0 };
      }

      // Levenshtein against full name and each individual word
      const words   = nName.split(' ');
      const minDist = Math.min(
        levenshtein(nName, q),
        ...words.map(w => levenshtein(w, q))
      );

      // Accept if distance is within a reasonable threshold
      if (minDist <= Math.max(2, Math.floor(q.length / 3))) {
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
 * Render the "not found" error card.
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

  // Click a suggestion → fill input and search immediately
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

  const match = findExact(query);

  if (match) {
    resultArea.innerHTML = renderMemberCard(match, code);

    // If there are more partial matches, show them as "Other matches" suggestions
    const allPartial = findAllPartial(query).filter(m => m.id !== match.id);
    renderSuggestions(allPartial, 'Other matches:');
  } else {
    resultArea.innerHTML = renderNotFound(query);
    // Fall back to fuzzy (typo-style) suggestions
    renderSuggestions(findFuzzy(query), 'Did you mean?');
  }
}

// ─── EVENT LISTENERS ──────────────────────────────────────────

searchBtn.addEventListener('click', performSearch);

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') performSearch();
  if (e.key === 'Escape') hideSuggestions();
});

function updateClearBtn() {
  clearBtn.style.display = searchInput.value.length > 0 ? 'block' : 'none';
}

searchInput.addEventListener('input', updateClearBtn);

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

