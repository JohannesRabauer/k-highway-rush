/* ============================================================
   Highway Rush – Track / Environment Definitions
   ============================================================ */

const Tracks = (() => {

  const TRACK_DEFS = [
    {
      id: 'city',
      name: 'Stadt',
      icon: '🏙️',
      desc: 'Neon-Wolkenkratzer & Stadtleben',
      skyColor: 0x1a0a2e,
      fogColor: 0x1a0a2e,
      fogNear: 40,
      fogFar: 120,
      roadColor: 0x222233,
      lineColor: 0xffffff,
      ambientColor: 0x200a50,
      ambientIntensity: 0.6,
      sunColor: 0x8844ff,
      buildingColors: [0x221133, 0x112233, 0x113322, 0x331122],
      buildingEmissive: [0x8800ff, 0x0088ff, 0x00ff88, 0xff0088],
      hasBuildingLights: true,
      groundColor: 0x111122,
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
      groundColor: 0x080808,
      envObjects: 'night',
    },
  ];

  const ROAD_WIDTH = 14;    // total road width
  // Lane markings sit slightly above the road plane instead of perfectly
  // coplanar with it, so they never z-fight/flicker with the road surface.
  const LINE_Y = 0.015;
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

    // City/night: add point lights along road
    const lightPosts = [];
    if (trackDef.id !== 'nature') {
      for (let i = 0; i < 12; i++) {
        const postLight = new THREE.PointLight(
          trackDef.id === 'city' ? 0xaa88ff : 0xffa500,
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
        dash.position.set(lx, LINE_Y, -d * 6 - 2);
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

    // Recycle dash tile when it fully passes the camera (past z=5)
    roadSegments.forEach(seg => {
      if (seg.position.z > 5) {
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
