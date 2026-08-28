/* ============================================================
   Highway Rush – Main Entry Point (UI wiring)
   ============================================================ */

(function () {
  'use strict';

  // ---- State ----
  let selectedCarIndex = 0;
  let selectedTrackId = Tracks.defs[0].id;

  // ---- DOM helpers ----
  const $ = id => document.getElementById(id);

  // ---- Boot ----
  function boot() {
    updateHighScoreDisplay();
    UI.showScreen('screen-start');
    buildTrackGrid();
    buildCarDots();
  }

  // ---- High Score ----
  function updateHighScoreDisplay() {
    const hs = Game.getHighScore();
    const el = $('start-high-score');
    if (el) el.textContent = hs;
  }

  // ---- Screen: Start ----
  $('btn-play').addEventListener('click', () => {
    Audio.resume();
    UI.showScreen('screen-car-select');
    const container = $('car-preview-canvas-container');
    UI.initCarPreview(container);
    UI.updateCarPreview(Cars.defs[selectedCarIndex]);
    updateCarInfo();
  });

  // ---- Screen: Car Selection ----
  function updateCarInfo() {
    const def = Cars.defs[selectedCarIndex];
    $('car-name').textContent = def.name;
    $('car-desc').textContent = def.desc;
    updateCarDots();
    UI.updateCarPreview(def);
  }

  function buildCarDots() {
    const container = $('car-dots');
    if (!container) return;
    container.innerHTML = '';
    Cars.defs.forEach((_, i) => {
      const dot = document.createElement('div');
      dot.className = 'car-dot' + (i === selectedCarIndex ? ' active' : '');
      dot.addEventListener('click', () => {
        selectedCarIndex = i;
        updateCarInfo();
      });
      container.appendChild(dot);
    });
  }

  function updateCarDots() {
    document.querySelectorAll('.car-dot').forEach((d, i) => {
      d.classList.toggle('active', i === selectedCarIndex);
    });
  }

  $('car-prev').addEventListener('click', () => {
    selectedCarIndex = (selectedCarIndex - 1 + Cars.defs.length) % Cars.defs.length;
    updateCarInfo();
  });

  $('car-next').addEventListener('click', () => {
    selectedCarIndex = (selectedCarIndex + 1) % Cars.defs.length;
    updateCarInfo();
  });

  $('btn-select-car').addEventListener('click', () => {
    UI.stopCarPreview();
    UI.showScreen('screen-track-select');
    updateTrackSelection();
  });

  $('btn-back-start').addEventListener('click', () => {
    UI.stopCarPreview();
    UI.showScreen('screen-start');
    updateHighScoreDisplay();
  });

  // ---- Screen: Track Selection ----
  function buildTrackGrid() {
    const grid = $('track-grid');
    if (!grid) return;
    grid.innerHTML = '';
    Tracks.defs.forEach(track => {
      const card = document.createElement('div');
      card.className = 'track-card' + (track.id === selectedTrackId ? ' selected' : '');
      card.dataset.trackId = track.id;
      card.innerHTML = `
        <div class="track-icon">${track.icon}</div>
        <div class="track-name">${track.name}</div>
      `;
      card.addEventListener('click', () => {
        selectedTrackId = track.id;
        updateTrackSelection();
      });
      grid.appendChild(card);
    });
  }

  function updateTrackSelection() {
    document.querySelectorAll('.track-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.trackId === selectedTrackId);
    });
  }

  $('btn-start-game').addEventListener('click', () => {
    UI.showScreen('screen-game');
    const carDef = Cars.defs[selectedCarIndex];
    const trackDef = Tracks.defs.find(t => t.id === selectedTrackId);

    // Update initial HUD record
    const rv = $('record-value');
    if (rv) rv.textContent = Game.getHighScore();

    Game.startGame(carDef, trackDef, {
      onScoreUpdate: (score, speedKmh) => {
        UI.updateHUD(score, speedKmh, Game.getHighScore());
      },
      onGameOver: (score, highScore, isNewRecord) => {
        UI.showGameOver(score, highScore, isNewRecord);
        updateHighScoreDisplay();
      },
      onNewRecord: (highScore) => {
        UI.showNewRecordToast();
      },
    });
  });

  $('btn-back-car').addEventListener('click', () => {
    UI.showScreen('screen-car-select');
    const container = $('car-preview-canvas-container');
    UI.initCarPreview(container);
    UI.updateCarPreview(Cars.defs[selectedCarIndex]);
    updateCarInfo();
  });

  // ---- In-Game: Pause ----
  $('btn-pause').addEventListener('click', () => {
    if (Game.getState() === 'running') {
      Game.pauseGame();
      $('pause-overlay').classList.remove('hidden');
    }
  });

  $('btn-resume').addEventListener('click', () => {
    $('pause-overlay').classList.add('hidden');
    Game.resumeGame();
  });

  $('btn-quit-pause').addEventListener('click', () => {
    $('pause-overlay').classList.add('hidden');
    Game.stopGame();
    UI.showScreen('screen-start');
    updateHighScoreDisplay();
  });

  // ---- Game Over ----
  $('btn-retry').addEventListener('click', () => {
    const carDef = Cars.defs[selectedCarIndex];
    const trackDef = Tracks.defs.find(t => t.id === selectedTrackId);
    UI.showScreen('screen-game');
    const rv = $('record-value');
    if (rv) rv.textContent = Game.getHighScore();

    Game.startGame(carDef, trackDef, {
      onScoreUpdate: (score, speedKmh) => {
        UI.updateHUD(score, speedKmh, Game.getHighScore());
      },
      onGameOver: (score, highScore, isNewRecord) => {
        UI.showGameOver(score, highScore, isNewRecord);
        updateHighScoreDisplay();
      },
      onNewRecord: () => UI.showNewRecordToast(),
    });
  });

  $('btn-home').addEventListener('click', () => {
    Game.stopGame();
    UI.showScreen('screen-start');
    updateHighScoreDisplay();
  });

  // ---- Keyboard pause shortcut ----
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (Game.getState() === 'running') {
        Game.pauseGame();
        $('pause-overlay').classList.remove('hidden');
      } else if (Game.getState() === 'paused') {
        $('pause-overlay').classList.add('hidden');
        Game.resumeGame();
      }
    }
  });

  // ---- Boot ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
