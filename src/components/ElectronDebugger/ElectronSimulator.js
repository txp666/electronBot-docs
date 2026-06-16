import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HOME_POSE, SERVO_KEYS } from './constants';

const MODEL_URL = '/files/models/electronbot.glb';
const DEFAULT_FACE_TEXTURE_URL = '/files/gifs/staticstate.gif';
const FACE_DOM_SIZE = 240;
const deg = (value) => THREE.MathUtils.degToRad(value);
const lerp = (a, b, t) => a + (b - a) * t;

const DEFAULT_SIM_COLORS = {
  head: '#11151d',
  body: '#11151d',
  shell: '#f1f3f6',
  arms: '#f1f3f6',
  armInner: '#11151d',
  base: '#f1f3f6',
  baseBottom: '#11151d',
  screen: '#05070d',
  background: '#111827',
};

const PARTS = [
  'neck',
  'head_back',
  'left_arm_inner',
  'left_arm_outer',
  'right_arm_inner',
  'right_arm_outer',
  'base_bottom',
  'base_top',
  'screen',
  'head_front',
  'body_front',
  'button',
  'body_back_right',
  'body_back_left',
];

const PART_COLOR = {
  neck: 'shell',
  head_back: 'shell',
  left_arm_inner: 'armInner',
  left_arm_outer: 'arms',
  right_arm_inner: 'armInner',
  right_arm_outer: 'arms',
  base_bottom: 'baseBottom',
  base_top: 'base',
  screen: 'screen',
  head_front: 'head',
  body_front: 'body',
  button: 'shell',
  body_back_right: 'shell',
  body_back_left: 'shell',
};

const BODY_PARTS = ['body_front', 'body_back_left', 'body_back_right', 'button'];
const HEAD_PARTS = ['neck', 'head_back', 'head_front', 'screen'];

function normalizeColors(colors) {
  return { ...DEFAULT_SIM_COLORS, ...(colors || {}) };
}

function colorForPart(part, colors) {
  const key = PART_COLOR[part] || 'shell';
  return normalizeColors(colors)[key] || DEFAULT_SIM_COLORS.shell;
}

function isDarkColor(value) {
  const color = new THREE.Color(value);
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722 < 0.42;
}

function createMaterial(part) {
  const color = colorForPart(part);
  if (part === 'screen') {
    return new THREE.MeshBasicMaterial({ color, toneMapped: false });
  }
  return new THREE.MeshStandardMaterial({
    color,
    roughness: isDarkColor(color) ? 0.58 : 0.66,
    metalness: 0.03,
  });
}

function applyColorToMaterial(material, color) {
  if (!material || !material.color || material.userData.electronbotColor === color) return;
  material.color.set(color);
  material.userData.electronbotColor = color;
  if (material.isMeshStandardMaterial) material.roughness = isDarkColor(color) ? 0.58 : 0.66;
}

function applyVisualSettings(root, scene, colors) {
  const resolved = normalizeColors(colors);
  if (scene.background && scene.background.isColor) scene.background.set(resolved.background);
  else scene.background = new THREE.Color(resolved.background);
  if (!root) return;

  root.traverse((object) => {
    if (!object.isMesh || !object.userData.part) return;
    const color = colorForPart(object.userData.part, resolved);
    if (Array.isArray(object.material)) object.material.forEach((material) => applyColorToMaterial(material, color));
    else applyColorToMaterial(object.material, color);
  });
}

function updateExpressionSource(image, faceTextureUrl) {
  if (!image || !faceTextureUrl || image.dataset.electronbotSrc === faceTextureUrl) return;
  image.dataset.electronbotSrc = faceTextureUrl;
  image.src = faceTextureUrl;
}

function createFaceOverlay(wrap, faceTextureUrl = DEFAULT_FACE_TEXTURE_URL) {
  if (typeof document === 'undefined') return null;

  const image = document.createElement('img');
  image.alt = '';
  image.dataset.electronbotFace = 'overlay';
  image.dataset.electronbotSrc = faceTextureUrl;
  image.src = faceTextureUrl;
  image.style.position = 'absolute';
  image.style.left = '0';
  image.style.top = '0';
  image.style.width = `${FACE_DOM_SIZE}px`;
  image.style.height = `${FACE_DOM_SIZE}px`;
  image.style.opacity = '0';
  image.style.objectFit = 'fill';
  image.style.pointerEvents = 'none';
  image.style.transformOrigin = '0 0';
  image.style.zIndex = '2';
  image.style.willChange = 'transform, opacity';
  wrap.appendChild(image);
  return image;
}

function quadMatrix3d([p0, p1, p2, p3], width = 1, height = 1) {
  const dx1 = p1.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dx2 = p3.x - p2.x;
  const dy2 = p3.y - p2.y;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  let a;
  let b;
  let c;
  let d;
  let e;
  let f;
  let g;
  let h;

  if (Math.abs(dx3) < 1e-6 && Math.abs(dy3) < 1e-6) {
    a = p1.x - p0.x;
    b = p1.y - p0.y;
    c = p3.x - p0.x;
    d = p3.y - p0.y;
    e = p0.x;
    f = p0.y;
    g = 0;
    h = 0;
  } else {
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 1e-6) return null;
    g = (dx3 * dy2 - dx2 * dy3) / det;
    h = (dx1 * dy3 - dx3 * dy1) / det;
    a = p1.x - p0.x + g * p1.x;
    b = p1.y - p0.y + g * p1.y;
    c = p3.x - p0.x + h * p3.x;
    d = p3.y - p0.y + h * p3.y;
    e = p0.x;
    f = p0.y;
  }

  return `matrix3d(${[
    a / width, b / width, 0, g / width,
    c / height, d / height, 0, h / height,
    0, 0, 1, 0,
    e, f, 0, 1,
  ].map((value) => Number(value.toFixed(6))).join(',')})`;
}

function updateFaceOverlay(image, screenMesh, camera, renderer) {
  if (!image || !screenMesh || !screenMesh.geometry || !screenMesh.geometry.boundingBox) return;

  screenMesh.updateWorldMatrix(true, false);
  const box = screenMesh.geometry.boundingBox;
  const insetX = (box.max.x - box.min.x) * 0.18;
  const insetZ = (box.max.z - box.min.z) * 0.24;
  const y = box.min.y - 0.0008;
  const screenCenter = new THREE.Vector3(
    (box.min.x + box.max.x) / 2,
    y,
    (box.min.z + box.max.z) / 2
  );
  const screenNormal = new THREE.Vector3(0, -1, 0).transformDirection(screenMesh.matrixWorld);
  const toCamera = camera.position.clone().sub(screenMesh.localToWorld(screenCenter.clone())).normalize();
  if (screenNormal.dot(toCamera) <= -0.03) {
    image.style.opacity = '0';
    return;
  }

  const localPoints = [
    new THREE.Vector3(box.min.x + insetX, y, box.max.z - insetZ),
    new THREE.Vector3(box.max.x - insetX, y, box.max.z - insetZ),
    new THREE.Vector3(box.max.x - insetX, y, box.min.z + insetZ),
    new THREE.Vector3(box.min.x + insetX, y, box.min.z + insetZ),
  ];
  const canvas = renderer.domElement;
  const projected = localPoints.map((point) => {
    const ndc = screenMesh.localToWorld(point).project(camera);
    return {
      x: ((ndc.x + 1) / 2) * canvas.clientWidth,
      y: ((1 - ndc.y) / 2) * canvas.clientHeight,
      z: ndc.z,
    };
  });

  if (projected.some((point) => point.z < -1 || point.z > 1)) {
    image.style.opacity = '0';
    return;
  }

  const matrix = quadMatrix3d(projected, FACE_DOM_SIZE, FACE_DOM_SIZE);
  if (!matrix) {
    image.style.opacity = '0';
    return;
  }

  image.style.transform = matrix;
  image.style.opacity = '1';
}

function normalizeName(name = '') {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function getPose(anim) {
  if (!anim.dur) {
    anim.cur = { ...anim.to };
    return anim.cur;
  }

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const t = Math.min(1, Math.max(0, (now - anim.start) / anim.dur));
  const eased = t * t * (3 - 2 * t);
  const next = {};
  SERVO_KEYS.forEach((key) => {
    next[key] = lerp(anim.from[key], anim.to[key], eased);
  });
  anim.cur = next;
  return anim.cur;
}

function makePartObject(node, part) {
  node.updateWorldMatrix(true, true);
  const group = new THREE.Group();
  group.name = part;
  let meshCount = 0;

  node.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    let geometry = child.geometry.clone();
    if (geometry.index) geometry = geometry.toNonIndexed();

    Object.keys(geometry.attributes).forEach((attribute) => {
      if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute);
    });

    geometry.applyMatrix4(child.matrixWorld);
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, createMaterial(part));
    mesh.name = child.name || `${part}_${meshCount + 1}`;
    mesh.userData.part = part;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    meshCount += 1;
  });

  return meshCount ? group : null;
}

function addPivotGroup(parent, pivot) {
  const group = new THREE.Group();
  const parentPivot = parent.userData && parent.userData.sourcePivot;
  group.position.copy(parentPivot ? pivot.clone().sub(parentPivot) : pivot);
  group.userData.sourcePivot = pivot.clone();
  parent.add(group);
  return group;
}

function addObjectToPivot(group, object) {
  const pivot = group.userData.sourcePivot || new THREE.Vector3();
  object.position.copy(pivot).multiplyScalar(-1);
  group.add(object);
}

function countTriangles(object) {
  let total = 0;
  object.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    total += child.geometry.index ? child.geometry.index.count / 3 : child.geometry.getAttribute('position').count / 3;
  });
  return total;
}

function findFirstMesh(object) {
  let found = null;
  object.traverse((child) => {
    if (!found && child.isMesh) found = child;
  });
  return found;
}

function getBox(objects, names) {
  const box = new THREE.Box3();
  names.forEach((name) => {
    if (objects[name]) box.expandByObject(objects[name]);
  });
  return box.isEmpty() ? null : box;
}

function boxCenter(box) {
  return box.getCenter(new THREE.Vector3());
}

function originOrFallback(nodes, part, fallback) {
  const node = nodes[part];
  if (!node) return fallback.clone();
  const origin = node.getWorldPosition(new THREE.Vector3());
  return origin.lengthSq() > 1e-8 ? origin : fallback.clone();
}

function estimatePivots(nodes, meshes, bounds) {
  const allCenter = bounds.getCenter(new THREE.Vector3());
  const baseTop = getBox(meshes, ['base_top']) || bounds;
  const neck = getBox(meshes, ['neck']) || getBox(meshes, HEAD_PARTS) || bounds;
  const rightArm = getBox(meshes, ['right_arm_inner', 'right_arm_outer']) || bounds;

  const baseCenter = boxCenter(baseTop);
  const neckCenter = boxCenter(neck);
  const rightCenter = boxCenter(rightArm);

  const bodyYaw = new THREE.Vector3(baseCenter.x, baseCenter.y, baseTop.max.z);
  const headPitch = new THREE.Vector3(neckCenter.x, neckCenter.y, neckCenter.z);
  const fallbackRightArm = new THREE.Vector3(rightArm.max.x, rightCenter.y, rightCenter.z);
  const rightArmPivot = originOrFallback(nodes, 'right_arm_inner', fallbackRightArm);
  const leftArmPivot = rightArmPivot.clone();
  leftArmPivot.x *= -1;

  return {
    bodyYaw: originOrFallback(nodes, 'body_front', bodyYaw),
    headPitch: originOrFallback(nodes, 'neck', headPitch),
    leftArm: leftArmPivot,
    rightArm: rightArmPivot,
    center: allCenter,
  };
}

function buildArticulatedElectronBot(model) {
  const namedNodes = {};
  model.updateWorldMatrix(true, true);
  model.traverse((object) => {
    const name = normalizeName(object.name);
    if (PARTS.includes(name) && !namedNodes[name]) namedNodes[name] = object;
  });

  if (!PARTS.every((part) => namedNodes[part])) {
    const missing = PARTS.filter((part) => !namedNodes[part]);
    throw new Error(`Missing model parts: ${missing.join(', ')}`);
  }

  const meshes = {};
  const bounds = new THREE.Box3();
  let triangleCount = 0;
  PARTS.forEach((part) => {
    const object = makePartObject(namedNodes[part], part);
    if (!object) throw new Error(`Empty model part: ${part}`);
    meshes[part] = object;
    bounds.expandByObject(object);
    triangleCount += countTriangles(object);
  });

  const pivots = estimatePivots(namedNodes, meshes, bounds);
  const screenMesh = meshes.screen ? findFirstMesh(meshes.screen) : null;
  const rig = new THREE.Group();
  const joints = {};

  if (meshes.base_bottom) rig.add(meshes.base_bottom);
  if (meshes.base_top) rig.add(meshes.base_top);

  joints.bodyYaw = addPivotGroup(rig, pivots.bodyYaw);
  BODY_PARTS.forEach((part) => {
    if (meshes[part]) addObjectToPivot(joints.bodyYaw, meshes[part]);
  });

  joints.headPitch = addPivotGroup(joints.bodyYaw, pivots.headPitch);
  HEAD_PARTS.forEach((part) => {
    if (meshes[part]) addObjectToPivot(joints.headPitch, meshes[part]);
  });

  joints.leftArm = addPivotGroup(joints.bodyYaw, pivots.leftArm);
  joints.leftArm.rotation.order = 'YXZ';
  if (meshes.left_arm_inner) addObjectToPivot(joints.leftArm, meshes.left_arm_inner);
  if (meshes.left_arm_outer) addObjectToPivot(joints.leftArm, meshes.left_arm_outer);

  joints.rightArm = addPivotGroup(joints.bodyYaw, pivots.rightArm);
  joints.rightArm.rotation.order = 'YXZ';
  if (meshes.right_arm_inner) addObjectToPivot(joints.rightArm, meshes.right_arm_inner);
  if (meshes.right_arm_outer) addObjectToPivot(joints.rightArm, meshes.right_arm_outer);

  rig.position.sub(pivots.center);
  return {
    rig,
    joints,
    pivots,
    size: bounds.getSize(new THREE.Vector3()),
    triangleCount,
    screenMesh,
  };
}

function disposeSourceScene(model) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    if (object.geometry) object.geometry.dispose();
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
    else if (object.material) object.material.dispose();
  });
}

function applyPose(joints, pose) {
  if (joints.bodyYaw) joints.bodyYaw.rotation.z = deg((pose.b - HOME_POSE.b) * 0.9);
  if (joints.headPitch) joints.headPitch.rotation.x = deg((pose.h - HOME_POSE.h) * -1.4);
  if (joints.leftArm) {
    joints.leftArm.rotation.x = deg((pose.lp - HOME_POSE.lp) * -0.8);
    joints.leftArm.rotation.y = deg((pose.lr - HOME_POSE.lr) * -0.9);
    joints.leftArm.rotation.z = 0;
  }
  if (joints.rightArm) {
    joints.rightArm.rotation.x = deg((HOME_POSE.rp - pose.rp) * -0.8);
    joints.rightArm.rotation.y = deg((HOME_POSE.rr - pose.rr) * 0.9);
    joints.rightArm.rotation.z = 0;
  }
}

export default function ElectronSimulator({
  pose,
  transitionMs = 0,
  colors = DEFAULT_SIM_COLORS,
  faceTextureUrl = DEFAULT_FACE_TEXTURE_URL,
}) {
  const wrapRef = useRef(null);
  const colorsRef = useRef(normalizeColors(colors));
  const faceTextureUrlRef = useRef(faceTextureUrl || DEFAULT_FACE_TEXTURE_URL);
  const animRef = useRef({
    from: { ...HOME_POSE },
    to: { ...HOME_POSE },
    start: 0,
    dur: 0,
    cur: { ...HOME_POSE },
  });

  useEffect(() => {
    const current = animRef.current;
    current.from = { ...current.cur };
    current.to = { ...HOME_POSE, ...(pose || {}) };
    current.start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    current.dur = Math.max(0, transitionMs);
  }, [pose, transitionMs]);

  useEffect(() => {
    colorsRef.current = normalizeColors(colors);
  }, [colors]);

  useEffect(() => {
    faceTextureUrlRef.current = faceTextureUrl || DEFAULT_FACE_TEXTURE_URL;
  }, [faceTextureUrl]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return undefined;

    let width = wrap.clientWidth || 320;
    let height = wrap.clientHeight || 260;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.dataset.electronbotStatus = 'booting';
    wrap.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colorsRef.current.background);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 2000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2d3647, 1.05));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xc7d2fe, 0.55);
    fillLight.position.set(-4, 2, -4);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.2;
    controls.maxDistance = 24;

    const root = new THREE.Group();
    root.rotation.x = -Math.PI / 2;
    scene.add(root);

    let joints = null;
    let ground = null;
    let screenMesh = null;
    const expressionImage = createFaceOverlay(wrap, faceTextureUrlRef.current);
    const loader = new GLTFLoader();
    const abort = new AbortController();

    const loadModel = async () => {
      try {
        renderer.domElement.dataset.electronbotStatus = 'loading';
        window.__electronBotModel = { loaded: false, loading: true, url: MODEL_URL };
        const timeout = window.setTimeout(() => abort.abort(), 15000);
        const response = await fetch(MODEL_URL, { signal: abort.signal, cache: 'no-store' });
        window.clearTimeout(timeout);
        if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
        const buffer = await response.arrayBuffer();
        renderer.domElement.dataset.electronbotBytes = String(buffer.byteLength);
        const gltf = await new Promise((resolve, reject) => loader.parse(buffer, '', resolve, reject));
        const articulated = buildArticulatedElectronBot(gltf.scene);
        disposeSourceScene(gltf.scene);

        joints = articulated.joints;
        screenMesh = articulated.screenMesh || null;
        const maxDim = Math.max(articulated.size.x, articulated.size.y, articulated.size.z) || 1;
        root.scale.setScalar(3.65 / maxDim);
        root.add(articulated.rig);
        applyPose(joints, animRef.current.cur);
        applyVisualSettings(root, scene, colorsRef.current);

        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        ground = new THREE.Mesh(
          new THREE.PlaneGeometry(12, 12),
          new THREE.ShadowMaterial({ opacity: 0.18 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(center.x, box.min.y, center.z);
        ground.receiveShadow = true;
        scene.add(ground);

        const dist = Math.max(size.x, size.y, size.z) * 1.85;
        camera.position.set(center.x + dist * 0.46, center.y + dist * 0.26, center.z + dist);
        controls.target.copy(center);
        controls.update();

        renderer.domElement.dataset.electronbotStatus = 'loaded';
        renderer.domElement.dataset.electronbotParts = String(PARTS.length);
        renderer.domElement.dataset.electronbotTriangles = String(Math.round(articulated.triangleCount));
        window.__electronBotModel = {
          loaded: true,
          parts: PARTS.length,
          triangleCount: articulated.triangleCount,
          rawSize: articulated.size.toArray(),
          expression: screenMesh ? faceTextureUrlRef.current : null,
          pivots: Object.fromEntries(
            Object.entries(articulated.pivots).map(([key, value]) => [key, value.toArray()])
          ),
        };
      } catch (error) {
        if (abort.signal.aborted) return;
        renderer.domElement.dataset.electronbotStatus = 'error';
        renderer.domElement.dataset.electronbotError = String(error && error.message || error);
        window.__electronBotModel = { loaded: false, error: String(error && error.message || error) };
        console.error('[ElectronSimulator] model load failed', error);
      }
    };
    loadModel();

    let raf = 0;
    const render = () => {
      if (joints) {
        const currentPose = getPose(animRef.current);
        applyPose(joints, currentPose);
        renderer.domElement.dataset.electronbotPose = SERVO_KEYS.map((key) => Math.round(currentPose[key])).join(',');
      }
      applyVisualSettings(root, scene, colorsRef.current);
      updateExpressionSource(expressionImage, faceTextureUrlRef.current);
      controls.update();
      renderer.render(scene, camera);
      updateFaceOverlay(expressionImage, screenMesh, camera, renderer);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onResize = () => {
      width = wrap.clientWidth || 320;
      height = wrap.clientHeight || 260;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      abort.abort();
      resizeObserver.disconnect();
      controls.dispose();
      root.traverse((object) => {
        if (!object.isMesh) return;
        object.geometry.dispose();
        if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
        else if (object.material) object.material.dispose();
      });
      if (ground) {
        ground.geometry.dispose();
        ground.material.dispose();
      }
      if (expressionImage && expressionImage.parentNode) expressionImage.parentNode.removeChild(expressionImage);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={wrapRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} />;
}
