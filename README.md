# NOTE Scroll Video Landing

A Node/Express landing page with scroll-controlled background video and a protected admin panel.

## Local run

```bash
npm install
npm start
```

Open:

- Landing: `http://localhost:8080/`
- Admin: `http://localhost:8080/admin`

Default local admin credentials are defined in `server.js` only as a fallback:

- user: `admin`
- password: `change-this-password`

For public deployment, set environment variables:

```bash
ADMIN_USER=your-user
ADMIN_PASSWORD=your-strong-password
```

## Deploy notes

GitHub Pages is not enough for the admin panel because it cannot run `server.js` or save `/api/config` changes. Use GitHub as the code repository, then deploy to a Node host such as Render, Railway, Fly.io, or a VPS.

### Render settings

- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `ADMIN_USER`
  - `ADMIN_PASSWORD`

## Important files

- `index.html` — public landing page
- `app.js` — scroll/video controller
- `styles.css` — landing styles
- `admin.html` / `admin.js` / `admin.css` — admin panel
- `config.json` — editable site/campaign config
- `mp_.mp4` — default campaign video
- `video_note.mp4` — note campaign video
- `server.js` — Express server + admin auth + upload/config API

## Fixes in this clean version

- Removed `node_modules` and temporary search scripts.
- Moved admin credentials to environment variables.
- Added `.gitignore`, `.env.example`, and this README.
- Fixed the preloader issue caused by cached `localStorage` config not starting the experience.
- Added cache-busting for `app.js`, `styles.css`, `config.json`, and video URLs.
- Added practical security headers and a CSP that does not require `unsafe-eval`.
- Replaced localhost campaign links with relative URLs.
