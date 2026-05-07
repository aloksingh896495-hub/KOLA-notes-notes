# KOLA BRO – Multi-File Project Structure

This project is the original single `index-2.html` split into **9 clean files**
so it is easier to read, edit and maintain. The website looks and works exactly
the same as before — nothing has changed.

---

## 📁 File Overview

| File | What it contains |
|------|-----------------|
| `index.html` | Main page — assembles everything together |
| `style.css` | All CSS styles and animations (~980 lines) |
| `overlays.html` | Canvas, slide-out menu, modals, header, notification panel |
| `main-content.html` | Login, About, Subjects, Tips, Resources, Gallery, Quiz UI |
| `pages.html` | Feedback, Progress Tracker, Profile/XP/Badges, Timetable pages |
| `footer.html` | Footer and ad script |
| `firebase-app.js` | Firebase setup, Auth, Admin panel, Notifications logic |
| `three-bg.js` | Three.js 3D animated background |
| `ui.js` | Menu, Settings, Tools (Calculator, Converter, Stopwatch, Formulae), Sounds, XP/Streaks |
| `quiz.js` | Quiz module — loads questions, handles answers, saves results |

---

## ✏️ How to Edit

- **Change colours or fonts?** → Open `style.css`
- **Change menu items or page layout?** → Open `overlays.html`
- **Change subjects, chapters, gallery or login screen?** → Open `main-content.html`
- **Change feedback/progress/profile/timetable pages?** → Open `pages.html`
- **Change footer links?** → Open `footer.html`
- **Change Firebase config or admin logic?** → Open `firebase-app.js`
- **Change quiz behaviour?** → Open `quiz.js`
- **Change background animation?** → Open `three-bg.js`
- **Change calculator, settings, XP?** → Open `ui.js`

After editing any file, just refresh your browser — no build step needed.

---

## ⚠️ Important Notes

- All files **must be in the same folder** for the links to work.
- `firebase-app.js` and `quiz.js` use ES Modules (`import`), so the site
  **must be served via a web server** (GitHub Pages, localhost, etc.).
  Opening `index.html` directly from your file system (double-clicking it)
  may block module scripts — use a local server or upload to GitHub Pages.

