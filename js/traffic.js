/* ============================================================
   Highway Rush – Traffic System
   ============================================================ */

const Traffic = (() => {

  const NPC_COLORS = [
    0xee4444, 0x4488ee, 0x44ee88, 0xeeee44, 0xee44ee,
    0xee8844, 0x44eeee, 0x8844ee, 0xcccccc, 0x886644,
    0xff6699, 0x6699ff, 0x99ff66,
  ];

  const VEHICLE_TYPES = ['car', 'car', 'car', 'car', 'truck', 'motorcycle'];

  // Spawn configuration
  const SPAWN_Z = -80;   // spawn distance ahead
  const DESPAWN_Z = 20;  // despawn behind player

  let vehicles = [];
  let scene = null;
  let spawnTimer = 0;
  let spawnInterval = 1.8; // seconds between spawns
  let laneCount = 4;

  function init(sceneRef) {
    scene = sceneRef;
    vehicles = [];
    spawnTimer = 0;
  }

  function reset() {
    vehicles.forEach(v => scene.remove(v.mesh));
    vehicles = [];
    spawnTimer = 0;
    spawnInterval = 1.8;
  }

  function spawnVehicle(speed) {
    const lane = Math.floor(Math.random() * laneCount);
    const type = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
    const color = NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];

    let mesh;
    if (type === 'truck') {
      mesh = Cars.buildTruck(color);
    } else if (type === 'motorcycle') {
      mesh = Cars.buildMotorcycle(color);
    } else {
      mesh = Cars.buildTrafficCar(color);
    }

    const laneX = Tracks.getLaneX(lane);
    mesh.position.set(laneX, 0, SPAWN_Z);
    // NPC cars face toward the player (positive Z direction = toward camera)
    mesh.rotation.y = 0; // already facing the right way from the model

    scene.add(mesh);

    const vehicleSpeed = speed * (0.3 + Math.random() * 0.4); // NPC drives slower than road scroll

    vehicles.push({
      mesh,
      lane,
      type,
      speed: vehicleSpeed,
      width: type === 'truck' ? 2.2 : type === 'motorcycle' ? 0.5 : 1.6,
      length: type === 'truck' ? 7.5 : type === 'motorcycle' ? 2.2 : 3.6,
      passed: false,
    });
  }

  function update(dt, roadSpeed, difficulty) {
    spawnTimer -= dt;
    spawnInterval = Math.max(0.55, 1.8 - difficulty * 0.12);

    if (spawnTimer <= 0) {
      spawnVehicle(roadSpeed);
      spawnTimer = spawnInterval;
    }

    const toRemove = [];
    vehicles.forEach((v, idx) => {
      // Move toward player (relative to road scroll)
      v.mesh.position.z += (roadSpeed - v.speed) * dt;

      // Spin wheels (simple animation via rotation)
      // (wheel spinning would need refs; skip for perf)

      // Doppler sound when passing player
      if (!v.passed && v.mesh.position.z > -2) {
        v.passed = true;
        Audio.sfxPassingCar();
      }

      // Despawn
      if (v.mesh.position.z > DESPAWN_Z) {
        toRemove.push(idx);
      }
    });

    // Remove despawned from back to front
    for (let i = toRemove.length - 1; i >= 0; i--) {
      scene.remove(vehicles[toRemove[i]].mesh);
      vehicles.splice(toRemove[i], 1);
    }
  }

  // Returns list of vehicles with collision box info
  function getVehicles() {
    return vehicles.map(v => ({
      x: v.mesh.position.x,
      z: v.mesh.position.z,
      width: v.width,
      length: v.length,
    }));
  }

  function checkCollision(playerX, playerZ, playerWidth, playerLength) {
    for (const v of vehicles) {
      const dx = Math.abs(v.mesh.position.x - playerX);
      const dz = Math.abs(v.mesh.position.z - playerZ);
      if (dx < (v.width / 2 + playerWidth / 2) * 0.85 &&
          dz < (v.length / 2 + playerLength / 2) * 0.85) {
        return true;
      }
    }
    return false;
  }

  return { init, reset, update, getVehicles, checkCollision };
})();
