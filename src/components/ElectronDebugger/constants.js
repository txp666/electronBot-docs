// ElectronBot online debugging constants and firmware protocol mapping.
export const WS_PORT = 8080;
export const WS_PATH = '/ws';

export const SERVOS = [
  { key: 'rp', servoType: 'right_pitch', short: 'rp', index: 0, label: '右臂 Pitch', labelEn: 'Right arm pitch', min: 0, max: 180, home: 180, desc: '右臂旋转 · 安全范围 0-180', descEn: 'Right arm pitch · safe range 0-180' },
  { key: 'rr', servoType: 'right_roll', short: 'rr', index: 1, label: '右臂 Roll', labelEn: 'Right arm roll', min: 100, max: 180, home: 180, desc: '右臂推拉 · 安全范围 100-180', descEn: 'Right arm roll · safe range 100-180' },
  { key: 'lp', servoType: 'left_pitch', short: 'lp', index: 2, label: '左臂 Pitch', labelEn: 'Left arm pitch', min: 0, max: 180, home: 0, desc: '左臂旋转 · 安全范围 0-180', descEn: 'Left arm pitch · safe range 0-180' },
  { key: 'lr', servoType: 'left_roll', short: 'lr', index: 3, label: '左臂 Roll', labelEn: 'Left arm roll', min: 0, max: 80, home: 0, desc: '左臂推拉 · 安全范围 0-80', descEn: 'Left arm roll · safe range 0-80' },
  { key: 'b', servoType: 'body', short: 'b', index: 4, label: '身体旋转', labelEn: 'Body yaw', min: 30, max: 150, home: 90, desc: '身体左右旋转 · 安全范围 30-150', descEn: 'Body yaw · safe range 30-150' },
  { key: 'h', servoType: 'head', short: 'h', index: 5, label: '头部俯仰', labelEn: 'Head pitch', min: 75, max: 105, home: 90, desc: '头部上下 · 安全范围 75-105', descEn: 'Head pitch · safe range 75-105' },
];

export const SERVO_KEYS = SERVOS.map((s) => s.key);
export const SERVO_BY_KEY = SERVOS.reduce((acc, servo) => ({ ...acc, [servo.key]: servo }), {});
export const HOME_POSE = SERVOS.reduce((acc, servo) => ({ ...acc, [servo.key]: servo.home }), {});

export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const clampServo = (key, value) => {
  const servo = SERVO_BY_KEY[key];
  const numeric = Number(value);
  if (!servo) return Number.isFinite(numeric) ? Math.round(numeric) : 0;
  return clamp(Math.round(Number.isFinite(numeric) ? numeric : servo.home), servo.min, servo.max);
};

export const ACTIONS = [
  { id: 'hand_left_up', label: '举左手', labelEn: 'Left arm up', icon: 'hand-up', tool: 'self.electron.hand_action', args: { action: 1, hand: 1 }, category: 'hand', needs: ['speed'] },
  { id: 'hand_right_up', label: '举右手', labelEn: 'Right arm up', icon: 'hand-up', tool: 'self.electron.hand_action', args: { action: 1, hand: 2 }, category: 'hand', needs: ['speed'] },
  { id: 'hand_both_up', label: '举双手', labelEn: 'Both arms up', icon: 'hand-up', tool: 'self.electron.hand_action', args: { action: 1, hand: 3 }, category: 'hand', needs: ['speed'] },
  { id: 'hand_left_down', label: '放左手', labelEn: 'Left arm down', icon: 'hand-down', tool: 'self.electron.hand_action', args: { action: 2, hand: 1 }, category: 'hand', needs: ['speed'] },
  { id: 'hand_right_down', label: '放右手', labelEn: 'Right arm down', icon: 'hand-down', tool: 'self.electron.hand_action', args: { action: 2, hand: 2 }, category: 'hand', needs: ['speed'] },
  { id: 'hand_both_down', label: '放双手', labelEn: 'Both arms down', icon: 'hand-down', tool: 'self.electron.hand_action', args: { action: 2, hand: 3 }, category: 'hand', needs: ['speed'] },
  { id: 'hand_left_wave', label: '挥左手', labelEn: 'Left wave', icon: 'wave', tool: 'self.electron.hand_action', args: { action: 3, hand: 1 }, category: 'hand', needs: ['steps', 'speed'] },
  { id: 'hand_right_wave', label: '挥右手', labelEn: 'Right wave', icon: 'wave', tool: 'self.electron.hand_action', args: { action: 3, hand: 2 }, category: 'hand', needs: ['steps', 'speed'] },
  { id: 'hand_both_wave', label: '挥双手', labelEn: 'Both wave', icon: 'wave', tool: 'self.electron.hand_action', args: { action: 3, hand: 3 }, category: 'hand', needs: ['steps', 'speed'] },
  { id: 'hand_left_flap', label: '拍打左手', labelEn: 'Left flap', icon: 'flap', tool: 'self.electron.hand_action', args: { action: 4, hand: 1 }, category: 'hand', needs: ['steps', 'speed', 'amount'] },
  { id: 'hand_right_flap', label: '拍打右手', labelEn: 'Right flap', icon: 'flap', tool: 'self.electron.hand_action', args: { action: 4, hand: 2 }, category: 'hand', needs: ['steps', 'speed', 'amount'] },
  { id: 'hand_both_flap', label: '拍打双手', labelEn: 'Both flap', icon: 'flap', tool: 'self.electron.hand_action', args: { action: 4, hand: 3 }, category: 'hand', needs: ['steps', 'speed', 'amount'] },
  { id: 'body_left', label: '身体左转', labelEn: 'Turn left', icon: 'turn-left', tool: 'self.electron.body_turn', args: { direction: 1 }, category: 'body', needs: ['speed', 'angle'] },
  { id: 'body_right', label: '身体右转', labelEn: 'Turn right', icon: 'turn-right', tool: 'self.electron.body_turn', args: { direction: 2 }, category: 'body', needs: ['speed', 'angle'] },
  { id: 'body_center', label: '身体回中', labelEn: 'Body center', icon: 'center', tool: 'self.electron.body_turn', args: { direction: 3 }, category: 'body', needs: ['speed'] },
  { id: 'head_up', label: '抬头', labelEn: 'Head up', icon: 'head-up', tool: 'self.electron.head_move', args: { action: 1 }, category: 'head', needs: ['speed', 'angle'] },
  { id: 'head_down', label: '低头', labelEn: 'Head down', icon: 'head-down', tool: 'self.electron.head_move', args: { action: 2 }, category: 'head', needs: ['speed', 'angle'] },
  { id: 'head_nod_once', label: '点头一次', labelEn: 'Nod once', icon: 'nod', tool: 'self.electron.head_move', args: { action: 3 }, category: 'head', needs: ['speed', 'angle'] },
  { id: 'head_center', label: '头部回中', labelEn: 'Head center', icon: 'center', tool: 'self.electron.head_move', args: { action: 4 }, category: 'head', needs: ['speed'] },
  { id: 'head_nod_repeat', label: '连续点头', labelEn: 'Nod repeat', icon: 'nod', tool: 'self.electron.head_move', args: { action: 5 }, category: 'head', needs: ['steps', 'speed', 'angle'] },
  { id: 'home', label: '复位', labelEn: 'Home', icon: 'home', tool: 'self.electron.home', args: {}, category: 'system', needs: [] },
];

export const ACTION_GROUPS = [
  { id: 'all', label: '全部', labelEn: 'All' },
  { id: 'hand', label: '手部', labelEn: 'Arms' },
  { id: 'body', label: '身体', labelEn: 'Body' },
  { id: 'head', label: '头部', labelEn: 'Head' },
  { id: 'system', label: '系统', labelEn: 'System' },
];

export const SERVO_TYPES_FOR_TRIM = SERVOS.map((servo) => ({
  value: servo.servoType,
  label: servo.label,
  labelEn: servo.labelEn,
}));

export function buildToolCall(actionId, params = {}) {
  const meta = ACTIONS.find((item) => item.id === actionId) || ACTIONS[ACTIONS.length - 1];
  const needs = new Set(meta.needs || []);
  const args = { ...meta.args };
  const steps = Number(params.steps);
  const speed = Number(params.speed);
  const amount = Number(params.amount);
  const angle = Number(params.angle);
  if (needs.has('steps')) args.steps = clamp(Math.round(Number.isFinite(steps) ? steps : 1), 1, 10);
  if (needs.has('speed')) args.speed = clamp(Math.round(Number.isFinite(speed) ? speed : 1000), 500, 1500);
  if (needs.has('amount')) args.amount = clamp(Math.round(Number.isFinite(amount) ? amount : 30), 10, 50);
  if (needs.has('angle')) args.angle = meta.category === 'head'
    ? clamp(Math.round(Number.isFinite(angle) ? angle : 8), 1, 15)
    : clamp(Math.round(Number.isFinite(angle) ? angle : 45), 0, 90);
  if ((meta.tool === 'self.electron.head_move' || meta.tool === 'self.electron.body_turn') && !('steps' in args)) {
    args.steps = 1;
  }
  if ((meta.tool === 'self.electron.head_move' || meta.tool === 'self.electron.body_turn') && !('speed' in args)) {
    args.speed = clamp(Math.round(Number(params.speed) || 1000), 500, 1500);
  }
  if (meta.tool === 'self.electron.head_move' && !('angle' in args)) args.angle = 5;
  if (meta.tool === 'self.electron.body_turn' && !('angle' in args)) args.angle = 0;
  return { tool: meta.tool, args };
}

export function createMoveFrame(pose = HOME_POSE, opts = {}) {
  return {
    id: Math.random().toString(36).slice(2, 9),
    type: 'move',
    pose: SERVO_KEYS.reduce((acc, key) => ({ ...acc, [key]: clampServo(key, pose[key] ?? HOME_POSE[key]) }), {}),
    enabled: opts.enabled || SERVO_KEYS.reduce((acc, key) => ({ ...acc, [key]: true }), {}),
    v: opts.v ?? 600,
    d: opts.d ?? 160,
  };
}

export function createOscFrame() {
  return {
    id: Math.random().toString(36).slice(2, 9),
    type: 'osc',
    amplitude: SERVO_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
    center: { ...HOME_POSE },
    phase: SERVO_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {}),
    p: 500,
    c: 3,
    d: 0,
  };
}

function move(patch, opts = {}) {
  return createMoveFrame({ ...HOME_POSE, ...patch }, opts);
}

function partialMove(patch, opts = {}) {
  const enabled = SERVO_KEYS.reduce((acc, key) => ({ ...acc, [key]: Object.prototype.hasOwnProperty.call(patch, key) }), {});
  return createMoveFrame({ ...HOME_POSE, ...patch }, { ...opts, enabled });
}

function firmwareHomeFrame(fromPose = HOME_POSE, opts = {}) {
  const maxDelta = SERVO_KEYS.reduce((max, key) => Math.max(max, Math.abs((fromPose[key] ?? HOME_POSE[key]) - HOME_POSE[key])), 0);
  return move(HOME_POSE, { v: clamp(500 + maxDelta * 9, 500, 1700), d: 200, ...opts });
}

function firmwareHandActionId(actionId) {
  const map = {
    hand_left_up: 1,
    hand_right_up: 2,
    hand_both_up: 3,
    hand_left_down: 4,
    hand_right_down: 5,
    hand_both_down: 6,
    hand_left_wave: 7,
    hand_right_wave: 8,
    hand_both_wave: 9,
    hand_left_flap: 10,
    hand_right_flap: 11,
    hand_both_flap: 12,
  };
  return map[actionId] || 0;
}

function buildFirmwareHandPreview(action, steps, period, amount = 30) {
  const frames = [];
  const waveCount = 2 * Math.max(3, Math.min(100, steps));
  const tick = Math.max(10, Math.round(period / 10));
  const flapAmount = Math.min(clamp(Math.round(Number(amount) || 30), 10, 50), 40);
  const leftFlapCenter = 40;
  const rightFlapCenter = 140;

  switch (action) {
    case 1:
      return [partialMove({ lp: 180 }, { v: period, d: 0 })];
    case 2:
      return [partialMove({ rp: 0 }, { v: period, d: 0 })];
    case 3:
      return [partialMove({ lp: 180, rp: 0 }, { v: period, d: 0 })];
    case 4:
      return [partialMove({ lp: 0, lr: 0 }, { v: period, d: 200 })];
    case 5:
      return [partialMove({ rp: 180, rr: 180 }, { v: period, d: 200 })];
    case 6:
      return [partialMove({ lp: 0, lr: 0, rp: 180, rr: 180 }, { v: period, d: 200 })];
    case 7:
      frames.push(partialMove({ lp: 150 }, { v: period, d: 0 }));
      for (let i = 0; i < waveCount; i += 1) frames.push(partialMove({ lp: 150 + (i % 2 === 0 ? -30 : 30) }, { v: tick, d: tick }));
      frames.push(partialMove({ lp: 0 }, { v: period, d: 200 }));
      return frames;
    case 8:
      frames.push(partialMove({ rp: 30 }, { v: period, d: 0 }));
      for (let i = 0; i < waveCount; i += 1) frames.push(partialMove({ rp: 30 + (i % 2 === 0 ? 30 : -30) }, { v: tick, d: tick }));
      frames.push(partialMove({ rp: 180 }, { v: period, d: 200 }));
      return frames;
    case 9:
      frames.push(partialMove({ lp: 150, rp: 30 }, { v: period, d: 0 }));
      for (let i = 0; i < waveCount; i += 1) {
        frames.push(partialMove({ lp: 150 + (i % 2 === 0 ? -30 : 30), rp: 30 + (i % 2 === 0 ? 30 : -30) }, { v: tick, d: tick }));
      }
      frames.push(partialMove({ lp: 0, rp: 180 }, { v: period, d: 200 }));
      return frames;
    case 10:
      frames.push(partialMove({ lr: leftFlapCenter }, { v: period, d: 0 }));
      for (let i = 0; i < waveCount; i += 1) {
        frames.push(partialMove({ lr: leftFlapCenter - flapAmount }, { v: tick, d: 0 }));
        frames.push(partialMove({ lr: leftFlapCenter + flapAmount }, { v: tick, d: 0 }));
      }
      frames.push(partialMove({ lr: 0 }, { v: period, d: 200 }));
      return frames;
    case 11:
      frames.push(partialMove({ rr: rightFlapCenter }, { v: period, d: 0 }));
      for (let i = 0; i < waveCount; i += 1) {
        frames.push(partialMove({ rr: rightFlapCenter + flapAmount }, { v: tick, d: 0 }));
        frames.push(partialMove({ rr: rightFlapCenter - flapAmount }, { v: tick, d: 0 }));
      }
      frames.push(partialMove({ rr: 180 }, { v: period, d: 200 }));
      return frames;
    case 12:
      frames.push(partialMove({ lr: leftFlapCenter, rr: rightFlapCenter }, { v: period, d: 0 }));
      for (let i = 0; i < waveCount; i += 1) {
        frames.push(partialMove({ lr: leftFlapCenter - flapAmount, rr: rightFlapCenter + flapAmount }, { v: tick, d: 0 }));
        frames.push(partialMove({ lr: leftFlapCenter + flapAmount, rr: rightFlapCenter - flapAmount }, { v: tick, d: 0 }));
      }
      frames.push(partialMove({ lr: 0, rr: 180 }, { v: period, d: 200 }));
      return frames;
    default:
      return [firmwareHomeFrame()];
  }
}

export function buildActionPreviewFrames(actionId, params = {}) {
  const speedValue = Number(params.speed);
  const angleValue = Number(params.angle);
  const stepsValue = Number(params.steps);
  const speed = clamp(Math.round(Number.isFinite(speedValue) ? speedValue : 1000), 500, 1500);
  const steps = clamp(Math.round(Number.isFinite(stepsValue) ? stepsValue : 1), 1, 10);
  const handPeriod = clamp(speed, 100, 1000);
  const bodyPeriod = clamp(speed, 500, 3000);
  const headPeriod = clamp(speed, 300, 3000);
  const angle = clamp(Math.round(Number.isFinite(angleValue) ? angleValue : 8), 0, 90);
  const headAmount = clamp(Math.round(Number.isFinite(angleValue) ? Math.abs(angleValue) : 8), 1, 15);
  const amountValue = Number(params.amount);
  const amount = clamp(Math.round(Number.isFinite(amountValue) ? amountValue : 30), 10, 50);
  const handAction = firmwareHandActionId(actionId);
  if (handAction) return buildFirmwareHandPreview(handAction, steps, handPeriod, amount);

  switch (actionId) {
    case 'body_left': {
      const target = { ...HOME_POSE, b: clampServo('b', 90 + angle) };
      return [partialMove({ b: target.b }, { v: bodyPeriod, d: 100 })];
    }
    case 'body_right': {
      const target = { ...HOME_POSE, b: clampServo('b', 90 - angle) };
      return [partialMove({ b: target.b }, { v: bodyPeriod, d: 100 })];
    }
    case 'body_center':
      return [partialMove({ b: 90 }, { v: bodyPeriod, d: 200 })];
    case 'head_up': {
      const target = { ...HOME_POSE, h: clampServo('h', 90 + headAmount) };
      return [partialMove({ h: target.h }, { v: headPeriod, d: 0 })];
    }
    case 'head_down': {
      const target = { ...HOME_POSE, h: clampServo('h', 90 - headAmount) };
      return [partialMove({ h: target.h }, { v: headPeriod, d: 0 })];
    }
    case 'head_nod_once':
      return [
        partialMove({ h: clampServo('h', 90 + headAmount) }, { v: Math.round(headPeriod / 3), d: Math.round(headPeriod / 6) }),
        partialMove({ h: clampServo('h', 90 - headAmount) }, { v: Math.round(headPeriod / 3), d: Math.round(headPeriod / 6) }),
        partialMove({ h: 90 }, { v: Math.round(headPeriod / 3), d: 0 }),
      ];
    case 'head_center':
      return [partialMove({ h: 90 }, { v: headPeriod, d: 200 })];
    case 'head_nod_repeat': {
      const frames = [];
      for (let i = 0; i < steps; i += 1) {
        frames.push(partialMove({ h: clampServo('h', 90 + headAmount) }, { v: Math.round(headPeriod / 2), d: 0 }));
        frames.push(partialMove({ h: clampServo('h', 90 - headAmount) }, { v: Math.round(headPeriod / 2), d: 50 }));
      }
      frames.push(partialMove({ h: 90 }, { v: Math.round(headPeriod / 2), d: 0 }));
      return frames;
    }
    case 'home': return [move(HOME_POSE, { v: 600 })];
    default: return [move(HOME_POSE, { v: 600 })];
  }
}

export function buildSingleMove(pose, v = 300) {
  const s = {};
  SERVO_KEYS.forEach((key) => { s[key] = clampServo(key, pose[key]); });
  return JSON.stringify({ a: [{ s, v: clamp(Math.round(v), 100, 3000) }] });
}

export function buildSequenceChunks(frames, { maxLen = 420 } = {}) {
  const chunks = [];
  let current = [];

  const flush = () => {
    if (current.length) chunks.push(JSON.stringify({ a: current }));
    current = [];
  };

  const toObj = (frame) => {
    if (frame.type === 'osc') {
      const osc = {};
      const amp = {};
      const off = {};
      const ph = {};
      SERVO_KEYS.forEach((key) => {
        const servo = SERVO_BY_KEY[key];
        const center = clampServo(key, frame.center[key]);
        const maxAmplitude = Math.max(0, Math.min(center - servo.min, servo.max - center, 90));
        const amplitude = clamp(Math.round(Number(frame.amplitude[key]) || 0), 0, maxAmplitude);
        if (amplitude > 0) {
          amp[key] = amplitude;
          off[key] = center;
          if (frame.phase[key]) ph[key] = clamp(Math.round(Number(frame.phase[key]) || 0), 0, 360);
        }
      });
      if (Object.keys(amp).length) osc.a = amp;
      if (Object.keys(off).length) osc.o = off;
      if (Object.keys(ph).length) osc.ph = ph;
      osc.p = clamp(Math.round(Number(frame.p) || 500), 100, 3000);
      osc.c = Math.round(clamp(Number(frame.c) || 1, 0.1, 20) * 10) / 10;
      const obj = { osc };
      if (frame.d > 0) obj.d = Math.round(frame.d);
      return obj;
    }

    const s = {};
    SERVO_KEYS.forEach((key) => {
      if (frame.enabled[key]) s[key] = clampServo(key, frame.pose[key]);
    });
    const obj = { s, v: clamp(Math.round(Number(frame.v) || 600), 100, 3000) };
    if (frame.d > 0) obj.d = Math.round(frame.d);
    return obj;
  };

  frames.forEach((frame) => {
    const obj = toObj(frame);
    const candidate = JSON.stringify({ a: [...current, obj] });
    if (candidate.length > maxLen && current.length) flush();
    current.push(obj);
  });
  flush();
  return chunks;
}

export const CHOREO_PRESETS = [
  {
    id: 'hello-nod',
    name: '挥手点头',
    nameEn: 'Wave and nod',
    desc: '右手打招呼，随后点头回中',
    descEn: 'Right-hand wave followed by a nod',
    build: () => [
      move({ rp: 120, rr: 125, h: 100 }, { v: 350, d: 120 }),
      move({ rp: 150, rr: 170, h: 80 }, { v: 240, d: 80 }),
      move({ rp: 120, rr: 125, h: 100 }, { v: 240, d: 120 }),
      move(HOME_POSE, { v: 520, d: 0 }),
    ],
  },
  {
    id: 'curious-scan',
    name: '好奇环顾',
    nameEn: 'Curious scan',
    desc: '身体左右扫视，头部轻微俯仰',
    descEn: 'Body scans left and right with head motion',
    build: () => [
      move({ b: 55, h: 102 }, { v: 650, d: 120 }),
      move({ b: 125, h: 82 }, { v: 750, d: 120 }),
      move({ b: 90, h: 90 }, { v: 550, d: 0 }),
    ],
  },
  {
    id: 'happy-sway',
    name: '开心摇摆',
    nameEn: 'Happy sway',
    desc: '双手举起，身体左右晃动，头部轻快俯仰',
    descEn: 'Hands up with a body sway and light head motion',
    build: () => [
      move({ lp: 165, rp: 15, b: 70, h: 102 }, { v: 360, d: 70 }),
      move({ lp: 135, rp: 45, b: 112, h: 82 }, { v: 300, d: 70 }),
      move({ lp: 178, rp: 2, b: 76, h: 100 }, { v: 280, d: 70 }),
      move({ lp: 145, rp: 35, b: 108, h: 86 }, { v: 280, d: 120 }),
      move(HOME_POSE, { v: 520, d: 0 }),
    ],
  },
  {
    id: 'victory-cheer',
    name: '胜利庆祝',
    nameEn: 'Victory cheer',
    desc: '双手高举，左右庆祝两次后回正',
    descEn: 'Both hands cheer left and right, then return home',
    build: () => [
      move({ lp: 180, rp: 0, lr: 35, rr: 145, b: 72, h: 104 }, { v: 360, d: 100 }),
      move({ lp: 145, rp: 35, lr: 0, rr: 180, b: 112, h: 96 }, { v: 280, d: 80 }),
      move({ lp: 180, rp: 0, lr: 45, rr: 135, b: 68, h: 104 }, { v: 280, d: 100 }),
      move({ lp: 150, rp: 30, b: 108, h: 92 }, { v: 260, d: 140 }),
      move(HOME_POSE, { v: 540, d: 0 }),
    ],
  },
  {
    id: 'shy-peek',
    name: '害羞偷看',
    nameEn: 'Shy peek',
    desc: '低头侧身，短暂探出再缩回',
    descEn: 'Looks down, leans aside, peeks out, then hides back',
    build: () => [
      move({ b: 62, h: 78, lp: 52, rp: 128 }, { v: 520, d: 120 }),
      move({ b: 86, h: 84, lp: 82, rp: 98 }, { v: 260, d: 110 }),
      move({ b: 58, h: 78, lp: 45, rp: 136 }, { v: 320, d: 150 }),
      move({ b: 90, h: 90, lp: 20, rp: 160 }, { v: 360, d: 120 }),
      move(HOME_POSE, { v: 480, d: 0 }),
    ],
  },
  {
    id: 'relay-wave',
    name: '左右接力',
    nameEn: 'Relay wave',
    desc: '左手右手轮流举起，像在接力打招呼',
    descEn: 'Left and right hands take turns waving hello',
    build: () => [
      move({ lp: 175, rp: 180, b: 70, h: 98 }, { v: 300, d: 80 }),
      move({ lp: 0, rp: 5, b: 110, h: 82 }, { v: 320, d: 80 }),
      move({ lp: 170, rp: 180, b: 75, h: 100 }, { v: 300, d: 80 }),
      move({ lp: 0, rp: 10, b: 105, h: 84 }, { v: 300, d: 140 }),
      move(HOME_POSE, { v: 520, d: 0 }),
    ],
  },
];
