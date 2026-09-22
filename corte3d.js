// Visor 3D genérico de "corte de carne" — se abre al tocar cualquier plato
// de la sección Parrilla. No usa modelos .glb (no tenemos assets reales por
// corte): la geometría, el marmoleado y la iluminación se generan en código
// con Three.js. Un solo modelo sirve para todos los cortes.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, mesh, container, resizeObs;
let ready = false;

function buildMarbledTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, '#8f2314');
  base.addColorStop(0.5, '#a8291a');
  base.addColorStop(1, '#7a1c10');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(25,8,5,0.30)';
  ctx.lineWidth = 7;
  for (let i = 0; i < 6; i++) {
    const y = (i / 6) * size + Math.random() * 24;
    ctx.beginPath();
    ctx.moveTo(-20, y);
    ctx.lineTo(size + 20, y + (Math.random() * 50 - 25));
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 12 + Math.random() * 55;
    const angle = Math.random() * Math.PI;
    ctx.strokeStyle = `rgba(255,236,208,${0.05 + Math.random() * 0.13})`;
    ctx.lineWidth = 1 + Math.random() * 2.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function buildMeatMesh() {
  const geo = new THREE.SphereGeometry(1, 110, 72);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = v.clone().normalize();
    const bump =
      0.05 * Math.sin(v.x * 6 + v.y * 3) +
      0.045 * Math.sin(v.y * 7 - v.z * 4) +
      0.035 * Math.sin(v.z * 5 + v.x * 2.3) +
      0.028 * Math.sin((v.x + v.y + v.z) * 9);
    v.addScaledVector(n, bump);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhysicalMaterial({
    map: buildMarbledTexture(),
    roughness: 0.62,
    metalness: 0.02,
    clearcoat: 0.22,
    clearcoatRoughness: 0.5,
  });

  const m = new THREE.Mesh(geo, mat);
  m.scale.set(1.55, 0.6, 1.05);
  return m;
}

function resize() {
  if (!container || !renderer) return;
  const w = container.clientWidth;
  const h = container.clientHeight;
  if (!w || !h) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function init(containerEl) {
  container = containerEl;
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0.85, 3.1);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0x554035, 0.75));

  const key = new THREE.DirectionalLight(0xfff2df, 1.35);
  key.position.set(2.5, 3, 2.5);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xff4d00, 0.65);
  rim.position.set(-2.5, 1, -2.5);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffcf9e, 0.35, 10);
  fill.position.set(-1.5, -1, 2);
  scene.add(fill);

  mesh = buildMeatMesh();
  scene.add(mesh);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 1.8;
  controls.maxDistance = 5;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.2;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  resizeObs = new ResizeObserver(resize);
  resizeObs.observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  ready = true;
}

function ensureModal() {
  if (document.getElementById('corte3d-modal')) return;
  const wrap = document.createElement('div');
  wrap.id = 'corte3d-modal';
  wrap.className = 'hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4';
  wrap.innerHTML = `
    <div class="bg-ash border border-ember/40 rounded-2xl p-4 sm:p-5 max-w-sm w-full text-center" style="box-shadow:0 0 30px rgba(255,77,0,0.25)">
      <h3 id="corte3d-title" class="fileteado text-xl text-ember mb-1">Corte</h3>
      <p id="corte3d-hint" class="text-gray-300 text-xs mb-3">Arrastrá para girar · Pellizcá para hacer zoom</p>
      <div id="corte3d-canvas" class="w-full h-64 sm:h-80 rounded-xl overflow-hidden" style="touch-action:none; background:radial-gradient(circle at 50% 40%, #241d1a, #0d0d0d)"></div>
      <div class="flex gap-2 mt-4">
        <a id="corte3d-wa" href="#" target="_blank" class="flex-1 bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-full transition-all text-sm">Pedir por WhatsApp</a>
      </div>
      <button id="corte3d-close" class="mt-3 text-gray-300 text-xs hover:text-gray-100 transition-colors">Cerrar</button>
    </div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('#corte3d-close').addEventListener('click', close);
}

function open(dishName, waHref, opts) {
  opts = opts || {};
  ensureModal();
  const modal = document.getElementById('corte3d-modal');
  document.getElementById('corte3d-title').textContent = dishName;
  document.getElementById('corte3d-hint').textContent = opts.hint || 'Arrastrá para girar · Pellizcá para hacer zoom';
  document.getElementById('corte3d-wa').href = waHref;
  document.getElementById('corte3d-wa').textContent = opts.waLabel || 'Pedir por WhatsApp';
  document.getElementById('corte3d-close').textContent = opts.closeLabel || 'Cerrar';
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const host = document.getElementById('corte3d-canvas');
  if (!ready) init(host);
  requestAnimationFrame(resize);
  if (controls) controls.autoRotate = true;
}

function close() {
  const modal = document.getElementById('corte3d-modal');
  if (modal) modal.classList.add('hidden');
  document.body.style.overflow = '';
}

window.CorteViewer = { open, close };
