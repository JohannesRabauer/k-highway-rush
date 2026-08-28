/* ============================================================
   Regression test: lane markings must never be recycled while
   still visible on screen ("middle lines vanish when I come
   close to them" bug).

   The camera is fixed (see js/game.js initCamera): height 7,
   position z=14, 60deg vertical FOV, tilted to look at z=-10.
   That means the closest point of the ground plane that can ever
   appear at the bottom edge of the screen sits at world z ~= 7.3
   (see full derivation in js/tracks.js next to
   ROAD_RECYCLE_VISIBLE_LIMIT_Z). Recycling a dash tile before its
   frontmost dash has scrolled past that point makes it visibly
   teleport away while still on screen.

   This test drives js/tracks.js's real scrollEnvironment() through
   many frames at varying speeds and asserts that every recycle
   event only ever happens once the tile's nearest dash has crossed
   that visibility limit — i.e. it can never be caught disappearing
   in view again.
   ============================================================ */

'use strict';

const assert = require('assert');
const THREE = require('./three-stub');
const { loadBrowserModule } = require('./load-browser-module');

const Tracks = loadBrowserModule('js/tracks.js', 'Tracks', { THREE });

// Same camera rig as js/game.js initCamera(). Kept in sync manually — if
// this ever changes there, re-derive VISIBLE_LIMIT_Z below (see comment).
const CAMERA = { y: 7, z: 14, lookAtZ: -10, verticalFovDeg: 60 };

function computeClosestVisibleGroundZ(camera) {
  const drop = camera.y; // camera looks at a point on the ground (y=0)
  const forwardDistance = camera.z - camera.lookAtZ; // > 0, camera looks toward -z
  const tiltDownRad = Math.atan2(drop, forwardDistance); // center-ray downward pitch
  const halfFovRad = (camera.verticalFovDeg / 2) * (Math.PI / 180);
  const bottomRayPitch = tiltDownRad + halfFovRad;
  const t = camera.y / Math.sin(bottomRayPitch);
  return camera.z - Math.cos(bottomRayPitch) * t;
}

function run() {
  const closestVisibleZ = computeClosestVisibleGroundZ(CAMERA);
  assert.ok(
    Math.abs(closestVisibleZ - 7.3) < 0.2,
    `sanity check on the derived closest-visible-z failed: got ${closestVisibleZ}`
  );

  const trackDef = Tracks.defs[0];
  const scene = new THREE.Scene();
  const envData = Tracks.buildEnvironment(trackDef, scene);

  assert.ok(envData.roadSegments.length > 0, 'expected road segments to be built');

  // The frontmost dash of a tile sits 2 world units ahead of the tile's own
  // origin (see DASH_TILE_FRONT_OFFSET in js/tracks.js).
  const DASH_TILE_FRONT_OFFSET = -2;

  let framesChecked = 0;
  let recycleEventsSeen = 0;

  // Simulate ~2 minutes of gameplay at a range of speeds (slow start through
  // the fastest the difficulty ramp can reach), at a fixed 60fps step.
  const dt = 1 / 60;
  const speeds = [18, 25, 35, 45, 60];

  for (const speed of speeds) {
    for (let frame = 0; frame < 60 * 20; frame++) {
      const beforeZs = envData.roadSegments.map(s => s.position.z);

      Tracks.scrollEnvironment(envData, speed * dt);
      framesChecked++;

      envData.roadSegments.forEach((seg, i) => {
        const before = beforeZs[i];
        const after = seg.position.z;
        // A recycle happened if the position jumped backwards by more than
        // one frame's worth of scroll (instead of the normal forward creep).
        if (after < before - speed * dt - 1e-6) {
          recycleEventsSeen++;
          const frontOfTileBeforeRecycle = before + DASH_TILE_FRONT_OFFSET;
          assert.ok(
            frontOfTileBeforeRecycle > closestVisibleZ,
            `A lane-dash tile was recycled while its frontmost dash (world z=${frontOfTileBeforeRecycle.toFixed(2)}) ` +
            `was still within the visible area (closest visible ground z=${closestVisibleZ.toFixed(2)}). ` +
            `This is exactly the "lines vanish when I come close" bug.`
          );
        }
      });
    }
  }

  assert.ok(framesChecked > 0, 'expected to simulate at least one frame');
  assert.ok(recycleEventsSeen > 0, 'expected at least one recycle event across the simulated run (test would not catch regressions otherwise)');

  console.log(`OK: lane-line-recycle — ${framesChecked} frames simulated, ${recycleEventsSeen} recycle events, all off-screen when they happened.`);
}

run();
