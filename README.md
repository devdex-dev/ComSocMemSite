# 🛰️ COMSOC Member Verification System

A clean, static, GitHub Pages-ready membership verification portal for your COMSOC chapter. Pure vanilla JavaScript with no dependencies.

**Status:** ✅ Production Ready | **Language:** Vanilla JavaScript | **Hosting:** GitHub Pages | **Version:** v1.1

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Folder Structure](#folder-structure)
- [Features](#features)
- [Setup & Configuration](#setup--configuration)
- [How It Works](#how-it-works)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Developer Notes](#developer-notes)

---

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/devdex-dev/ComSocMemSite.git
   cd ComSocMemSite
   ```

2. **Add your data files:**
   - Create `members.csv` with member records
   - Create `academic_year.csv` with current year

3. **Deploy to GitHub Pages:**
   - Push to main branch
   - Enable Pages in Settings → Pages → Source: main branch
   - Access at: `https://<username>.github.io/ComSocMemSite`

---

## 📁 Folder Structure

```
ComSocMemSite/
│
├── 📄 index.html              ← Main landing page (single HTML file)
│                                Includes search form, result area, stats
│
├── 🎨 style.css               ← All styling (dark-tech aesthetic)
│                                CSS variables for easy theming
│                                Responsive design (mobile-friendly)
│
├── ⚙️ app.js                  ← Core application logic
│                                • CSV parsing & loading
│                                • Search algorithms (exact & fuzzy)
│                                • UI rendering
│                                • Event listeners
│
├── 📊 members.csv             ← Member data (REQUIRED)
│                                Format: ID, Name, Course/Year, Code
│
├── 📅 academic_year.csv       ← Academic year (REQUIRED)
│                                Format: academic_year, 2025-2026
│
├── 📖 README.md               ← This file
│
└── .gitignore                 ← (Optional) Hide sensitive files
```

### File Descriptions

#### **index.html** — Main Page
- Single-file HTML structure
- Contains search input, clear button, result area
- Stats strip showing total members, courses, academic year
- Suggestions box for fuzzy matches
- Responsive layout that works on mobile, tablet, desktop

#### **style.css** — Styling
- Dark-tech aesthetic with cyan accent color
- CSS custom properties (variables) for easy theming
- Flexbox-based responsive layout
- Card-based UI components
- Mobile-first design approach
- No external dependencies or frameworks

#### **app.js** — Application Logic (480+ lines)
| Section | Purpose |
|---------|---------|
| DOM References | Cache DOM element selectors |
| CSV Loader | `loadCSV()` - Fetch & parse members.csv |
| Academic Year Loader | `loadAcademicYear()` - Fetch & parse academic_year.csv |
| CSV Parser | `parseCSV()` - Convert CSV text to objects |
| Search Logic | `findExact()`, `findFuzzy()` - Match queries |
| UI Builders | `renderMemberCard()`, `renderSuggestions()` - Generate HTML |
| Event Listeners | Click, keyboard, input handlers |
| Utilities | `escapeHtml()` - Prevent XSS attacks |

#### **members.csv** — Member Registry (Required)
**Format:**
```csv
Member ID,Name,Course/Year,Verification Code
COM-2025-001,John Doe,BS Computer Science - Year 3,ABC123
COM-2025-002,Jane Smith,BS IT - Year 2,XYZ789
```

**Rules:**
- First row = headers (required)
- UTF-8 encoding
- Exact column order (no reordering)
- Quoted fields can contain commas
- One member per row

#### **academic_year.csv** — Academic Year (Required)
**Format:**
```csv
academic_year
2025-2026
```

**Rules:**
- First row = header
- Second row = year (e.g., 2025-2026)
- Used in stats display instead of system clock
- Update once per academic cycle

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Exact Matching** | Search by full name or Member ID |
| **Partial Matching** | Find by first/last name substring |
| **Fuzzy Matching** | Typo suggestions using Levenshtein distance |
| **Verification Code** | Optional code validation for each member |
| **Academic Year** | Auto-loaded from CSV (not system clock) |
| **Responsive Design** | Works on mobile, tablet, desktop |
| **No Backend** | 100% client-side, static hosting |
| **Real-time Search** | Instant results as you type |
| **Clear Error Handling** | User-friendly error messages |
| **Zero Dependencies** | Pure vanilla JavaScript |

---

## ⚙️ Setup & Configuration

### Step 1: Prepare members.csv

Create a file named `members.csv` in the root directory:

```csv
Member ID,Name,Course/Year,Verification Code
COM-2025-001,Alice Johnson,BS Computer Science - Year 1,VERIFY001
COM-2025-002,Bob Smith,BS Information Technology - Year 2,VERIFY002
COM-2025-003,Carol White,BS Computer Science - Year 3,VERIFY003
```

**CSV Best Practices:**
- Save as UTF-8 (not UTF-16 or ASCII)
- Use consistent date formats if needed
- Member IDs should be unique
- Verification codes are optional

### Step 2: Prepare academic_year.csv

Create a file named `academic_year.csv` in the root directory:

```csv
academic_year
2025-2026
```

Update this file each academic cycle (e.g., change to `2026-2027` in July).

### Step 3: Deploy to GitHub Pages

1. **Commit and push files:**
   ```bash
   git add .
   git commit -m "Add member data"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Source: main branch, / (root)
   - Wait 1-2 minutes for build

3. **Access your site:**
   ```
   https://<your-username>.github.io/ComSocMemSite
   ```

---

## 🔍 How It Works

### Search Flow

```
User Input
    ↓
findExact(query)
    ↓
    ├─→ Exact ID match? → YES → Display member card
    ├─→ Exact name match? → YES → Display member card
    └─→ Partial name match? → YES → Display member card
            ↓
            NO → findFuzzy(query) → Show suggestions
```

### Matching Examples

| Input | Result | Why |
|-------|--------|-----|
| `John Doe` | ✅ Found | Exact full name match |
| `COM-2025-001` | ✅ Found | Exact ID match |
| `John` | ✅ Found | Partial name match |
| `Jon` | ❌ Not found | But shows "John" as suggestion (Levenshtein distance) |

---

## 🎨 Customization

### Change Colors

Edit `style.css` (lines 15-30):

```css
:root {
  --bg: #0a0e27;              /* Background (dark blue) */
  --surface: #1a1f3a;         /* Card background */
  --accent: #00d4ff;          /* Highlight (cyan) */
  --text-primary: #e0e0e0;    /* Main text */
  --text-muted: #808080;      /* Muted text */
}
```

**Popular Themes:**
- **Default (Cyan):** `--accent: #00d4ff`
- **Green Matrix:** `--accent: #00ff00`
- **Purple Neon:** `--accent: #b366ff`
- **Orange Tech:** `--accent: #ff9500`

### Change Club Name

Edit `index.html`:

```html
<div class="logo-title">🛰️ YOUR CLUB NAME</div>
<div class="logo-sub">Member Verification System</div>
```

### Change Footer

Edit `index.html` (bottom):

```html
<footer>
  <p>&copy; 2026 COMSOC Club. All rights reserved.</p>
</footer>
```

---

## 🐛 Troubleshooting

### "Could not load member registry"

**Fix:**
1. Check `members.csv` exists in root folder
2. Filename must be exactly `members.csv` (lowercase)
3. First row must be headers
4. Verify UTF-8 encoding
5. Commit and push (local files don't work)
6. Hard-refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
7. Wait 2-3 minutes for GitHub Pages rebuild

### "Could not load academic year"

**Fix:**
1. Check `academic_year.csv` exists in root folder
2. Second line should contain the year
3. If missing, system falls back to current year
4. Check browser console (`F12` → Console tab) for error details

### Search returns no results

**Check:**
1. Is the name spelled exactly as in CSV?
2. Try searching with just first or last name
3. Verify the CSV file isn't empty or corrupted

### Changes not showing

**Fix:**
1. Hard-refresh: `Ctrl+Shift+R`
2. Clear browser cache
3. Wait 2-3 minutes for GitHub Pages rebuild
4. Check that files were actually pushed to GitHub

---

## 👨‍💻 Developer Notes

### Key Functions

| Function | Location | Purpose |
|----------|----------|---------|
| `loadCSV()` | Line 40 | Fetch and parse members.csv |
| `loadAcademicYear()` | Line 481 | Fetch and parse academic_year.csv |
| `parseCSV()` | Line 120 | Convert CSV text to objects |
| `findExact()` | Line 223 | Exact name/ID matching |
| `findFuzzy()` | Line 261 | Fuzzy matching with suggestions |
| `performSearch()` | Line 399 | Main search handler |
| `renderMemberCard()` | Line 299 | Display verified member |

### Search Algorithm

1. **Exact ID match** → Return immediately
2. **Exact name match** → Return immediately  
3. **Partial name match** (≥2 chars) → Return first match
4. **No match** → Calculate Levenshtein distance for up to 5 suggestions

### Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers
- ❌ Internet Explorer (not supported)

### Security

- **Client-side only** — All data in CSV files
- **Public data** — Anyone can view member list (intentional)
- **No authentication** — Simple lookup tool, not a secure system
- **Use generic codes** — Don't use passwords for verification codes

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.1 | 2026-04-22 | Academic year CSV support, enhanced README |
| v1.0 | 2026-04-15 | Initial release |

---

## 📞 Support

**Questions?** Contact your COMSOC chapter officers or open an issue on GitHub.

**Want to contribute?** Areas for enhancement:
- CSV file upload UI
- Export verification reports
- Dark/light theme toggle
- Multi-language support
- Advanced filtering

---

**Made with ❤️ for COMSOC | Ready for Programmer Transfer