/* ============================================================
   Regression test: fog must never create a visible "wall" in the
   distance.

   Bug: each track defined its own fogColor, distinct from its
   skyColor, and fog was built with THREE.FogExp2 at a hardcoded
   density. Once geometry (buildings/road) fogs out to fully opaque
   fog color, it sits right in front of the scene background
   (skyColor) — if those two colors differ, the boundary between
   "fully fogged geometry" and "background" is clearly visible as a
   flat, hard-edged wall cutting across the horizon.

   Fix: every track's fogColor must equal its skyColor (so the fully
   fogged tail blends seamlessly into the background), and fog must
   use linear THREE.Fog(near, far) — driven by the track's own
   fogNear/fogFar — instead of a one-size-fits-all exponential
   falloff, so the fade-in is gradual rather than an abrupt cutoff.
   ============================================================ */

'use strict';

const assert = require('assert');
const THREE = require('./three-stub');
const { loadBrowserModule } = require('./load-browser-module');

const Tracks = loadBrowserModule('js/tracks.js', 'Tracks', { THREE });

function run() {
  assert.ok(Tracks.defs.length > 0, 'expected at least one track definition');

  Tracks.defs.forEach(trackDef => {
    assert.strictEqual(
      trackDef.fogColor,
      trackDef.skyColor,
      `Track "${trackDef.id}" has a fogColor (0x${trackDef.fogColor.toString(16)}) that differs from ` +
      `its skyColor (0x${trackDef.skyColor.toString(16)}). This is exactly the "weird fog wall" bug: ` +
      `fully-fogged distant geometry would visibly not match the sky behind it.`
    );

    assert.ok(
      typeof trackDef.fogNear === 'number' && typeof trackDef.fogFar === 'number' && trackDef.fogFar > trackDef.fogNear,
      `Track "${trackDef.id}" must define a valid fogNear < fogFar range for linear fog.`
    );

    const scene = new THREE.Scene();
    Tracks.buildEnvironment(trackDef, scene);

    assert.ok(scene.fog, `Track "${trackDef.id}" did not set scene.fog`);
    assert.strictEqual(scene.fog.color, trackDef.fogColor, `Track "${trackDef.id}" scene.fog.color must match trackDef.fogColor`);
    assert.strictEqual(scene.fog.near, trackDef.fogNear, `Track "${trackDef.id}" scene.fog.near must match trackDef.fogNear`);
    assert.strictEqual(scene.fog.far, trackDef.fogFar, `Track "${trackDef.id}" scene.fog.far must match trackDef.fogFar`);
    assert.ok(!(scene.fog instanceof THREE.FogExp2), `Track "${trackDef.id}" must use linear THREE.Fog, not FogExp2 (exponential fog causes the abrupt "wall" cutoff)`);
  });

  console.log(`OK: fog-matches-sky — checked ${Tracks.defs.length} track definitions, no fog/sky mismatch.`);
}

run();
