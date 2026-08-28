/* ============================================================
   Highway Rush – Car Definitions & 3D Models (Three.js)
   ============================================================ */

const Cars = (() => {

  const CAR_DEFS = [
    {
      id: 'red',
      name: 'Rotes Auto',
      desc: 'Klassisches Renndesign',
      bodyColor: 0xff2222,
      accentColor: 0xff8800,
      windowColor: 0x88ccff,
      wheelColor: 0x111111,
      rimColor: 0xcccccc,
      emissive: 0xff2200,
    },
    {
      id: 'teal1',
      name: 'Cyber Türkis',
      desc: 'Futuristischer Look',
      bodyColor: 0x00e5ff,
      accentColor: 0x0088cc,
      windowColor: 0xaaffee,
      wheelColor: 0x111111,
      rimColor: 0x00ffff,
      emissive: 0x003344,
    },
    {
      id: 'teal2',
      name: 'Jade Racer',
      desc: 'Sportliches Türkis',
      bodyColor: 0x00cc88,
      accentColor: 0x00ffaa,
      windowColor: 0xaaffcc,
      wheelColor: 0x222222,
      rimColor: 0x88ffdd,
      emissive: 0x002211,
    },
    {
      id: 'purple1',
      name: 'Lila Blitz',
      desc: 'Kraftvoll & wild',
      bodyColor: 0xbf5fff,
      accentColor: 0xff00ff,
      windowColor: 0xddaaff,
      wheelColor: 0x111111,
      rimColor: 0xdd88ff,
      emissive: 0x220033,
    },
    {
      id: 'purple2',
      name: 'Neon Purple',
      desc: 'Königlicher Stil',
      bodyColor: 0x7733cc,
      accentColor: 0xcc00ff,
      windowColor: 0xcc99ff,
      wheelColor: 0x222222,
      rimColor: 0xaa66ff,
      emissive: 0x110022,
    },
  ];

  // Build a 3D car mesh using Three.js primitives
  function buildCarMesh(def, scale = 1) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6 * scale, 0.55 * scale, 3.6 * scale),
      new THREE.MeshPhongMaterial({ color: def.bodyColor, emissive: def.emissive, shininess: 120 })
    );
    body.position.y = 0.38 * scale;
    body.castShadow = true;
    group.add(body);

    // Cabin (upper body)
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.3 * scale, 0.48 * scale, 2.0 * scale),
      new THREE.MeshPhongMaterial({ color: def.bodyColor, emissive: def.emissive, shininess: 80 })
    );
    cabin.position.set(0, 0.82 * scale, -0.1 * scale);
    cabin.castShadow = true;
    group.add(cabin);

    // Front windshield
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(1.25 * scale, 0.38 * scale, 0.06 * scale),
      new THREE.MeshPhongMaterial({ color: def.windowColor, transparent: true, opacity: 0.7, shininess: 200 })
    );
    windshield.position.set(0, 0.82 * scale, 0.87 * scale);
    group.add(windshield);

    // Rear windshield
    const rearWind = windshield.clone();
    rearWind.position.set(0, 0.82 * scale, -1.07 * scale);
    group.add(rearWind);

    // Side windows
    for (const side of [-1, 1]) {
      const sideWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.06 * scale, 0.34 * scale, 1.6 * scale),
        new THREE.MeshPhongMaterial({ color: def.windowColor, transparent: true, opacity: 0.65, shininess: 180 })
      );
      sideWin.position.set(side * 0.65 * scale, 0.82 * scale, -0.1 * scale);
      group.add(sideWin);
    }

    // Accent stripe along hood
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.18 * scale, 0.02 * scale, 3.4 * scale),
      new THREE.MeshPhongMaterial({ color: def.accentColor, emissive: def.accentColor, emissiveIntensity: 0.4 })
    );
    stripe.position.set(0, 0.66 * scale, 0);
    group.add(stripe);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 0.22 * scale, 16);
    const wheelMat = new THREE.MeshPhongMaterial({ color: def.wheelColor });
    const rimMat = new THREE.MeshPhongMaterial({ color: def.rimColor, shininess: 150 });
    const rimGeo = new THREE.CylinderGeometry(0.18 * scale, 0.18 * scale, 0.24 * scale, 8);

    const wheelPositions = [
      [-0.9, 0.3, 1.2], [0.9, 0.3, 1.2],
      [-0.9, 0.3, -1.2], [0.9, 0.3, -1.2],
    ];
    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x * scale, y * scale, z * scale);
      wheel.castShadow = true;
      group.add(wheel);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(x * scale, y * scale, z * scale);
      group.add(rim);
    });

    // Headlights
    const lightGeo = new THREE.SphereGeometry(0.14 * scale, 8, 6);
    const lightMat = new THREE.MeshPhongMaterial({ color: 0xffffcc, emissive: 0xffff88, emissiveIntensity: 1 });
    [-0.55, 0.55].forEach(xOff => {
      const hl = new THREE.Mesh(lightGeo, lightMat);
      hl.position.set(xOff * scale, 0.4 * scale, 1.8 * scale);
      group.add(hl);
    });

    // Taillights
    const tailMat = new THREE.MeshPhongMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.8 });
    [-0.55, 0.55].forEach(xOff => {
      const tl = new THREE.Mesh(lightGeo, tailMat);
      tl.position.set(xOff * scale, 0.4 * scale, -1.8 * scale);
      group.add(tl);
    });

    // Spoiler
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.6 * scale, 0.08 * scale, 0.35 * scale),
      new THREE.MeshPhongMaterial({ color: def.accentColor })
    );
    spoiler.position.set(0, 1.15 * scale, -1.55 * scale);
    group.add(spoiler);
    const spoilerLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.07 * scale, 0.32 * scale, 0.3 * scale),
      new THREE.MeshPhongMaterial({ color: def.bodyColor })
    );
    spoilerLeft.position.set(-0.77 * scale, 0.97 * scale, -1.55 * scale);
    group.add(spoilerLeft);
    const spoilerRight = spoilerLeft.clone();
    spoilerRight.position.set(0.77 * scale, 0.97 * scale, -1.55 * scale);
    group.add(spoilerRight);

    return group;
  }

  // NPC traffic car (simpler model for performance)
  function buildTrafficCar(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 60 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 3.6), mat);
    body.position.y = 0.38;
    body.castShadow = true;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 2.0),
      new THREE.MeshPhongMaterial({ color, shininess: 40 }));
    cabin.position.set(0, 0.8, -0.1);
    group.add(cabin);
    const winMat = new THREE.MeshPhongMaterial({ color: 0x88aacc, transparent: true, opacity: 0.6 });
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 0.06), winMat);
    win.position.set(0, 0.8, 0.87);
    group.add(win);
    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.22, 10);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
    [[-.9,.28,1.2],[.9,.28,1.2],[-.9,.28,-1.2],[.9,.28,-1.2]].forEach(([x,y,z]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI/2;
      w.position.set(x,y,z);
      group.add(w);
    });
    // Taillights glow
    const tlMat = new THREE.MeshPhongMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6 });
    [-.6,.6].forEach(x => {
      const tl = new THREE.Mesh(new THREE.SphereGeometry(0.12,6,5), tlMat);
      tl.position.set(x, 0.4, -1.82);
      group.add(tl);
    });
    return group;
  }

  // Build truck
  function buildTruck(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 50 });
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.2), mat);
    cab.position.set(0, 0.7, 2.0);
    cab.castShadow = true;
    group.add(cab);
    const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, 5.5),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 30 }));
    trailer.position.set(0, 0.8, -1.5);
    trailer.castShadow = true;
    group.add(trailer);
    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    [[-.9,.38,1.6],[.9,.38,1.6],[-.9,.38,-3.2],[.9,.38,-3.2],[-.9,.38,-1.5],[.9,.38,-1.5]].forEach(([x,y,z]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI/2;
      w.position.set(x,y,z);
      group.add(w);
    });
    return group;
  }

  // Build motorcycle
  function buildMotorcycle(color) {
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color, shininess: 100 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 2.2), mat);
    body.position.y = 0.55;
    group.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.9),
      new THREE.MeshPhongMaterial({ color: 0x222222 }));
    seat.position.set(0, 0.84, -0.15);
    group.add(seat);
    const rider = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.4),
      new THREE.MeshPhongMaterial({ color: 0x333333 }));
    rider.position.set(0, 1.15, -0.1);
    group.add(rider);
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 14);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    [[0,.32, 0.9],[0,.32,-0.9]].forEach(([x,y,z]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI/2;
      w.position.set(x,y,z);
      group.add(w);
    });
    return group;
  }

  return {
    defs: CAR_DEFS,
    buildCarMesh,
    buildTrafficCar,
    buildTruck,
    buildMotorcycle,
  };
})();
