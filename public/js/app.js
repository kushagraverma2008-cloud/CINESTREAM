// CineStream Core Application Controller

let allMovies = [];
let watchlistIds = new Set();
let continueWatchingList = [];
let currentHeroIndex = 0;
let featuredMovies = [];
let currentDetailMovie = null;
let currentTab = 'home';

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([
    loadMovies(),
    loadWatchlist(),
    loadContinueWatching()
  ]);

  initSearch();
  initKeyListeners();
});

// API Calls
async function loadMovies() {
  try {
    const res = await fetch('/api/movies');
    const json = await res.json();
    if (json.success) {
      allMovies = json.data;
      featuredMovies = allMovies.filter(m => m.rating >= 4.7);
      renderHero(featuredMovies[0] || allMovies[0]);
      renderCarouselDots();
      renderShelves();
    }
  } catch (err) {
    console.error('Failed to load movies:', err);
    triggerToast('Error loading movies from server', 'error');
  }
}

async function loadWatchlist() {
  try {
    const res = await fetch('/api/watchlist');
    const json = await res.json();
    if (json.success) {
      watchlistIds = new Set(json.data.map(m => m.id));
      updateWatchlistBadge();
    }
  } catch (err) {
    console.error('Failed to load watchlist:', err);
  }
}

async function loadContinueWatching() {
  try {
    const res = await fetch('/api/continue-watching');
    const json = await res.json();
    if (json.success) {
      continueWatchingList = json.data;
      renderContinueWatching();
    }
  } catch (err) {
    console.error('Failed to load continue watching:', err);
  }
}

// Watchlist Toggle
async function toggleWatchlist(movieId, event) {
  if (event) event.stopPropagation();
  try {
    const res = await fetch('/api/watchlist/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId })
    });
    const json = await res.json();
    if (json.success) {
      if (json.inWatchlist) {
        watchlistIds.add(movieId);
        triggerToast('Added to My List', 'bookmark_added');
      } else {
        watchlistIds.delete(movieId);
        triggerToast('Removed from My List', 'bookmark_remove');
      }
      updateWatchlistBadge();
      updateWatchlistButtons(movieId);
      if (currentTab === 'watchlist') {
        renderWatchlistTab();
      }
    }
  } catch (err) {
    console.error('Failed to toggle watchlist:', err);
  }
}

function updateWatchlistBadge() {
  const badge = document.getElementById('watchlist-count-badge');
  if (badge) {
    badge.textContent = watchlistIds.size;
    badge.classList.toggle('hidden', watchlistIds.size === 0);
  }
}

function updateWatchlistButtons(movieId) {
  // Update Hero button if applicable
  const heroMovie = featuredMovies[currentHeroIndex];
  if (heroMovie && heroMovie.id === movieId) {
    const heroIcon = document.getElementById('hero-watchlist-icon');
    if (heroIcon) heroIcon.textContent = watchlistIds.has(movieId) ? 'check' : 'add';
  }

  // Update Modal button if open
  if (currentDetailMovie && currentDetailMovie.id === movieId) {
    const modalIcon = document.getElementById('modal-watchlist-icon');
    if (modalIcon) modalIcon.textContent = watchlistIds.has(movieId) ? 'check' : 'add';
  }

  // Re-render card icons
  document.querySelectorAll(`[data-watchlist-id="${movieId}"]`).forEach(btn => {
    btn.innerHTML = `<span class="material-symbols-outlined text-lg">${watchlistIds.has(movieId) ? 'check' : 'add'}</span>`;
  });
}

// Hero Rendering
function renderHero(movie) {
  if (!movie) return;
  const backdrop = document.getElementById('hero-backdrop');
  const title = document.getElementById('hero-title');
  const synopsis = document.getElementById('hero-synopsis');
  const rating = document.getElementById('hero-rating');
  const age = document.getElementById('hero-age-rating');
  const playBtn = document.getElementById('hero-play-btn');
  const infoBtn = document.getElementById('hero-info-btn');
  const watchlistBtn = document.getElementById('hero-watchlist-btn');
  const watchlistIcon = document.getElementById('hero-watchlist-icon');

  backdrop.style.backgroundImage = `url('${movie.backdropUrl}')`;
  title.textContent = movie.title;
  synopsis.textContent = movie.synopsis;
  rating.textContent = movie.rating;
  age.textContent = movie.ageRating;

  watchlistIcon.textContent = watchlistIds.has(movie.id) ? 'check' : 'add';

  playBtn.onclick = () => launchPlayer(movie);
  infoBtn.onclick = () => openDetailModal(movie.id);
  watchlistBtn.onclick = (e) => toggleWatchlist(movie.id, e);
}

function renderCarouselDots() {
  const container = document.getElementById('hero-carousel-dots');
  container.innerHTML = '';
  featuredMovies.forEach((m, idx) => {
    const dot = document.createElement('span');
    dot.className = idx === currentHeroIndex
      ? 'w-8 h-1.5 rounded-full bg-primary-container transition-all cursor-pointer'
      : 'w-2 h-1.5 rounded-full bg-white/30 hover:bg-white/60 transition-all cursor-pointer';
    dot.onclick = () => {
      currentHeroIndex = idx;
      renderHero(featuredMovies[idx]);
      renderCarouselDots();
    };
    container.appendChild(dot);
  });
}

// Shelves Rendering
function renderShelves() {
  renderTrendingRow();
  renderTop10Row();
  renderCategoryRow('scifi', 'scifi-row');
  renderCategoryRow('action', 'action-row');
}

// Continue Watching
function renderContinueWatching() {
  const container = document.getElementById('continue-watching-row');
  const section = document.getElementById('continue-watching-section');
  if (!container || !section) return;

  if (continueWatchingList.length === 0) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  container.innerHTML = '';

  continueWatchingList.forEach(item => {
    const progress = item.progress || { progressPercentage: 45, currentTime: 1200, duration: 3600 };
    const pct = progress.progressPercentage || 45;
    const subtitle = item.type === 'series'
      ? (progress.episodeTitle ? `S1:E3 • ${progress.episodeTitle}` : 'Season 1')
      : `${item.year} • ${item.runtime}`;

    const card = document.createElement('div');
    card.className = 'flex-shrink-0 w-72 sm:w-80 group/card relative rounded-xl overflow-hidden bg-[#181B24] border border-white/10 movie-card cursor-pointer';
    card.innerHTML = `
      <div class="relative aspect-video w-full overflow-hidden">
        <img src="${item.backdropUrl || item.posterUrl}" alt="${item.title}" class="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"/>
        <div class="absolute inset-0 bg-black/40 group-hover/card:bg-black/20 transition-colors flex items-center justify-center">
          <div class="w-12 h-12 rounded-full bg-primary-container text-white flex items-center justify-center shadow-lg group-hover/card:scale-110 transition-transform">
            <span class="material-symbols-outlined material-symbols-fill text-2xl">play_arrow</span>
          </div>
        </div>
        <!-- Progress Bar at bottom of thumbnail -->
        <div class="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
          <div class="h-full bg-primary-container" style="width: ${pct}%"></div>
        </div>
      </div>
      <div class="p-3.5 flex items-center justify-between">
        <div class="min-w-0 flex-1 pr-2">
          <h4 class="font-bold text-white text-sm truncate">${item.title}</h4>
          <p class="text-xs text-[#7B8090] truncate">${subtitle}</p>
        </div>
        <div class="flex items-center gap-1">
          <button onclick="openDetailModal('${item.id}'); event.stopPropagation();" title="More Info" class="p-1.5 text-[#B6BAC3] hover:text-white rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-lg">info</span>
          </button>
          <button onclick="removeProgress('${item.id}', event)" title="Remove from Continue Watching" class="p-1.5 text-[#B6BAC3] hover:text-red-400 rounded-lg hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    `;
    card.onclick = () => launchPlayer(item, progress.currentTime);
    container.appendChild(card);
  });
}

async function removeProgress(titleId, event) {
  if (event) event.stopPropagation();
  try {
    await fetch(`/api/continue-watching/${titleId}`, { method: 'DELETE' });
    continueWatchingList = continueWatchingList.filter(item => item.id !== titleId);
    renderContinueWatching();
    triggerToast('Removed from Continue Watching', 'delete');
  } catch (err) {
    console.error('Failed to remove progress:', err);
  }
}

// Trending Row
function renderTrendingRow() {
  const container = document.getElementById('trending-row');
  if (!container) return;
  container.innerHTML = '';

  const trending = allMovies.slice(0, 8);
  trending.forEach(movie => {
    container.appendChild(createStandardMovieCard(movie));
  });
}

// Top 10 Row with big rank numbers
function renderTop10Row() {
  const container = document.getElementById('top10-row');
  if (!container) return;
  container.innerHTML = '';

  const top10 = allMovies.slice(0, 10);
  top10.forEach((movie, idx) => {
    const card = document.createElement('div');
    card.className = 'flex-shrink-0 flex items-center group/card cursor-pointer relative';
    card.innerHTML = `
      <!-- Big Stylized Rank Number -->
      <span class="text-7xl sm:text-8xl font-black text-white/20 group-hover/card:text-primary-container/40 transition-colors font-mono -mr-4 select-none tracking-tighter z-10">${idx + 1}</span>
      <div class="w-40 sm:w-48 aspect-[2/3] rounded-xl overflow-hidden bg-[#181B24] border border-white/10 relative movie-card">
        <img src="${movie.posterUrl}" alt="${movie.title}" class="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"/>
        <!-- Hover Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity p-3 flex flex-col justify-end">
          <h4 class="font-bold text-white text-xs truncate mb-1">${movie.title}</h4>
          <div class="flex items-center gap-1.5 text-[10px] text-white/80 mb-2">
            <span class="text-[#FFD166] font-bold">★ ${movie.rating}</span>
            <span>•</span>
            <span>${movie.year}</span>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="launchPlayerById('${movie.id}'); event.stopPropagation();" class="flex-1 py-1.5 rounded-lg bg-primary-container text-white text-xs font-semibold flex items-center justify-center gap-1">
              <span class="material-symbols-outlined material-symbols-fill text-sm">play_arrow</span>
              Play
            </button>
            <button onclick="toggleWatchlist('${movie.id}', event)" class="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white" data-watchlist-id="${movie.id}">
              <span class="material-symbols-outlined text-sm">${watchlistIds.has(movie.id) ? 'check' : 'add'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
    card.onclick = () => openDetailModal(movie.id);
    container.appendChild(card);
  });
}

// Category Row
function renderCategoryRow(category, elementId) {
  const container = document.getElementById(elementId);
  if (!container) return;
  container.innerHTML = '';

  const filtered = allMovies.filter(m => m.category === category || (m.genres && m.genres.some(g => g.toLowerCase().includes(category))));
  const list = filtered.length > 0 ? filtered : allMovies.slice(2, 8);

  list.forEach(movie => {
    container.appendChild(createStandardMovieCard(movie));
  });
}

function createStandardMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'flex-shrink-0 w-44 sm:w-52 aspect-[2/3] rounded-xl overflow-hidden bg-[#181B24] border border-white/10 relative movie-card group/card cursor-pointer';
  card.innerHTML = `
    <img src="${movie.posterUrl}" alt="${movie.title}" class="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"/>
    <!-- Badges -->
    <div class="absolute top-2.5 left-2.5 z-10 flex items-center gap-1">
      <span class="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10 text-[10px] text-[#FFD166] font-bold">★ ${movie.rating}</span>
    </div>
    <!-- Hover Overlay -->
    <div class="absolute inset-0 bg-gradient-to-t from-[#0B0D12] via-[#0B0D12]/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity p-3.5 flex flex-col justify-end z-20">
      <h4 class="font-bold text-white text-sm truncate mb-0.5">${movie.title}</h4>
      <p class="text-[11px] text-primary truncate mb-2">${movie.genres ? movie.genres.join(', ') : ''}</p>
      <div class="flex items-center gap-2">
        <button onclick="launchPlayerById('${movie.id}'); event.stopPropagation();" class="flex-1 py-1.5 rounded-lg bg-primary-container hover:bg-[#C92E42] text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-md">
          <span class="material-symbols-outlined material-symbols-fill text-sm">play_arrow</span>
          Play
        </button>
        <button onclick="toggleWatchlist('${movie.id}', event)" class="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" data-watchlist-id="${movie.id}" title="Watchlist">
          <span class="material-symbols-outlined text-sm">${watchlistIds.has(movie.id) ? 'check' : 'add'}</span>
        </button>
        <button onclick="openDetailModal('${movie.id}'); event.stopPropagation();" class="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors" title="More Info">
          <span class="material-symbols-outlined text-sm">info</span>
        </button>
      </div>
    </div>
  `;
  card.onclick = () => openDetailModal(movie.id);
  return card;
}

// Horizontal Scroll helper
function scrollRow(rowId, amount) {
  const row = document.getElementById(rowId);
  if (row) {
    row.scrollBy({ left: amount, behavior: 'smooth' });
  }
}

// Detail Modal
async function openDetailModal(movieId) {
  try {
    const res = await fetch(`/api/movies/${movieId}`);
    const json = await res.json();
    if (!json.success) return;

    const movie = json.data;
    currentDetailMovie = movie;

    const modal = document.getElementById('detail-modal');
    document.getElementById('modal-banner-img').src = movie.backdropUrl || movie.posterUrl;
    document.getElementById('modal-title').textContent = movie.title;
    document.getElementById('modal-tagline').textContent = movie.tagline || '';
    document.getElementById('modal-match').textContent = `${movie.matchPercentage || 98}% Match`;
    document.getElementById('modal-year').textContent = movie.year;
    document.getElementById('modal-age').textContent = movie.ageRating;
    document.getElementById('modal-runtime').textContent = movie.runtime;
    document.getElementById('modal-synopsis').textContent = movie.synopsis;
    document.getElementById('modal-cast').textContent = movie.cast ? movie.cast.join(', ') : 'N/A';
    document.getElementById('modal-director').textContent = movie.director || 'N/A';
    document.getElementById('modal-writer').textContent = movie.writer || 'N/A';
    document.getElementById('modal-genres').textContent = movie.genres ? movie.genres.join(' • ') : '';

    // Watchlist icon
    const modalWatchlistIcon = document.getElementById('modal-watchlist-icon');
    modalWatchlistIcon.textContent = watchlistIds.has(movie.id) ? 'check' : 'add';
    document.getElementById('modal-watchlist-btn').onclick = (e) => toggleWatchlist(movie.id, e);

    // Play button
    document.getElementById('modal-play-btn').onclick = () => {
      closeDetailModal();
      launchPlayer(movie);
    };

    // Episodes (if series)
    const episodesSection = document.getElementById('modal-episodes-section');
    const episodesList = document.getElementById('modal-episodes-list');
    if (movie.type === 'series' && movie.episodes && movie.episodes.length > 0) {
      episodesSection.classList.remove('hidden');
      episodesList.innerHTML = '';
      movie.episodes.forEach(ep => {
        const epRow = document.createElement('div');
        epRow.className = 'flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all cursor-pointer group';
        epRow.innerHTML = `
          <span class="font-bold text-white/50 group-hover:text-white text-base w-6 text-center">${ep.episodeNumber}</span>
          <div class="relative w-28 sm:w-36 aspect-video rounded-lg overflow-hidden flex-shrink-0">
            <img src="${ep.thumbnail}" alt="${ep.title}" class="w-full h-full object-cover"/>
            <div class="absolute inset-0 bg-black/40 group-hover:bg-black/10 flex items-center justify-center transition-colors">
              <span class="material-symbols-outlined text-white text-2xl group-hover:scale-110 transition-transform">play_circle</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2 mb-1">
              <h5 class="font-semibold text-white text-sm truncate">${ep.title}</h5>
              <span class="text-xs text-[#7B8090] font-mono">${ep.duration}</span>
            </div>
            <p class="text-xs text-[#B6BAC3] line-clamp-2">${ep.synopsis}</p>
          </div>
        `;
        epRow.onclick = () => {
          closeDetailModal();
          launchPlayer(movie, 0, ep);
        };
        episodesList.appendChild(epRow);
      });
    } else {
      episodesSection.classList.add('hidden');
    }

    // Similar recommendations
    const similarGrid = document.getElementById('modal-similar-grid');
    similarGrid.innerHTML = '';
    const similar = movie.similar && movie.similar.length > 0 ? movie.similar : allMovies.filter(m => m.id !== movie.id).slice(0, 4);
    similar.forEach(sim => {
      const card = document.createElement('div');
      card.className = 'rounded-xl overflow-hidden bg-[#181B24] border border-white/10 cursor-pointer group/sim';
      card.innerHTML = `
        <div class="aspect-video w-full overflow-hidden relative">
          <img src="${sim.backdropUrl || sim.posterUrl}" alt="${sim.title}" class="w-full h-full object-cover group-hover/sim:scale-105 transition-transform"/>
          <div class="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px] text-[#FFD166] font-bold">★ ${sim.rating}</div>
        </div>
        <div class="p-3">
          <h5 class="font-bold text-white text-xs truncate mb-1">${sim.title}</h5>
          <p class="text-[11px] text-[#7B8090] line-clamp-2">${sim.synopsis}</p>
        </div>
      `;
      card.onclick = () => openDetailModal(sim.id);
      similarGrid.appendChild(card);
    });

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  } catch (err) {
    console.error('Failed to open detail modal:', err);
  }
}

function closeDetailModal() {
  const modal = document.getElementById('detail-modal');
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
  currentDetailMovie = null;
}

function toggleRateMovie() {
  const icon = document.getElementById('modal-rate-icon');
  const isFilled = icon.classList.contains('fill-icon');
  if (isFilled) {
    icon.classList.remove('fill-icon');
    triggerToast('Rating removed', 'thumb_down');
  } else {
    icon.classList.add('fill-icon');
    triggerToast('Rated 5 Stars!', 'thumb_up');
  }
}

// Navigation Tabs
function navigateTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.remove('text-white', 'font-semibold', 'border-b-2', 'border-primary-container');
    btn.classList.add('text-[#B6BAC3]', 'font-medium');
  });

  const activeBtn = document.getElementById(`nav-${tab}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-[#B6BAC3]', 'font-medium');
    activeBtn.classList.add('text-white', 'font-semibold', 'border-b-2', 'border-primary-container');
  }

  const heroSection = document.getElementById('hero-banner');
  const continueSection = document.getElementById('continue-watching-section');

  if (tab === 'home') {
    heroSection.classList.remove('hidden');
    continueSection.classList.remove('hidden');
    renderShelves();
  } else if (tab === 'movies') {
    heroSection.classList.add('hidden');
    continueSection.classList.add('hidden');
    renderFilteredGrid(allMovies.filter(m => m.type === 'movie'), 'All Movies');
  } else if (tab === 'series') {
    heroSection.classList.add('hidden');
    continueSection.classList.add('hidden');
    renderFilteredGrid(allMovies.filter(m => m.type === 'series'), 'TV Shows & Series');
  } else if (tab === 'trending') {
    heroSection.classList.add('hidden');
    continueSection.classList.add('hidden');
    renderFilteredGrid(allMovies.filter(m => m.rating >= 4.7), 'Trending & Popular');
  } else if (tab === 'watchlist') {
    heroSection.classList.add('hidden');
    continueSection.classList.add('hidden');
    renderWatchlistTab();
  }
}

function renderFilteredGrid(list, title) {
  const shelfContainer = document.querySelector('main > div.px-6');
  shelfContainer.innerHTML = `
    <div class="space-y-6 pt-6">
      <div class="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 class="text-2xl font-bold text-white tracking-tight">${title}</h2>
        <span class="text-sm text-[#7B8090]">${list.length} Titles Found</span>
      </div>
      <div id="filtered-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6"></div>
    </div>
  `;
  const grid = document.getElementById('filtered-grid');
  list.forEach(m => grid.appendChild(createStandardMovieCard(m)));
}

function renderWatchlistTab() {
  const watchlistMovies = allMovies.filter(m => watchlistIds.has(m.id));
  if (watchlistMovies.length === 0) {
    const shelfContainer = document.querySelector('main > div.px-6');
    shelfContainer.innerHTML = `
      <div class="py-20 text-center space-y-4">
        <span class="material-symbols-outlined text-6xl text-[#7B8090]">bookmark_border</span>
        <h3 class="text-2xl font-bold text-white">Your Watchlist is Empty</h3>
        <p class="text-sm text-[#7B8090] max-w-md mx-auto">Explore our catalog and click the "+" icon on any title to save it for later.</p>
        <button onclick="navigateTab('home')" class="px-6 py-2.5 rounded-xl bg-primary-container text-white font-semibold hover:bg-[#C92E42] transition-colors">
          Browse Movies
        </button>
      </div>
    `;
    return;
  }
  renderFilteredGrid(watchlistMovies, 'My Watchlist');
}

// Search
function initSearch() {
  const searchInput = document.getElementById('search-input');
  const dropdown = document.getElementById('search-dropdown');
  const resultsDiv = document.getElementById('search-results');

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim().toLowerCase();
    if (!query) {
      dropdown.classList.add('hidden');
      return;
    }

    debounceTimer = setTimeout(() => {
      const matches = allMovies.filter(m =>
        m.title.toLowerCase().includes(query) ||
        m.synopsis.toLowerCase().includes(query) ||
        (m.genres && m.genres.some(g => g.toLowerCase().includes(query)))
      );

      resultsDiv.innerHTML = '';
      if (matches.length === 0) {
        resultsDiv.innerHTML = `<div class="p-4 text-xs text-[#7B8090] text-center">No titles found for "${query}"</div>`;
      } else {
        matches.slice(0, 5).forEach(m => {
          const item = document.createElement('div');
          item.className = 'flex items-center gap-3 p-3 hover:bg-white/10 transition-colors cursor-pointer';
          item.innerHTML = `
            <img src="${m.posterUrl}" alt="${m.title}" class="w-10 h-14 object-cover rounded-md flex-shrink-0"/>
            <div class="min-w-0 flex-1">
              <p class="font-bold text-white text-xs truncate">${m.title}</p>
              <p class="text-[11px] text-[#7B8090] truncate">${m.year} • ${m.genres ? m.genres[0] : ''}</p>
            </div>
            <span class="text-xs text-[#FFD166] font-bold">★ ${m.rating}</span>
          `;
          item.onclick = () => {
            dropdown.classList.add('hidden');
            searchInput.value = '';
            openDetailModal(m.id);
          };
          resultsDiv.appendChild(item);
        });
      }
      dropdown.classList.remove('hidden');
    }, 200);
  });

  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

// Key Listeners
function initKeyListeners() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('detail-modal');
      if (!modal.classList.contains('hidden')) {
        closeDetailModal();
      }
      const playerView = document.getElementById('player-view');
      if (!playerView.classList.contains('hidden')) {
        exitPlayer();
      }
    }
  });
}

// Dropdowns & Panels
function toggleNotifications() {
  const panel = document.getElementById('notifications-panel');
  panel.classList.toggle('hidden');
}

function clearNotifications() {
  triggerToast('All notifications cleared', 'done_all');
  document.getElementById('notifications-panel').classList.add('hidden');
}

function toggleProfileMenu() {
  const menu = document.getElementById('profile-dropdown');
  menu.classList.toggle('hidden');
}

// Toast
let toastTimeout;
function triggerToast(message, icon = 'info') {
  const toast = document.getElementById('toast-notification');
  const msgEl = document.getElementById('toast-message');
  const iconEl = document.getElementById('toast-icon');

  msgEl.textContent = message;
  iconEl.textContent = icon;

  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
