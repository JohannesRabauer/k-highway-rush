/* ============================================================
   Highway Rush – UI Controller
   ============================================================ */

const UI = (() => {

  // ---- Screen Management ----
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = '';
    });
    const target = document.getElementById(id);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('active');
    }
  }

  // ---- New Record Toast ----
  let toastEl = null;
  function showNewRecordToast() {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.id = 'new-record-toast';
      toastEl.textContent = '🏆 NEUER REKORD!';
      document.body.appendChild(toastEl);
    }
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  // ---- Car Preview (mini Three.js scene) ----
  let previewRenderer, previewScene, previewCamera, previewMesh, previewAnimId;

  function initCarPreview(containerEl) {
    if (previewRenderer) {
      cancelAnimationFrame(previewAnimId);
    }
    previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x0d0823);

    previewCamera = new THREE.PerspectiveCamera(45, containerEl.clientWidth / containerEl.clientHeight, 0.1, 100);
    previewCamera.position.set(4, 3, 6);
    previewCamera.lookAt(0, 1, 0);

    const ambient = new THREE.AmbientLight(0x8844ff, 0.8);
    previewScene.add(ambient);
    const dir = new THREE.DirectionalLight(0x00e5ff, 1.5);
    dir.position.set(5, 8, 5);
    previewScene.add(dir);
    const rim = new THREE.DirectionalLight(0xff3c3c, 0.7);
    rim.position.set(-5, 2, -3);
    previewScene.add(rim);

    if (!previewRenderer) {
      const canvas = document.createElement('canvas');
      containerEl.appendChild(canvas);
      previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    }
    previewRenderer.setSize(containerEl.clientWidth, containerEl.clientHeight);
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    function previewLoop() {
      previewAnimId = requestAnimationFrame(previewLoop);
      if (previewMesh) previewMesh.rotation.y += 0.015;
      previewRenderer.render(previewScene, previewCamera);
    }
    previewLoop();
  }

  function updateCarPreview(carDef) {
    if (previewMesh && previewScene) previewScene.remove(previewMesh);
    previewMesh = Cars.buildCarMesh(carDef, 1);
    previewMesh.rotation.y = Math.PI / 6;
    if (previewScene) previewScene.add(previewMesh);
  }

  function stopCarPreview() {
    if (previewAnimId) cancelAnimationFrame(previewAnimId);
    previewAnimId = null;
  }

  // ---- HUD ----
  function updateHUD(score, speed, highScore) {
    const sv = document.getElementById('score-value');
    const rv = document.getElementById('record-value');
    const spv = document.getElementById('speed-value');
    if (sv) sv.textContent = score;
    if (rv) rv.textContent = highScore;
    if (spv) spv.textContent = speed;
  }

  function showGameOver(score, highScore, isNewRecord) {
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-record').textContent = highScore;
    const recordRow = document.getElementById('record-row');
    if (recordRow) {
      recordRow.classList.toggle('visible', isNewRecord);
    }
    showScreen('screen-gameover');
  }

  return {
    showScreen,
    showNewRecordToast,
    initCarPreview,
    updateCarPreview,
    stopCarPreview,
    updateHUD,
    showGameOver,
  };
})();
