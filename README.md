# Christmas Advent Calendar

Dependency-free static site (vanilla HTML/CSS/JS), replicated from the original WunderCalendar. Everything it needs is in this repo, including the artwork and fonts.

## Structure
- `public/` — the site: `index.html`, `styles.css`, `app.js`, `assets/` (scene artwork, elf, fonts, `audio/door-open.mp3` played when a door opens)
- `scripts/build.mjs` — copies `public/` to `dist/` and fails if a file is missing or an external/localhost reference appears
- `scripts/serve.mjs` — tiny local static server

## Develop
Requires Node 18+. No `npm install` needed.

```bash
npm run dev       # http://localhost:5173 (serves public/)
npm run build     # outputs dist/
npm run preview   # serves dist/
```

## Configuration (`public/app.js`, top of file)
- `TEST_MODE = true` — every door opens regardless of date (as on the original), and a test bar is shown with a Test mode ON/OFF switch, a pretend-date field (real mechanics, any date) and a Reset doors button. Set to `false` for production: door N can be opened from N December (viewer's local time); doors for days already gone by are shown open automatically (on 5 December, doors 1–4 are open, door 5 waits to be clicked, 6–24 are locked). Today's door is remembered in `localStorage` once opened.
- `MOCK_DATE` — optional clock override for testing production mode.
- `PROMO_TEXT`, `CTA_LABEL`, `CTA_URL` — pop-up content and button link.

## Deploy (GitHub → Netlify)
Netlify settings (also in `netlify.toml`):
- Production branch: `main`
- Build command: `npm run build`
- Publish directory: `dist`

Push to `main` and Netlify redeploys automatically.

## Notes
- `BovineMVB.otf` is a licensed font; make sure your licence permits web use.
- Source Sans 3 is self-hosted (SIL Open Font License).
- The only external link is the CTA button destination (`CTA_URL`), a normal outbound link.
