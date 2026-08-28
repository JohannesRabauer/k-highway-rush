/* ============================================================
   Highway Rush – Track / Environment Definitions
   ============================================================ */

const Tracks = (() => {

  const TRACK_DEFS = [
    {
      id: 'city',
      name: 'Stadt',
      icon: '🏙️',
      desc: 'Wolkenkratzer im hellen Tageslicht',
      skyColor: 0x6ec6ff,
      fogColor: 0xbfe6ff,
      fogNear: 50,
      fogFar: 170,
      roadColor: 0x3d3d45,
      lineColor: 0xffffff,
      ambientColor: 0xffffff,
      ambientIntensity: 1.05,
      sunColor: 0xfff4d6,
      buildingColors: [0x4a6fa5, 0x6b7f8f, 0x8a97a6, 0x39506b, 0x5c7a99],
      buildingEmissive: [0x000000],
      hasBuildingLights: false,
      groundColor: 0x8b95a1,
      envObjects: 'city',
    },
    {
      id: 'nature',
      name: 'Landschaft',
      icon: '🌿',
      desc: 'Offene Felder & Berge',
      skyColor: 0x87ceeb,
      fogColor: 0xd4f0ff,
      fogNear: 60,
      fogFar: 200,
      roadColor: 0x444444,
      lineColor: 0xffff00,
      ambientColor: 0xfff8e0,
      ambientIntensity: 0.9,
      sunColor: 0xffe680,
      buildingColors: [0x228b22, 0x355e20, 0x2d6a2d],
      buildingEmissive: [0x000000],
      hasBuildingLights: false,
      groundColor: 0x4a7a20,
      envObjects: 'nature',
    },
    {
      id: 'night',
      name: 'Nacht',
      icon: '🌙',
      desc: 'Neon-Lichter in der Dunkelheit',
      skyColor: 0x000011,
      fogColor: 0x000022,
      fogNear: 30,
      fogFar: 100,
      roadColor: 0x111111,
      lineColor: 0xff8800,
      ambientColor: 0x000820,
      ambientIntensity: 0.3,
      sunColor: 0x0044ff,
      buildingColors: [0x050515, 0x0a0520, 0x050a15],
      buildingEmissive: [0xff0066, 0x0066ff, 0x00ff44, 0xffaa00],
      hasBuildingLights: true,
      streetLightColor: 0xffa500,
      groundColor: 0x080808,
      envObjects: 'night',
    },
  ];

  const ROAD_WIDTH = 14;    // total road width
  // Lane markings sit slightly above the road plane instead of perfectly
  // coplanar with it, so they never z-fight/flicker with the road surface.
  const LINE_Y = 0.015;
  // Offset (world Z, relative to a dash tile's own origin) of the tile's
  // frontmost/nearest dash. Must match the "-d * 6 - 2" placement used in
  // buildDashTile() below for d = 0.
  const DASH_TILE_FRONT_OFFSET = -2;
  // With the fixed camera rig (height 7, position z=14, 60° vertical FOV,
  // tilted to look at z=-10 — see game.js initCamera), the closest point of
  // the ground that can ever be visible (bottom edge of the screen) sits at
  // world z ≈ 7.3. A dash tile must not be recycled (teleported far behind)
  // until its frontmost dash has scrolled past that point, or it visibly
  // pops/vanishes right in front of the player instead of scrolling off
  // screen naturally. Keep a comfortable safety margin above 7.3.
  const ROAD_RECYCLE_VISIBLE_LIMIT_Z = 12;
  const LANE_COUNT = 4;
  const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
  // Marking tiles: small repeated segments just for the dashes (they scroll)
  // Road surface itself is a single large static plane — never gaps
  const TILE_LENGTH = 60;   // dash-tile length for recycling markings
  const NUM_SEGMENTS = 6;   // number of marking tiles
  const TOTAL_ROAD_LENGTH = TILE_LENGTH * NUM_SEGMENTS;

  // Lane center X positions
  function getLaneX(lane) {
    // lanes 0..3, centered around 0
    return (lane - (LANE_COUNT - 1) / 2) * LANE_WIDTH;
  }

  // Build environment scene (road, sky, buildings, etc.)
  function buildEnvironment(trackDef, scene) {
    const objects = [];

    // Sky / fog
    scene.background = new THREE.Color(trackDef.skyColor);
    scene.fog = new THREE.FogExp2(trackDef.fogColor, 0.018);

    // Ground plane – sits clearly below road (y=0) to avoid z-fighting
    const groundGeo = new THREE.PlaneGeometry(300, 1400);
    const groundMat = new THREE.MeshLambertMaterial({ color: trackDef.groundColor });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;   // well below road surface
    scene.add(ground);
    objects.push({ mesh: ground, isStatic: true });

    // Road surface — single HUGE static plane, never scrolls, never gaps
    const roadSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_WIDTH, 2000),
      new THREE.MeshLambertMaterial({
        color: trackDef.roadColor,
        polygonOffset: true,
        polygonOffsetFactor: 2,
        polygonOffsetUnits: 2,
      })
    );
    roadSurface.rotation.x = -Math.PI / 2;
    roadSurface.position.set(0, 0, -800); // centered far back, covers all visible z
    scene.add(roadSurface);

    // Static solid edge lines (don't scroll — no gaps).
    // Raised slightly above the road surface (instead of sitting perfectly
    // coplanar with it) so they never z-fight/flicker with the road,
    // regardless of viewing distance or depth-buffer precision.
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-ROAD_WIDTH / 2 + 0.15, ROAD_WIDTH / 2 - 0.15].forEach(ex => {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 2000), edgeMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(ex, LINE_Y, -800);
      scene.add(edge);
    });

    // Static curbs (don't scroll)
    [-1, 1].forEach(side => {
      const curb = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.12, 2000),
        new THREE.MeshLambertMaterial({ color: 0x888888 })
      );
      curb.position.set(side * (ROAD_WIDTH / 2 + 0.3), 0.06, -800);
      scene.add(curb);
    });

    // Scrolling dash-tile groups (only the dashes move — gives illusion of speed)
    const roadSegments = [];
    for (let i = 0; i < NUM_SEGMENTS; i++) {
      const seg = buildDashTile(trackDef);
      seg.position.z = -i * TILE_LENGTH;
      scene.add(seg);
      roadSegments.push(seg);
    }

    // Ambient light
    const ambient = new THREE.AmbientLight(trackDef.ambientColor, trackDef.ambientIntensity);
    scene.add(ambient);

    // Directional light (sun/moon)
    const sun = new THREE.DirectionalLight(trackDef.sunColor, 1.0);
    sun.position.set(5, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    // Street lights only make sense for tracks with glowing neon buildings
    // (night) — a bright daytime city or open nature scene doesn't need
    // (or want) glowing orbs floating along the road.
    const lightPosts = [];
    if (trackDef.hasBuildingLights) {
      for (let i = 0; i < 12; i++) {
        const postLight = new THREE.PointLight(
          trackDef.streetLightColor || 0xffa500,
          1.8, 25
        );
        postLight.position.set(8, 5, -i * 10);
        scene.add(postLight);
        lightPosts.push(postLight);
        const postLight2 = postLight.clone();
        postLight2.position.set(-8, 5, -i * 10);
        scene.add(postLight2);
        lightPosts.push(postLight2);
      }
    }

    // Side environment objects (buildings, trees, etc.)
    const sideObjects = buildSideObjects(trackDef, scene);

    return {
      roadSegments,
      sideObjects,
      lightPosts,
      segmentLength: TILE_LENGTH,
      numSegments: NUM_SEGMENTS,
    };
  }

  // Only lane dashes scroll — the road surface is static and never gaps
  function buildDashTile(trackDef) {
    const group = new THREE.Group();
    const lineMat = new THREE.MeshBasicMaterial({ color: trackDef.lineColor });
    const dashCount = Math.ceil(TILE_LENGTH / 6);
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const lx = getLaneX(lane) - LANE_WIDTH / 2;
      for (let d = 0; d < dashCount; d++) {
        const dash = new THREE.Mesh(
          new THREE.PlaneGeometry(0.14, 3.5),
          lineMat
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(lx, LINE_Y, -d * 6 + DASH_TILE_FRONT_OFFSET);
        group.add(dash);
      }
    }
    return group;
  }

  const BUILDING_COLORS_POOL = [
    0xff0066, 0x0066ff, 0x00ff44, 0xffaa00, 0xaa00ff, 0x00ffff, 0xff4400
  ];

  function buildSideObjects(trackDef, scene) {
    const objects = [];
    // More objects to cover the longer total road length comfortably
    const count = 40;
    const spacing = TOTAL_ROAD_LENGTH / count;

    for (let i = 0; i < count; i++) {
      for (const side of [-1, 1]) {
        let mesh;
        let halfWidth;

        if (trackDef.envObjects === 'nature') {
          mesh = buildTree();
          halfWidth = 1.8; // tree crown radius
        } else {
          const result = buildBuilding(trackDef, i);
          mesh = result.group;
          halfWidth = result.halfWidth;
        }

        const z = -i * spacing;
        // Minimum clearance: road half-width + curb (0.6) + gap (2.0) + object half-width
        const minX = ROAD_WIDTH / 2 + 0.6 + 2.0 + halfWidth;
        const x = side * (minX + Math.random() * 8);
        mesh.position.set(x, 0, z);
        scene.add(mesh);
        objects.push({ mesh, spacing: count * spacing });
      }
    }
    return objects;
  }

  function buildBuilding(trackDef, index) {
    const group = new THREE.Group();
    const h = 8 + Math.random() * 28;
    const w = 4 + Math.random() * 5;
    const d = 4 + Math.random() * 5;
    const colorIdx = index % trackDef.buildingColors.length;
    const color = trackDef.buildingColors[colorIdx];
    const emissive = trackDef.buildingEmissive[colorIdx % trackDef.buildingEmissive.length];

    const mat = new THREE.MeshPhongMaterial({ color, emissive, emissiveIntensity: trackDef.hasBuildingLights ? 0.3 : 0 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    body.castShadow = true;
    group.add(body);

    // Windows (small emissive planes on the road-facing side)
    if (trackDef.hasBuildingLights) {
      const winColor = BUILDING_COLORS_POOL[Math.floor(Math.random() * BUILDING_COLORS_POOL.length)];
      const winMat = new THREE.MeshBasicMaterial({ color: winColor });
      const rows = Math.floor(h / 2.5);
      const cols = Math.floor(w / 1.5);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.random() > 0.4) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), winMat);
            win.position.set(
              -w / 2 + 0.02 + c * (w / cols) + 0.3,
              1.5 + r * 2.4,
              d / 2 + 0.02
            );
            group.add(win);
          }
        }
      }
    }
    return { group, halfWidth: w / 2 };
  }

  function buildTree() {
    const group = new THREE.Group();
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 7), trunkMat);
    trunk.position.y = 0.75;
    group.add(trunk);
    const leafColors = [0x228b22, 0x2d8e2d, 0x1a7a1a, 0x32a832];
    const leafColor = leafColors[Math.floor(Math.random() * leafColors.length)];
    const leafMat = new THREE.MeshLambertMaterial({ color: leafColor });
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.8, 3.5 + Math.random() * 2, 7), leafMat);
    leaf.position.y = 3.5;
    leaf.castShadow = true;
    group.add(leaf);
    return group;
  }

  // Advance environment scroll (call each frame)
  function scrollEnvironment(envData, scrollAmount) {
    const { roadSegments } = envData;

    // Only the dash tiles scroll — road surface is static (never gaps/clipping)
    roadSegments.forEach(seg => { seg.position.z += scrollAmount; });

    // Recycle dash tile only once its frontmost dash has fully scrolled past
    // the closest point the camera can ever see (see
    // ROAD_RECYCLE_VISIBLE_LIMIT_Z above) — otherwise it teleports away
    // while still on screen, which looks like the lane markings vanishing.
    roadSegments.forEach(seg => {
      if (seg.position.z + DASH_TILE_FRONT_OFFSET > ROAD_RECYCLE_VISIBLE_LIMIT_Z) {
        let minZ = Infinity;
        roadSegments.forEach(s => { if (s.position.z < minZ) minZ = s.position.z; });
        seg.position.z = minZ - TILE_LENGTH;
      }
    });

    // Scroll side objects
    if (envData.sideObjects) {
      envData.sideObjects.forEach(obj => {
        obj.mesh.position.z += scrollAmount;
        if (obj.mesh.position.z > 25) {
          obj.mesh.position.z -= obj.spacing;
        }
      });
    }

    // Scroll light posts
    if (envData.lightPosts) {
      envData.lightPosts.forEach(lp => {
        lp.position.z += scrollAmount;
        if (lp.position.z > 15) {
          lp.position.z -= 120;
        }
      });
    }
  }

  return {
    defs: TRACK_DEFS,
    buildEnvironment,
    scrollEnvironment,
    getLaneX,
    ROAD_WIDTH,
    LANE_COUNT,
    LANE_WIDTH,
    SEGMENT_LENGTH: TILE_LENGTH,
    TOTAL_ROAD_LENGTH,
  };
})();
