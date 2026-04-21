# 🛰️ COMSOC Club — Member Verification System

A clean, static, GitHub Pages-ready membership verification portal for your IEEE COMSOC chapter.

---

## 📁 Folder Structure

```
comsoc-verify/
├── index.html          ← Main page (single HTML file)
├── style.css           ← All styling (dark-tech aesthetic)
├── app.js              ← Search logic, fuzzy matching, UI rendering
├── members.js          ← Member data (EDIT THIS with your real members)
├── members_sample.csv  ← Sample data in CSV format (for reference / Excel)
└── README.md           ← This file
```

---

## 🚀 Step-by-Step: Deploy to GitHub Pages

### Step 1 — Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in.
2. Click **"New repository"** (green button, top right).
3. Name it something like `comsoc-verify` or `comsoc-membership`.
4. Set it to **Public** (required for free GitHub Pages).
5. Click **Create repository**.

---

### Step 2 — Upload Your Files

**Option A — Via Browser (easiest):**
1. Open your new repo.
2. Click **"Add file" → "Upload files"**.
3. Drag and drop all 5 files:
   - `index.html`
   - `style.css`
   - `app.js`
   - `members.js`
   - `members_sample.csv` *(optional, just for reference)*
4. Scroll down, click **"Commit changes"**.

**Option B — Via Git CLI:**
```bash
git init
git add .
git commit -m "Initial commit: COMSOC verification system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/comsoc-verify.git
git push -u origin main
```

---

### Step 3 — Enable GitHub Pages

1. In your repository, click **Settings** (top menu).
2. Scroll down to **"Pages"** in the left sidebar.
3. Under **"Source"**, select:
   - Branch: `main`
   - Folder: `/ (root)`
4. Click **Save**.
5. Wait ~1–2 minutes. Your site will be live at:

```
https://YOUR_USERNAME.github.io/comsoc-verify/
```

---

## ✏️ How to Update Member Data

### From Excel (.xlsx):

1. Open your Excel file.
2. Go to **File → Save As → CSV UTF-8 (.csv)**.
3. Open [csvjson.com](https://csvjson.com/csv2json) or any CSV-to-JSON tool.
4. Upload/paste your CSV. Make sure columns match:
   - `id` → Member ID
   - `name` → Full Name
   - `course` → Course/Year
   - `verificationCode` → Verification Code
5. Copy the JSON array.
6. Open `members.js` and replace the array inside `MEMBERS_DATA = [ ... ]`.

### Direct edit (small updates):

Open `members.js` and add/edit entries like this:

```javascript
{
  id: "COM-2025-021",
  name: "Juan Dela Cruz",
  course: "BS Computer Engineering — 1st Year",
  verificationCode: "COM-VRF-X021"
},
```

---

## 🔍 How Search Works

| Feature | Behavior |
|---|---|
| **Name search** | Full name, case-insensitive, trimmed |
| **ID search** | Exact Member ID match (e.g. `COM-2025-001`) |
| **Verification code** | Optional — enter to validate against record |
| **Fuzzy suggestions** | Shows "Did you mean?" for close-but-not-exact names |
| **Not found** | Shows clear error card with instructions |

### Accurate Matching Rules:
- Search must match the **full name** exactly (no partial name → result).
- OR must match the **exact Member ID**.
- The fuzzy suggestions panel shows partial/close matches to help the user correct their query — but does not count as a successful verification.

---

## 🔒 Security Notes

- This is a **client-side static system** — all data is in `members.js`.
- Anyone who views source can see member data. This is intentional for a public directory.
- If you need privacy, consider password-protecting the page (not possible on free GitHub Pages) or using a backend.
- Verification codes add a light second-factor check, but are also visible in source.

---

## 🛠️ Customization Tips

| What to change | Where |
|---|---|
| Club name / logo | `index.html` — `.logo-title`, `.logo-sub` |
| Colors & fonts | `style.css` — `:root` CSS variables |
| Accent color | `--accent` in `style.css` |
| Academic year | Auto-detected from system clock in `app.js` |
| Footer text | `index.html` — `<footer>` |

---

## 📬 Support

For questions, contact your COMSOC chapter officers or open an issue in the repository.

---

* Computer Society (COMSOC) — Member Verification System v1.0*
