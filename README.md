<div align="center">

# 🎬 CineStream

**A Netflix-style streaming web app with an ultra-HD look, custom video player, and a zero-database JSON backend.**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-CDN-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

</div>

---

## 📖 Overview

CineStream is a full-stack streaming platform frontend inspired by modern services like Netflix. It ships with a curated catalog of 10 fictional movies & series (streamed from public sample videos), a cinematic dark UI, a feature-rich custom video player, and a lightweight Express API that persists the watchlist and watch progress to local JSON files — no database required.

## ✨ Features

### 🏠 Browsing & Discovery
- **Cinematic hero carousel** with auto-rotating featured titles and gradient overlays
- **Content shelves** — Continue Watching, Trending, Top 10, category rows (Movies, TV Shows, Sci-Fi, Action, Animation)
- **Live search** with instant dropdown results across titles, genres, synopses, and cast
- **Genre catalog** and category tabs (Home / Movies / TV Shows / New & Popular / My List)
- **Detail modal** with synopsis, match %, cast, quality badges (4K UHD, Dolby Atmos, HDR10+), and genre-based similar-title recommendations

### ▶️ Custom Video Player
- Play/pause, seek bar, skip ±10s, and volume/mute controls
- **Playback speed menu** (0.5× – 2×)
- **Picture-in-Picture** and **fullscreen** support
- Subtitle track selector
- **Next Episode** auto-button for series
- Auto-hiding controls with inactivity timer
- **Resume playback** — position is saved to the backend every few seconds and restored on return
- `Esc` exits the player or closes modals

### 📋 Personal Lists
- **My List / Watchlist** — add or remove titles from anywhere, persisted server-side with a live count badge
- **Continue Watching** row with per-title progress bars and remove buttons
- Rate titles from the detail modal

### 🔔 Extras
- Notifications panel with deep links into titles
- Toast notifications for actions
- Fully responsive dark UI (Inter font, Material Symbols icons)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express 5, CORS |
| Frontend | Vanilla JavaScript, HTML5, Tailwind CSS (CDN) |
| Media | HTML5 `<video>` with public Google sample streams |
| Storage | Flat JSON files (`data/*.json`) — no database |
| Icons/Fonts | Material Symbols, Google Fonts (Inter) |

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) (v18 or newer)

### Installation

```bash
git clone https://github.com/kushagraverma2008-cloud/CINESTREAM.git
cd CINESTREAM
npm install
```

### Run

**Windows (easiest):** double-click `START.bat` — it installs dependencies if missing, starts the server, and opens `http://localhost:3000` in your browser.

**Manual:**
```bash
node server.js
```
Then visit **http://localhost:3000**.

The port defaults to `3000` and can be overridden with the `PORT` environment variable.

## 📡 API Reference

All responses use the shape `{ success: boolean, ... }`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/movies` | All movies. Query params: `category`, `genre`, `type`, `q` (search) |
| `GET` | `/api/movies/featured` | The featured hero title |
| `GET` | `/api/movies/:id` | Single title + similar recommendations (shared genres) |
| `GET` | `/api/genres` | Distinct genre list |
| `GET` | `/api/watchlist` | Full watchlist with movie objects |
| `POST` | `/api/watchlist/toggle` | Add/remove a title — body: `{ "movieId": "..." }` |
| `GET` | `/api/continue-watching` | Titles with saved playback progress |
| `POST` | `/api/continue-watching` | Save progress — body: `{ titleId, episodeId, currentTime, duration, progressPercentage }` |
| `DELETE` | `/api/continue-watching/:id` | Remove saved progress for a title |
| `GET` | `/api/status` | Server health/version ping |

## 📁 Project Structure

```
cinestream/
├── server.js              # Express API + static file server
├── START.bat              # One-click Windows launcher
├── package.json
├── data/
│   ├── movies.json        # Catalog (movies, series, episodes, stream URLs)
│   ├── watchlist.json     # Saved watchlist IDs        (gitignored)
│   └── progress.json      # Playback progress map      (gitignored)
└── public/
    ├── index.html          # SPA shell (browse view + player view)
    ├── css/style.css
    └── js/
        ├── app.js          # Catalog rendering, search, lists, modals
        └── player.js       # Custom video player controller
```

## 📝 Notes

- `data/watchlist.json` and `data/progress.json` are gitignored and recreated automatically at runtime.
- All catalog titles, posters, and stream URLs in `data/movies.json` are fictional/demo content using royalty-free sample videos.

## 📄 License

ISC — feel free to use and modify.
