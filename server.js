const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const MOVIES_FILE = path.join(DATA_DIR, 'movies.json');
const WATCHLIST_FILE = path.join(DATA_DIR, 'watchlist.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helpers
function readJson(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

// Routes
// 1. Get all movies with optional filters (category, genre, type, search)
app.get('/api/movies', (req, res) => {
  let movies = readJson(MOVIES_FILE, []);
  const { category, genre, type, q } = req.query;

  if (category) {
    movies = movies.filter(m => m.category === category || (category === 'trending' && m.rating >= 4.7));
  }

  if (genre) {
    movies = movies.filter(m => m.genres && m.genres.some(g => g.toLowerCase() === genre.toLowerCase()));
  }

  if (type) {
    movies = movies.filter(m => m.type === type);
  }

  if (q) {
    const query = q.toLowerCase().trim();
    movies = movies.filter(m =>
      m.title.toLowerCase().includes(query) ||
      m.synopsis.toLowerCase().includes(query) ||
      (m.genres && m.genres.some(g => g.toLowerCase().includes(query))) ||
      (m.cast && m.cast.some(c => c.toLowerCase().includes(query)))
    );
  }

  res.json({ success: true, count: movies.length, data: movies });
});

// 2. Get featured hero title
app.get('/api/movies/featured', (req, res) => {
  const movies = readJson(MOVIES_FILE, []);
  const featured = movies.find(m => m.isFeatured) || movies[0];
  if (!featured) return res.status(404).json({ success: false, error: 'No featured movie found' });
  res.json({ success: true, data: featured });
});

// 3. Get single movie details with recommendation logic
app.get('/api/movies/:id', (req, res) => {
  const movies = readJson(MOVIES_FILE, []);
  const movie = movies.find(m => m.id === req.params.id);

  if (!movie) {
    return res.status(404).json({ success: false, error: 'Movie not found' });
  }

  // Find similar titles based on shared genres
  const similar = movies
    .filter(m => m.id !== movie.id && m.genres.some(g => movie.genres.includes(g)))
    .slice(0, 4);

  res.json({
    success: true,
    data: {
      ...movie,
      similar
    }
  });
});

// 4. Watchlist endpoints
app.get('/api/watchlist', (req, res) => {
  const watchlistIds = readJson(WATCHLIST_FILE, []);
  const movies = readJson(MOVIES_FILE, []);
  const watchlistMovies = movies.filter(m => watchlistIds.includes(m.id));
  res.json({ success: true, count: watchlistMovies.length, data: watchlistMovies });
});

app.post('/api/watchlist/toggle', (req, res) => {
  const { movieId } = req.body;
  if (!movieId) return res.status(400).json({ success: false, error: 'movieId is required' });

  let watchlist = readJson(WATCHLIST_FILE, []);
  const index = watchlist.indexOf(movieId);
  let inWatchlist = false;

  if (index >= 0) {
    watchlist.splice(index, 1);
    inWatchlist = false;
  } else {
    watchlist.push(movieId);
    inWatchlist = true;
  }

  writeJson(WATCHLIST_FILE, watchlist);
  res.json({ success: true, inWatchlist, count: watchlist.length });
});

// 5. Continue Watching progress endpoints
app.get('/api/continue-watching', (req, res) => {
  const progressMap = readJson(PROGRESS_FILE, {});
  const movies = readJson(MOVIES_FILE, []);

  const results = Object.keys(progressMap).map(id => {
    const movie = movies.find(m => m.id === id);
    if (!movie) return null;
    return {
      ...movie,
      progress: progressMap[id]
    };
  }).filter(Boolean);

  res.json({ success: true, count: results.length, data: results });
});

app.post('/api/continue-watching', (req, res) => {
  const { titleId, episodeId, episodeTitle, currentTime, duration, progressPercentage } = req.body;
  if (!titleId) return res.status(400).json({ success: false, error: 'titleId is required' });

  const progressMap = readJson(PROGRESS_FILE, {});
  progressMap[titleId] = {
    titleId,
    episodeId: episodeId || null,
    episodeTitle: episodeTitle || null,
    currentTime: Math.floor(currentTime || 0),
    duration: Math.floor(duration || 0),
    progressPercentage: Math.min(100, Math.max(0, Math.round(progressPercentage || 0))),
    lastWatched: new Date().toISOString()
  };

  writeJson(PROGRESS_FILE, progressMap);
  res.json({ success: true, data: progressMap[titleId] });
});

app.delete('/api/continue-watching/:id', (req, res) => {
  const progressMap = readJson(PROGRESS_FILE, {});
  if (progressMap[req.params.id]) {
    delete progressMap[req.params.id];
    writeJson(PROGRESS_FILE, progressMap);
  }
  res.json({ success: true, message: 'Removed from continue watching' });
});

// 6. Genres catalog
app.get('/api/genres', (req, res) => {
  const movies = readJson(MOVIES_FILE, []);
  const genresSet = new Set();
  movies.forEach(m => {
    if (m.genres) m.genres.forEach(g => genresSet.add(g));
  });
  res.json({ success: true, data: Array.from(genresSet) });
});

// 7. System status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    appName: 'CineStream',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`🎬 CineStream server running at http://localhost:${PORT}`);
});
