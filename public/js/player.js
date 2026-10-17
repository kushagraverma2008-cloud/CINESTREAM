// CineStream Video Player Controller

let currentPlayingMovie = null;
let currentPlayingEpisode = null;
let syncInterval = null;
let inactivityTimer = null;
const video = document.getElementById('video-element');
const playerView = document.getElementById('player-view');
const mainView = document.getElementById('main-view');
const playerOverlay = document.getElementById('player-overlay');

function launchPlayerById(movieId) {
  const movie = allMovies.find(m => m.id === movieId);
  if (movie) launchPlayer(movie);
}

function launchPlayer(movie, resumeTime = 0, episode = null) {
  currentPlayingMovie = movie;
  currentPlayingEpisode = episode || (movie.episodes ? movie.episodes[0] : null);

  const streamSrc = currentPlayingEpisode ? currentPlayingEpisode.streamUrl : movie.streamUrl;
  video.src = streamSrc || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

  // Set titles
  const titleEl = document.getElementById('player-title');
  const subEl = document.getElementById('player-subtitle');
  if (currentPlayingEpisode) {
    titleEl.textContent = movie.title;
    subEl.textContent = `S${currentPlayingEpisode.season}:E${currentPlayingEpisode.episodeNumber} "${currentPlayingEpisode.title}"`;
  } else {
    titleEl.textContent = movie.title;
    subEl.textContent = `${movie.year} • ${movie.runtime} • 4K UHD`;
  }

  // Next episode button visibility
  const nextBtn = document.getElementById('next-episode-btn');
  if (movie.type === 'series' && movie.episodes && movie.episodes.length > 1) {
    nextBtn.classList.remove('hidden');
  } else {
    nextBtn.classList.add('hidden');
  }

  // Switch view
  mainView.classList.add('hidden');
  playerView.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');

  // Resume or start
  video.currentTime = resumeTime || 0;
  video.play().then(() => {
    updatePlayIcon(true);
    triggerToast(`Starting ${movie.title} in 4K HDR...`, 'play_circle');
  }).catch(err => {
    console.warn('Autoplay prevented or stream error:', err);
    updatePlayIcon(false);
  });

  // Start periodic progress reporting to backend
  startProgressSync();
  resetInactivityTimer();
}

function exitPlayer() {
  if (video) {
    video.pause();
    reportProgress();
  }
  stopProgressSync();

  playerView.classList.add('hidden');
  mainView.classList.remove('hidden');
  document.body.classList.remove('overflow-hidden');

  currentPlayingMovie = null;
  currentPlayingEpisode = null;

  // Refresh continue watching shelf
  loadContinueWatching();
}

// Play / Pause
function togglePlay() {
  if (video.paused || video.ended) {
    video.play();
    updatePlayIcon(true);
    showCenterIndicator('play_arrow');
  } else {
    video.pause();
    updatePlayIcon(false);
    showCenterIndicator('pause');
  }
}

function updatePlayIcon(isPlaying) {
  const icon = document.getElementById('player-play-icon');
  if (icon) {
    icon.textContent = isPlaying ? 'pause' : 'play_arrow';
  }
}

function showCenterIndicator(iconName) {
  const indicator = document.getElementById('center-play-indicator');
  const icon = document.getElementById('center-icon');
  icon.textContent = iconName;
  indicator.classList.remove('opacity-0');
  indicator.classList.add('opacity-100');
  setTimeout(() => {
    indicator.classList.remove('opacity-100');
    indicator.classList.add('opacity-0');
  }, 600);
}

// Skip Time
function skipTime(seconds) {
  video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  showCenterIndicator(seconds > 0 ? 'forward_10' : 'replay_10');
}

// Next Episode
function playNextEpisode() {
  if (!currentPlayingMovie || !currentPlayingMovie.episodes) return;
  const currentEpNum = currentPlayingEpisode ? currentPlayingEpisode.episodeNumber : 1;
  const nextEp = currentPlayingMovie.episodes.find(e => e.episodeNumber === currentEpNum + 1);
  if (nextEp) {
    launchPlayer(currentPlayingMovie, 0, nextEp);
    triggerToast(`Playing S${nextEp.season}:E${nextEp.episodeNumber} "${nextEp.title}"`, 'skip_next');
  } else {
    triggerToast('No more episodes in this season', 'info');
  }
}

// Time Format helper
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

// Video Time Update & Progress
video.addEventListener('timeupdate', () => {
  const cur = video.currentTime;
  const dur = video.duration || 1;
  const pct = (cur / dur) * 100;

  document.getElementById('time-current').textContent = formatTime(cur);
  document.getElementById('time-duration').textContent = formatTime(dur);

  const progBar = document.getElementById('progress-bar');
  const thumb = document.getElementById('progress-thumb');
  if (progBar) progBar.style.width = `${pct}%`;
  if (thumb) thumb.style.left = `${pct}%`;

  // Buffer bar
  if (video.buffered.length > 0) {
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    const bufPct = (bufferedEnd / dur) * 100;
    const bufBar = document.getElementById('buffer-bar');
    if (bufBar) bufBar.style.width = `${bufPct}%`;
  }
});

video.addEventListener('ended', () => {
  updatePlayIcon(false);
  reportProgress(100);
  if (currentPlayingMovie && currentPlayingMovie.type === 'series') {
    playNextEpisode();
  }
});

// Click on video toggles play/pause
video.addEventListener('click', () => {
  togglePlay();
});

// Scrubber seeking
const scrubberBar = document.getElementById('scrubber-bar');
const scrubberTooltip = document.getElementById('scrubber-tooltip');

scrubberBar.addEventListener('click', (e) => {
  const rect = scrubberBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, clickX / rect.width));
  video.currentTime = pct * (video.duration || 1);
});

scrubberBar.addEventListener('mousemove', (e) => {
  const rect = scrubberBar.getBoundingClientRect();
  const moveX = e.clientX - rect.left;
  const pct = Math.max(0, Math.min(1, moveX / rect.width));
  const hoverTime = pct * (video.duration || 1);

  scrubberTooltip.textContent = formatTime(hoverTime);
  scrubberTooltip.style.left = `${moveX}px`;
  scrubberTooltip.classList.remove('opacity-0');
});

scrubberBar.addEventListener('mouseleave', () => {
  scrubberTooltip.classList.add('opacity-0');
});

// Volume
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');

volumeSlider.addEventListener('input', (e) => {
  video.volume = e.target.value;
  video.muted = video.volume === 0;
  updateVolumeIcon();
});

function toggleMute() {
  video.muted = !video.muted;
  if (!video.muted && video.volume === 0) {
    video.volume = 0.5;
    volumeSlider.value = 0.5;
  }
  updateVolumeIcon();
}

function updateVolumeIcon() {
  if (video.muted || video.volume === 0) {
    volumeIcon.textContent = 'volume_off';
  } else if (video.volume < 0.5) {
    volumeIcon.textContent = 'volume_down';
  } else {
    volumeIcon.textContent = 'volume_up';
  }
}

// Speed Menu
function toggleSpeedMenu() {
  const menu = document.getElementById('speed-menu');
  menu.classList.toggle('hidden');
}

function setSpeed(speed) {
  video.playbackRate = speed;
  document.getElementById('speed-label').textContent = `${speed}x`;
  document.getElementById('speed-menu').classList.add('hidden');
  triggerToast(`Playback Speed: ${speed}x`, 'speed');
}

// Subtitles Menu
function toggleSubtitlesMenu() {
  const menu = document.getElementById('subtitles-menu');
  menu.classList.toggle('hidden');
}

function setSubtitle(lang) {
  document.getElementById('subtitles-menu').classList.add('hidden');
  triggerToast(lang === 'off' ? 'Subtitles Disabled' : `Subtitles: ${lang.toUpperCase()}`, 'subtitles');
}

// Picture in Picture
async function togglePip() {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await video.requestPictureInPicture();
    }
  } catch (err) {
    console.warn('PiP error:', err);
  }
}

// Fullscreen
function toggleFullscreen() {
  const icon = document.getElementById('fullscreen-icon');
  if (!document.fullscreenElement) {
    playerView.requestFullscreen().then(() => {
      icon.textContent = 'fullscreen_exit';
    }).catch(err => console.warn(err));
  } else {
    document.exitFullscreen().then(() => {
      icon.textContent = 'fullscreen';
    }).catch(err => console.warn(err));
  }
}

// Overlay Inactivity Hiding
function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  playerOverlay.style.opacity = '1';
  playerView.style.cursor = 'default';

  if (!video.paused) {
    inactivityTimer = setTimeout(() => {
      playerOverlay.style.opacity = '0';
      playerView.style.cursor = 'none';
      // Close open menus
      document.getElementById('speed-menu').classList.add('hidden');
      document.getElementById('subtitles-menu').classList.add('hidden');
    }, 3500);
  }
}

playerView.addEventListener('mousemove', resetInactivityTimer);
playerView.addEventListener('mousedown', resetInactivityTimer);

// Progress Reporting Sync with Backend
function startProgressSync() {
  stopProgressSync();
  syncInterval = setInterval(() => {
    if (currentPlayingMovie && !video.paused) {
      reportProgress();
    }
  }, 5000);
}

function stopProgressSync() {
  if (syncInterval) clearInterval(syncInterval);
}

async function reportProgress(overridePercentage = null) {
  if (!currentPlayingMovie || !video) return;
  const cur = video.currentTime;
  const dur = video.duration || 1;
  const pct = overridePercentage !== null ? overridePercentage : Math.round((cur / dur) * 100);

  try {
    await fetch('/api/continue-watching', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titleId: currentPlayingMovie.id,
        episodeId: currentPlayingEpisode ? currentPlayingEpisode.id : null,
        episodeTitle: currentPlayingEpisode ? currentPlayingEpisode.title : null,
        currentTime: cur,
        duration: dur,
        progressPercentage: pct
      })
    });
  } catch (err) {
    console.error('Failed to report watch progress:', err);
  }
}

// Player Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (playerView.classList.contains('hidden')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.code === 'KeyF') {
    e.preventDefault();
    toggleFullscreen();
  } else if (e.code === 'KeyM') {
    e.preventDefault();
    toggleMute();
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    skipTime(-10);
  } else if (e.code === 'ArrowRight') {
    e.preventDefault();
    skipTime(10);
  } else if (e.code === 'ArrowUp') {
    e.preventDefault();
    video.volume = Math.min(1, video.volume + 0.1);
    volumeSlider.value = video.volume;
    updateVolumeIcon();
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    video.volume = Math.max(0, video.volume - 0.1);
    volumeSlider.value = video.volume;
    updateVolumeIcon();
  }
});
