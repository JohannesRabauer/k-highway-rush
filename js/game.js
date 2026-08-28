/* ============================================================
   Highway Rush – Core Game Engine
   ============================================================ */

const Game = (() => {

  // ---- State ----
  let state = 'idle'; // idle | running | paused | dead
  let score = 0;
  let highScore = parseInt(localStorage.getItem('hrHighScore') || '0');
  let speed = 18;          // road scroll speed (units/s)
  let difficulty = 0;
  let elapsed = 0;
  let selectedCarDef = null;
  let selectedTrackDef = null;

  // ---- Three.js ----
  let renderer, scene, camera;
  let playerMesh = null;
  let envData = null;
  let animFrameId = null;
  let lastTime = 0;

  // ---- Player state ----
  const PLAYER_START_X = 0;
  const PLAYER_Z = 2;       // player stays at fixed Z (camera-relative)
  let playerX = PLAYER_START_X;
  let targetX = PLAYER_START_X;
  let playerLane = Math.floor(Tracks.LANE_COUNT / 2);

  const PLAYER_WIDTH = 1.6;
  const PLAYER_LENGTH = 3.6;
  const MOVE_SPEED = 14;    // lateral move speed
  const LANE_X = [];
  for (let i = 0; i < Tracks.LANE_COUNT; i++) LANE_X.push(Tracks.getLaneX(i));

  // ---- Input ----
  const keys = {};
  let touchStartX = 0;
  let touchLocked = false;

  // ---- Callbacks ----
  let onScoreUpdate = null;
  let onGameOver = null;
  let onNewRecord = null;

  // ---- Particles ----
  let crashParticles = [];

  // ---- Init renderer ----
  function initRenderer(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  function initCamera() {
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500);
    // Position camera behind and above player
    camera.position.set(0, 7, 14);
    camera.lookAt(0, 0, -10);
  }

  function onResize() {
    if (!renderer || !camera) return;
    const canvas = renderer.domElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---- Start / Stop ----
  function startGame(carDef, trackDef, callbacks) {
    selectedCarDef = carDef;
    selectedTrackDef = trackDef;
    onScoreUpdate = callbacks.onScoreUpdate;
    onGameOver = callbacks.onGameOver;
    onNewRecord = callbacks.onNewRecord;

    // Reset state
    score = 0;
    difficulty = 0;
    elapsed = 0;
    speed = 18;
    playerX = PLAYER_START_X;
    targetX = PLAYER_START_X;
    playerLane = Math.floor(Tracks.LANE_COUNT / 2);
    state = 'running';
    crashParticles = [];

    const canvas = document.getElementById('game-canvas');

    if (!renderer) {
      initRenderer(canvas);
    } else {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    }

    // Build scene
    scene = new THREE.Scene();
    initCamera();

    envData = Tracks.buildEnvironment(trackDef, scene);

    // Player car
    playerMesh = Cars.buildCarMesh(carDef, 1);
    playerMesh.position.set(playerX, 0, PLAYER_Z);
    playerMesh.rotation.y = Math.PI; // face forward
    scene.add(playerMesh);

    // Traffic
    Traffic.init(scene);

    // Input
    setupInput(canvas);

    // Audio
    Audio.init();
    Audio.startMusic();
    Audio.sfxAccelerate();

    // Render loop
    lastTime = performance.now();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    loop(performance.now());
  }

  function pauseGame() {
    if (state !== 'running') return;
    state = 'paused';
  }

  function resumeGame() {
    if (state !== 'paused') return;
    state = 'running';
    lastTime = performance.now();
    loop(performance.now());
  }

  function stopGame() {
    state = 'idle';
    if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
    Audio.stopMusic();
    Traffic.reset();
    teardownInput();
    if (scene) {
      // Dispose scene objects
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }

  // ---- Main Loop ----
  function loop(now) {
    if (state !== 'running') return;
    animFrameId = requestAnimationFrame(loop);

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    update(dt);
    render();
  }

  function update(dt) {
    elapsed += dt;
    difficulty = elapsed / 30; // ramps up every 30s
    speed = 18 + difficulty * 4;

    // Score: ~1 point per 0.1s, scaled by speed
    score += dt * speed * 0.5;
    if (onScoreUpdate) onScoreUpdate(Math.floor(score), Math.floor(speed * 3.6));

    // Input: move toward target lane
    handleKeyInput();
    const dx = targetX - playerX;
    const step = Math.sign(dx) * Math.min(Math.abs(dx), MOVE_SPEED * dt);
    playerX += step;

    if (playerMesh) {
      playerMesh.position.x = playerX;
      // Tilt slightly on turns
      playerMesh.rotation.z = -dx * 0.04;
      // Bob slightly
      playerMesh.position.y = Math.sin(elapsed * 12) * 0.04;
    }

    // Scroll environment
    Tracks.scrollEnvironment(envData, speed * dt);

    // Traffic
    Traffic.update(dt, speed, difficulty);

    // Particle update
    updateParticles(dt);

    // Camera: slight sway toward player movement
    if (camera) {
      camera.position.x += (playerX * 0.3 - camera.position.x) * 0.07;
    }

    // Collision
    if (Traffic.checkCollision(playerX, PLAYER_Z, PLAYER_WIDTH, PLAYER_LENGTH)) {
      triggerCrash();
    }
  }

  function render() {
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  // ---- Crash ----
  function triggerCrash() {
    state = 'dead';
    Audio.stopMusic();
    Audio.sfxCrash();
    spawnCrashParticles();

    const isNewRecord = score > highScore;
    if (isNewRecord) {
      highScore = Math.floor(score);
      localStorage.setItem('hrHighScore', highScore);
      setTimeout(() => { if (onNewRecord) onNewRecord(highScore); }, 600);
      setTimeout(() => Audio.sfxNewRecord(), 700);
    }

    setTimeout(() => {
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      if (onGameOver) onGameOver(Math.floor(score), highScore, isNewRecord);
    }, 900);
  }

  // ---- Crash Particles ----
  function spawnCrashParticles() {
    if (!scene || !playerMesh) return;
    const pMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    for (let i = 0; i < 30; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.2, 5, 4), pMat.clone());
      p.position.copy(playerMesh.position);
      p.position.y += 0.5;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        2 + Math.random() * 8,
        (Math.random() - 0.5) * 8
      );
      scene.add(p);
      crashParticles.push({ mesh: p, vel, life: 1.0 });
    }
  }

  function updateParticles(dt) {
    for (let i = crashParticles.length - 1; i >= 0; i--) {
      const p = crashParticles[i];
      p.vel.y -= 16 * dt; // gravity
      p.mesh.position.addScaledVector(p.vel, dt);
      p.life -= dt * 1.5;
      if (p.mesh.material) p.mesh.material.opacity = p.life;
      p.mesh.material.transparent = true;
      if (p.life <= 0) {
        scene.remove(p.mesh);
        crashParticles.splice(i, 1);
      }
    }
  }

  // ---- Input ----
  function handleKeyInput() {
    const LEFT = keys['ArrowLeft'] || keys['a'] || keys['A'];
    const RIGHT = keys['ArrowRight'] || keys['d'] || keys['D'];

    if (LEFT) {
      playerLane = Math.max(0, playerLane - 1);
      targetX = LANE_X[playerLane];
    } else if (RIGHT) {
      playerLane = Math.min(Tracks.LANE_COUNT - 1, playerLane + 1);
      targetX = LANE_X[playerLane];
    }
  }

  let keydownHandler, keyupHandler, touchstartHandler, touchendHandler, resizeHandler;

  function setupInput(canvas) {
    keydownHandler = e => {
      if (keys[e.key]) return;
      keys[e.key] = true;
      if ((e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') ||
          (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D')) {
        Audio.sfxDodge();
      }
    };
    keyupHandler = e => { keys[e.key] = false; };

    touchstartHandler = e => {
      touchStartX = e.touches[0].clientX;
      touchLocked = false;
    };
    touchendHandler = e => {
      if (touchLocked) return;
      const endX = e.changedTouches[0].clientX;
      const dx = endX - touchStartX;
      const screenW = window.innerWidth;
      if (Math.abs(dx) < 20) {
        // Tap: left half = left lane, right half = right lane
        if (touchStartX < screenW / 2) {
          playerLane = Math.max(0, playerLane - 1);
        } else {
          playerLane = Math.min(Tracks.LANE_COUNT - 1, playerLane + 1);
        }
      } else if (dx < -30) {
        playerLane = Math.max(0, playerLane - 1);
      } else if (dx > 30) {
        playerLane = Math.min(Tracks.LANE_COUNT - 1, playerLane + 1);
      }
      targetX = LANE_X[playerLane];
      Audio.sfxDodge();
      touchLocked = true;
    };

    resizeHandler = () => onResize();

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);
    canvas.addEventListener('touchstart', touchstartHandler, { passive: true });
    canvas.addEventListener('touchend', touchendHandler, { passive: true });
    window.addEventListener('resize', resizeHandler);
  }

  function teardownInput() {
    document.removeEventListener('keydown', keydownHandler);
    document.removeEventListener('keyup', keyupHandler);
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.removeEventListener('touchstart', touchstartHandler);
      canvas.removeEventListener('touchend', touchendHandler);
    }
    window.removeEventListener('resize', resizeHandler);
    Object.keys(keys).forEach(k => { keys[k] = false; });
  }

  function getHighScore() { return highScore; }
  function getState() { return state; }

  return {
    startGame,
    pauseGame,
    resumeGame,
    stopGame,
    getHighScore,
    getState,
  };
})();
