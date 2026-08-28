/* ============================================================
   Minimal THREE.js stand-in used only for running js/tracks.js
   (scene-graph construction + scroll/recycle math) under plain
   Node.js in automated tests — no WebGL/browser required.
   ============================================================ */

'use strict';

function makeVector3(x = 0, y = 0, z = 0) {
  return {
    x, y, z,
    set(nx, ny, nz) { this.x = nx; this.y = ny; this.z = nz; return this; },
  };
}

class Object3D {
  constructor() {
    this.position = makeVector3();
    this.rotation = makeVector3();
    this.children = [];
    this.castShadow = false;
    this.receiveShadow = false;
  }
  add(child) { this.children.push(child); return this; }
  remove(child) {
    const i = this.children.indexOf(child);
    if (i !== -1) this.children.splice(i, 1);
    return this;
  }
  traverse(fn) {
    fn(this);
    this.children.forEach(c => c.traverse ? c.traverse(fn) : fn(c));
  }
}

class Group extends Object3D {}

class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
  }
}

class Light extends Object3D {
  constructor(color, intensity, distance) {
    super();
    this.color = color;
    this.intensity = intensity;
    this.distance = distance;
    this.shadow = { mapSize: { width: 0, height: 0 } };
  }
  clone() {
    const c = new this.constructor(this.color, this.intensity, this.distance);
    c.position.set(this.position.x, this.position.y, this.position.z);
    return c;
  }
}

class Geometry { constructor(...args) { this.args = args; } dispose() {} }

function material(props) {
  return Object.assign({ dispose() {} }, props);
}

const THREE = {
  Scene: class extends Object3D {
    constructor() { super(); this.background = null; this.fog = null; }
  },
  Color: class { constructor(c) { this.value = c; } },
  FogExp2: class { constructor(color, density) { this.color = color; this.density = density; } },
  PlaneGeometry: Geometry,
  BoxGeometry: Geometry,
  CylinderGeometry: Geometry,
  ConeGeometry: Geometry,
  SphereGeometry: Geometry,
  Mesh,
  Group,
  MeshBasicMaterial: material,
  MeshLambertMaterial: material,
  MeshPhongMaterial: material,
  AmbientLight: class extends Light {},
  DirectionalLight: class extends Light {},
  PointLight: class extends Light {},
};

module.exports = THREE;
