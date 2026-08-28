/* ============================================================
   Regression test: NPC traffic vehicles must never overlap /
   drive through each other within the same lane
   ("other cars drive through each other" bug).

   Drives js/traffic.js's real spawnVehicle()/update() through many
   frames across a range of speeds and difficulties, then asserts
   that for every pair of vehicles sharing a lane, the gap between
   them (accounting for their half-lengths) is never negative.
   ============================================================ */

'use strict';

const assert = require('assert');
const { loadBrowserModule } = require('./load-browser-module');

function buildFakeCarMesh() {
  return {
    position: {
      x: 0, y: 0, z: 0,
      set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; },
    },
    rotation: { x: 0, y: 0, z: 0 },
  };
}

const Cars = {
  buildTruck: () => buildFakeCarMesh(),
  buildMotorcycle: () => buildFakeCarMesh(),
  buildTrafficCar: () => buildFakeCarMesh(),
};

const LANE_COUNT = 4;
const LANE_WIDTH = 3.5; // matches real Tracks (ROAD_WIDTH 14 / 4 lanes)
const Tracks = {
  getLaneX: lane => (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH,
  LANE_COUNT,
};

const Audio = { sfxPassingCar: () => {} };

const scene = {
  objects: new Set(),
  add(o) { this.objects.add(o); },
  remove(o) { this.objects.delete(o); },
};

const Traffic = loadBrowserModule('js/traffic.js', 'Traffic', { Cars, Tracks, Audio });

function assertNoOverlaps(vehicles, context) {
  const byLane = new Map();
  vehicles.forEach(v => {
    // Group by lane using x position (rounded to dodge float noise).
    const key = Math.round(v.x * 1000);
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key).push(v);
  });

  byLane.forEach(laneVehicles => {
    laneVehicles.sort((a, b) => a.z - b.z);
    for (let i = 1; i < laneVehicles.length; i++) {
      const behind = laneVehicles[i - 1];
      const ahead = laneVehicles[i];
      const gap = (ahead.z - ahead.length / 2) - (behind.z + behind.length / 2);
      assert.ok(
        gap >= -1e-6,
        `Two NPC vehicles in the same lane overlapped by ${(-gap).toFixed(3)} units ${context} ` +
        `(behind z=${behind.z.toFixed(2)} len=${behind.length}, ahead z=${ahead.z.toFixed(2)} len=${ahead.length}). ` +
        `This is exactly the "cars drive through each other" bug.`
      );
    }
  });
}

function run() {
  Traffic.init(scene);

  const dt = 1 / 60;
  let framesChecked = 0;
  let maxVehiclesSeen = 0;

  // Simulate several minutes of gameplay across a wide range of speeds and
  // difficulty levels (more traffic + tighter spawn cadence at higher
  // difficulty), which is exactly when overlaps used to happen.
  const scenarios = [
    { roadSpeed: 20, difficulty: 0 },
    { roadSpeed: 30, difficulty: 1 },
    { roadSpeed: 45, difficulty: 3 },
    { roadSpeed: 60, difficulty: 6 },
  ];

  for (const { roadSpeed, difficulty } of scenarios) {
    for (let frame = 0; frame < 60 * 90; frame++) {
      Traffic.update(dt, roadSpeed, difficulty);
      framesChecked++;

      const vehicles = Traffic.getVehicles();
      maxVehiclesSeen = Math.max(maxVehiclesSeen, vehicles.length);
      assertNoOverlaps(vehicles, `at frame ${frame} (roadSpeed=${roadSpeed}, difficulty=${difficulty})`);
    }
  }

  assert.ok(framesChecked > 0, 'expected to simulate at least one frame');
  assert.ok(maxVehiclesSeen >= 2, 'expected multiple simultaneous vehicles at some point (test would not catch regressions otherwise)');

  console.log(`OK: traffic-no-overlap — ${framesChecked} frames simulated, up to ${maxVehiclesSeen} concurrent vehicles, no overlaps in any shared lane.`);
}

run();
