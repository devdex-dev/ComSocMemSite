# 🛰️ COMSOC Member Verification System v2.0

A full-featured static SPA for your COMSOC chapter. Pure vanilla JavaScript, zero dependencies, GitHub Pages / Render ready.

**Status:** ✅ Production Ready | **Version:** v2.0 | **Hosting:** GitHub Pages / Render

---

## 🚀 Quick Start

```bash
git clone https://github.com/devdex-dev/ComSocMemSite.git
cd ComSocMemSite
```

Push all files to `main` and enable GitHub Pages under **Settings → Pages → Source: main branch**.

---

## 📁 File Structure

```
ComSocMemSite/
├── index.html            ← SPA shell (all 6 pages)
├── style.css             ← Deep glassmorphism styles
├── app.js                ← Full SPA logic
├── members.csv           ← Member registry (EDIT TO ADD/REMOVE MEMBERS)
├── academic_year.csv     ← Current academic year (EDIT TO UPDATE)
├── events.csv            ← Events & announcements
├── officers.csv          ← Officer profiles
├── admin_config.csv      ← SHA-256 hashed admin password
└── README.md
```

---

## 📄 Pages

| Route | Page |
|---|---|
| `#home` | Landing page with stats & feature links |
| `#verify` | Member verification by name or ID |
| `#members` | Paginated member directory with program filter |
| `#events` | Events & announcements (filterable by status) |
| `#about` | About section, officer profiles, inquiry form |
| `#admin` | Password-protected admin panel |

---

## 📊 CSV File Formats

### members.csv — Add/Remove Members Here
```csv
id,name,course,verificationCode
COMSOC-0001,"DELA CRUZ, JUAN",BSIT-1,COM-VRF-A001
COMSOC-0002,"SANTOS, MARIA",BSIT-2,COM-VRF-A002
```
- **To add a member:** Add a new row with the next ID, name, course, and a unique verification code.
- **To remove a member:** Delete their row.
- Push changes to GitHub — the site updates automatically after Pages rebuilds (~1 min).

### academic_year.csv — Update Academic Year Here
```csv
academic_year
2025-2026
```
- Change `2025-2026` to the new year (e.g. `2026-2027`) and push.
- You can also use the **Admin Panel → Academic Year tab** to download a pre-filled template.

### events.csv
```csv
title,date,description,tag,status
General Assembly,2025-08-15,Annual GA for all members.,General,past
Tech Talk,2026-06-01,Web dev fundamentals session.,Workshop,upcoming
```
- Status values: `upcoming`, `ongoing`, `past`

### officers.csv
```csv
name,position,course,bio,photo_url
Juan dela Cruz,President,BSIT-4,Leading COMSOC.,
```
- `photo_url` is optional — leave blank to use initials avatar.

---

## 🔐 Admin Panel

### Default Password
```
comsoc2026
```

### Changing the Password
The password is stored as a **SHA-256 hash** in `admin_config.csv`. To change it:

1. Generate a SHA-256 hash of your new password:
   - Online tool: https://emn178.github.io/online-tools/sha256.html
   - Terminal: `echo -n "yourpassword" | sha256sum`

2. Replace the hash value in `admin_config.csv`:
```csv
password_hash
<your-new-sha256-hash-here>
```

3. Push the updated `admin_config.csv` to GitHub.

### Admin Tools
- **Analytics** — Member count, program breakdown, bar chart
- **Member Manager** — Browse, search, and filter the full registry
- **Export** — Download full or filtered `members.csv`
- **Academic Year** — Download a new `academic_year.csv` template

> Members are managed by editing CSV files directly and pushing to GitHub. The Export tab lets you download the current list, edit it locally, then re-upload.

---

## 🎨 Customization

### Colors — edit `style.css` (top `:root` block)
```css
:root {
  --accent:  #00e5ff;   /* Cyan — primary highlight */
  --accent2: #7c5cfc;   /* Purple — secondary */
  --accent3: #ff6b9d;   /* Pink — tertiary */
  --bg:      #03040f;   /* Near-black background */
}
```

### Club Name — edit `index.html`
```html
<div class="nav-logo-mark">CS</div>   <!-- initials -->
<span class="nav-logo-text">COMSOC</span>
```

---

## 📝 Version History

| Version | Date | Changes |
|---|---|---|
| v2.0 | 2026-04-22 | Full SPA rewrite — 6 pages, admin panel, SHA-256 auth, directory, events, officers |
| v1.1 | 2026-04-22 | Academic year CSV, enhanced README |
| v1.0 | 2026-04-15 | Initial release |

---

**Made with ❤️ for COMSOC**
