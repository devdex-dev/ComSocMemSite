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
└── README.md           ← This file
```


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
