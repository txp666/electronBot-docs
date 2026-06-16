import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActionIcon from './ActionIcon';
import ElectronSimulator from './ElectronSimulator';
import PresetIcon from './PresetIcon';
import { getMessages, pick } from './messages';
import {
  ACTION_GROUPS,
  ACTIONS,
  CHOREO_PRESETS,
  HOME_POSE,
  SERVOS,
  SERVO_KEYS,
  SERVO_TYPES_FOR_TRIM,
  WS_PATH,
  WS_PORT,
  buildActionPreviewFrames,
  buildSequenceChunks,
  buildSingleMove,
  buildToolCall,
  clamp,
  clampServo,
  createMoveFrame,
  createOscFrame,
} from './constants';
import styles from './styles.module.css';

const LS_IP = 'electron-debug-ip';
const LS_CHOREOS = 'electron-debug-choreos';
const LS_SIM_COLORS = 'electron-debug-sim-colors';
const LS_EXPRESSION = 'electron-debug-expression';
const LS_APPEARANCE_OPEN = 'electron-debug-appearance-open';
const COMMUNITY_CHOREOS_URL = '/files/community-choreos.json';
const COMMUNITY_SUBMIT_REPO = 'txp666/electronBot-docs';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
const COLOR_FIELDS = [
  { key: 'head', label: '头部黑色' },
  { key: 'body', label: '身体黑色' },
  { key: 'shell', label: '外壳白色' },
  { key: 'arms', label: '手臂外侧' },
  { key: 'armInner', label: '手臂内侧' },
  { key: 'base', label: '底座上层' },
  { key: 'baseBottom', label: '底座下层' },
  { key: 'screen', label: '屏幕底色' },
  { key: 'background', label: '背景' },
];
const EXPRESSIONS = [
  { value: 'staticstate', label: '默认', url: '/files/gifs/staticstate.gif' },
  { value: 'happy', label: '开心', url: '/files/gifs/happy.gif' },
  { value: 'sad', label: '悲伤', url: '/files/gifs/sad.gif' },
  { value: 'anger', label: '生气', url: '/files/gifs/anger.gif' },
  { value: 'scare', label: '害怕', url: '/files/gifs/scare.gif' },
  { value: 'buxue', label: '不屑', url: '/files/gifs/buxue.gif' },
];
const PARAM_CONFIGS = [
  { k: 'steps', min: 1, max: 10, step: 1 },
  { k: 'speed', min: 500, max: 1500, step: 50 },
  { k: 'amount', min: 10, max: 50, step: 1 },
  { k: 'angle', min: 0, max: 90, step: 1 },
];

function readStore(key) {
  if (typeof window === 'undefined') return null;
  try {
    if (window.localStorage) return window.localStorage.getItem(key);
  } catch (e) {}
  try {
    const encodedKey = encodeURIComponent(key) + '=';
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(encodedKey));
    return cookie ? decodeURIComponent(cookie.slice(encodedKey.length)) : null;
  } catch (e) {
    return null;
  }
}

function writeStore(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch (e) {}
  try {
    document.cookie = encodeURIComponent(key) + '=' + encodeURIComponent(value) + '; path=/; max-age=' + COOKIE_MAX_AGE + '; SameSite=Lax';
  } catch (e) {}
}

function resultText(data) {
  if (!data || !data.result) return '';
  if (typeof data.result === 'string') return data.result;
  if (data.result.content && data.result.content[0] && typeof data.result.content[0].text === 'string') {
    return data.result.content[0].text;
  }
  return '';
}

function normalizeFrames(value) {
  const frames = Array.isArray(value) ? value : value && Array.isArray(value.frames) ? value.frames : null;
  if (!frames) return null;
  return frames.filter((frame) => frame && (frame.type === 'move' || frame.type === 'osc'));
}

function makeSharedChoreo({ title, author, description, frames }) {
  const now = new Date().toISOString();
  const cleanTitle = String(title || '').trim() || `ElectronBot 动作 ${now.slice(0, 10)}`;
  const cleanAuthor = String(author || '').trim() || 'ElectronBot 用户';
  return {
    id: `${cleanTitle}-${cleanAuthor}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72),
    robot: 'electronbot',
    title: cleanTitle,
    author: cleanAuthor,
    description: String(description || '').trim(),
    createdAt: now,
    frames,
  };
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseSimColors(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return COLOR_FIELDS.reduce((acc, field) => {
      const value = parsed[field.key];
      acc[field.key] = typeof value === 'string' ? value : DEFAULT_SIM_COLORS[field.key];
      return acc;
    }, {});
  } catch (e) {
    return null;
  }
}

export default function ElectronDebugger({ lang = 'zh' }) {
  const t = useMemo(() => getMessages(lang), [lang]);
  const [ip, setIp] = useState('192.168.4.1');
  const [status, setStatus] = useState('disconnected');
  const [serverInfo, setServerInfo] = useState(null);
  const [isSecure, setIsSecure] = useState(false);
  const [pose, setPose] = useState({ ...HOME_POSE });
  const [transitionMs, setTransitionMs] = useState(180);
  const [liveMode, setLiveMode] = useState(false);
  const [params, setParams] = useState({ steps: 1, speed: 1000, amount: 30, angle: 8 });
  const [activeAction, setActiveAction] = useState('hand_both_up');
  const [actionGroup, setActionGroup] = useState('all');
  const [trimServo, setTrimServo] = useState('right_pitch');
  const [trims, setTrims] = useState(null);
  const [frames, setFrames] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [loopPlay, setLoopPlay] = useState(false);
  const [battery, setBattery] = useState(null);
  const [robotStatus, setRobotStatus] = useState(null);
  const [log, setLog] = useState([]);
  const [savedNames, setSavedNames] = useState([]);
  const [tab, setTab] = useState('presets');
  const [simColors, setSimColors] = useState({ ...DEFAULT_SIM_COLORS });
  const [expression, setExpression] = useState('staticstate');
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  const [shareTitle, setShareTitle] = useState('');
  const [shareAuthor, setShareAuthor] = useState('');
  const [shareDescription, setShareDescription] = useState('');
  const [communityItems, setCommunityItems] = useState([]);
  const [communityStatus, setCommunityStatus] = useState('');

  const wsRef = useRef(null);
  const idRef = useRef(1);
  const pendingRef = useRef({});
  const liveThrottleRef = useRef(0);
  const playAbortRef = useRef(false);
  const prefsReadyRef = useRef(false);

  const addLog = useCallback((dir, text) => {
    setLog((prev) => [...prev, { t: Date.now(), dir, text }].slice(-180));
  }, []);

  const refreshSavedNames = () => {
    try {
      const data = JSON.parse(readStore(LS_CHOREOS) || '{}');
      setSavedNames(Object.keys(data));
    } catch (e) {
      setSavedNames([]);
    }
  };

  const refreshCommunityItems = async () => {
    try {
      setCommunityStatus('');
      const response = await fetch(COMMUNITY_CHOREOS_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
      setCommunityItems(items.filter((item) => item && normalizeFrames(item)).slice(0, 200));
    } catch (e) {
      setCommunityItems([]);
      setCommunityStatus('load-failed');
    }
  };

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    writeStore(LS_SIM_COLORS, JSON.stringify(simColors));
  }, [simColors]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    writeStore(LS_EXPRESSION, expression);
  }, [expression]);

  useEffect(() => {
    if (!prefsReadyRef.current) return;
    writeStore(LS_APPEARANCE_OPEN, appearanceOpen ? '1' : '0');
  }, [appearanceOpen]);

  useEffect(() => {
    setIsSecure(typeof window !== 'undefined' && window.location.protocol === 'https:');
    const saved = readStore(LS_IP);
    if (saved) setIp(saved);
    const savedColors = parseSimColors(readStore(LS_SIM_COLORS));
    if (savedColors) setSimColors(savedColors);
    const savedExpression = readStore(LS_EXPRESSION);
    if (savedExpression && EXPRESSIONS.some((item) => item.value === savedExpression)) setExpression(savedExpression);
    const savedAppearanceOpen = readStore(LS_APPEARANCE_OPEN);
    if (savedAppearanceOpen === '0') setAppearanceOpen(false);
    prefsReadyRef.current = true;
    refreshSavedNames();
    refreshCommunityItems();
    return () => {
      playAbortRef.current = true;
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const send = useCallback((method, params2, purpose) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return null;
    const id = idRef.current++;
    pendingRef.current[id] = purpose || method;
    const str = JSON.stringify({ jsonrpc: '2.0', id, method, params: params2 || {} });
    ws.send(str);
    addLog('out', str);
    return id;
  }, [addLog]);

  const callTool = useCallback((name, args, purpose) => {
    return send('tools/call', { name, arguments: args || {} }, purpose || name);
  }, [send]);

  const handleResponse = useCallback((raw) => {
    let data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    const purpose = data.id != null ? pendingRef.current[data.id] : null;
    if (data.id != null) delete pendingRef.current[data.id];
    if (purpose === 'init' && data.result && data.result.serverInfo) {
      setServerInfo(data.result.serverInfo);
      return;
    }
    const text = resultText(data);
    if (purpose === 'trims' && text) {
      try { setTrims(JSON.parse(text)); } catch (e) {}
    } else if (purpose === 'battery' && text) {
      try { setBattery(JSON.parse(text)); } catch (e) {}
    } else if (purpose === 'status' && text) {
      setRobotStatus(text);
    } else if (purpose === 'ip' && text) {
      addLog('sys', text);
    }
  }, [addLog]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
    }
    const url = 'ws://' + ip + ':' + WS_PORT + WS_PATH;
    setStatus('connecting');
    addLog('sys', t.logConnecting(url));
    writeStore(LS_IP, ip);
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      setStatus('error');
      addLog('err', t.logCreateFail(e.message));
      return;
    }
    wsRef.current = ws;
    ws.onopen = () => {
      setStatus('connected');
      addLog('sys', t.logConnected);
      send('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'electronbot-web-debugger', version: '1.0' } }, 'init');
      setTimeout(() => callTool('self.electron.get_trims', {}, 'trims'), 200);
      setTimeout(() => callTool('self.battery.get_level', {}, 'battery'), 400);
    };
    ws.onclose = () => {
      setStatus((s) => (s === 'error' ? s : 'disconnected'));
      setBattery(null);
      setRobotStatus(null);
      addLog('sys', t.logClosed);
    };
    ws.onerror = () => {
      setStatus('error');
      addLog('err', t.logError);
    };
    ws.onmessage = (evt) => {
      addLog('in', evt.data);
      handleResponse(evt.data);
    };
  }, [ip, addLog, t, send, callTool, handleResponse]);

  const disconnect = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }
    setStatus('disconnected');
    setBattery(null);
    setRobotStatus(null);
  };

  const connected = status === 'connected';
  const availableActions = useMemo(() => ACTIONS.filter((action) => actionGroup === 'all' || action.category === actionGroup), [actionGroup]);
  const activeActionMeta = useMemo(() => ACTIONS.find((action) => action.id === activeAction) || ACTIONS[0], [activeAction]);
  const activeNeeds = useMemo(() => new Set(activeActionMeta.needs || []), [activeActionMeta]);
  const selectedFrame = useMemo(() => frames.find((frame) => frame.id === selectedId) || null, [frames, selectedId]);
  const seqPreview = useMemo(() => (frames.length ? buildSequenceChunks(frames) : []), [frames]);
  const activeExpression = useMemo(() => EXPRESSIONS.find((item) => item.value === expression) || EXPRESSIONS[0], [expression]);

  const sendLivePose = useCallback((key, value) => {
    if (!connected || !liveMode) return;
    const now = Date.now();
    if (now - liveThrottleRef.current < 120) return;
    liveThrottleRef.current = now;
    const servo = SERVOS.find((item) => item.key === key);
    if (servo) callTool('self.electron.servo_move', { servo_type: servo.servoType, position: clampServo(key, value), speed: 250 }, 'live');
  }, [connected, liveMode, callTool]);

  const updateServo = (key, value) => {
    setTransitionMs(80);
    const nextValue = clampServo(key, value);
    setPose((prev) => ({ ...prev, [key]: nextValue }));
    sendLivePose(key, nextValue);
  };

  const resetPose = () => {
    setTransitionMs(300);
    setPose({ ...HOME_POSE });
    if (connected) callTool('self.electron.home', {}, 'home');
  };

  const mirrorPose = () => {
    setTransitionMs(200);
    setPose((prev) => ({
      rp: clampServo('rp', 180 - prev.lp),
      rr: clampServo('rr', 180 - prev.lr),
      lp: clampServo('lp', 180 - prev.rp),
      lr: clampServo('lr', 180 - prev.rr),
      b: clampServo('b', 180 - prev.b),
      h: prev.h,
    }));
  };

  const randomPose = () => {
    setTransitionMs(250);
    const next = {};
    SERVOS.forEach((servo) => {
      next[servo.key] = servo.min + Math.round(Math.random() * (servo.max - servo.min));
    });
    setPose(next);
  };

  const updateSimColor = (key, value) => {
    setSimColors((prev) => ({ ...prev, [key]: value }));
  };

  const resetAppearance = () => {
    setSimColors({ ...DEFAULT_SIM_COLORS });
    setExpression('staticstate');
  };

  const playFramesLocal = useCallback(async (sourceFrames, shouldLoop = false) => {
    if (!sourceFrames.length || playing) return;
    const waitLocal = async (ms) => {
      const end = Date.now() + Math.max(0, ms);
      while (Date.now() < end && !playAbortRef.current) await sleep(Math.min(30, end - Date.now()));
    };
    setPlaying(true);
    playAbortRef.current = false;
    let current = { ...pose };
    do {
      for (const frame of sourceFrames) {
        if (playAbortRef.current) break;
        if (frame.type === 'move') {
          const target = { ...current };
          SERVO_KEYS.forEach((key) => {
            if (frame.enabled[key]) target[key] = clampServo(key, frame.pose[key]);
          });
          current = target;
          setTransitionMs(frame.v);
          setPose(target);
          await waitLocal(frame.v + (frame.d || 0));
        } else {
          const target = { ...current };
          SERVO_KEYS.forEach((key) => {
            if (frame.amplitude[key] > 0) target[key] = clampServo(key, frame.center[key]);
          });
          current = target;
          setTransitionMs(180);
          setPose(target);
          await waitLocal(clamp(Number(frame.p) || 500, 100, 3000) * clamp(Number(frame.c) || 1, 0.1, 20) + (frame.d || 0));
        }
      }
    } while (shouldLoop && !playAbortRef.current);
    setPlaying(false);
  }, [playing, pose]);

  const stopLocal = () => {
    playAbortRef.current = true;
    setPlaying(false);
  };

  const syncAndSendAction = useCallback((actionId, actionParams, purpose) => {
    const { tool, args } = buildToolCall(actionId, actionParams);
    setActiveAction(actionId);
    playFramesLocal(buildActionPreviewFrames(actionId, args), false);
    callTool(tool, args, purpose || actionId);
  }, [callTool, playFramesLocal]);

  const previewAction = (actionId) => {
    const { args } = buildToolCall(actionId, params);
    setActiveAction(actionId);
    playFramesLocal(buildActionPreviewFrames(actionId, args), false);
  };

  const runAction = (actionId) => {
    if (!connected) { addLog('err', t.logNeedConnect); return; }
    syncAndSendAction(actionId, params, actionId);
  };

  const stopAll = () => {
    playAbortRef.current = true;
    setPlaying(false);
    setTransitionMs(300);
    setPose({ ...HOME_POSE });
    if (!connected) return;
    callTool('self.electron.stop', {}, 'stop');
  };

  const sendChoreography = useCallback(async () => {
    if (!connected) { addLog('err', t.logNeedConnect); return; }
    const chunks = buildSequenceChunks(frames);
    addLog('sys', t.logSendSeq(frames.length, chunks.length));
    playFramesLocal(frames, false);
    for (const chunk of chunks) {
      callTool('self.electron.servo_sequences', { sequence: chunk }, 'seq');
      await sleep(120);
    }
  }, [connected, frames, callTool, addLog, t, playFramesLocal]);

  const applyTrim = (value) => {
    if (!connected) return;
    callTool('self.electron.set_trim', { servo_type: trimServo, trim_value: clamp(value, -30, 30) }, 'set_trim');
    setTimeout(() => callTool('self.electron.get_trims', {}, 'trims'), 600);
  };

  const resetTrims = () => {
    if (!connected) return;
    if (!window.confirm(t.resetTrimsConfirm)) return;
    SERVO_TYPES_FOR_TRIM.forEach((servo, index) => {
      setTimeout(() => callTool('self.electron.set_trim', { servo_type: servo.value, trim_value: 0 }, 'set_trim'), index * 120);
    });
    setTrims(SERVO_TYPES_FOR_TRIM.reduce((acc, servo) => ({ ...acc, [servo.value]: 0 }), {}));
    setTimeout(() => callTool('self.electron.get_trims', {}, 'trims'), SERVO_TYPES_FOR_TRIM.length * 120 + 400);
    setTimeout(() => callTool('self.electron.home', {}, 'home'), SERVO_TYPES_FOR_TRIM.length * 120 + 200);
  };

  const addMoveFrame = () => {
    const frame = createMoveFrame(pose);
    setFrames((prev) => [...prev, frame]);
    setSelectedId(frame.id);
  };
  const addOscFrame = () => {
    const frame = createOscFrame();
    setFrames((prev) => [...prev, frame]);
    setSelectedId(frame.id);
  };
  const updateFrame = (id, patch) => setFrames((prev) => prev.map((frame) => (frame.id === id ? { ...frame, ...patch } : frame)));
  const deleteFrame = (id) => {
    setFrames((prev) => prev.filter((frame) => frame.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const duplicateFrame = (id) => setFrames((prev) => {
    const index = prev.findIndex((frame) => frame.id === id);
    if (index < 0) return prev;
    const copy = { ...prev[index], id: Math.random().toString(36).slice(2, 9) };
    const next = [...prev];
    next.splice(index + 1, 0, copy);
    return next;
  });
  const moveFrame = (id, dir) => setFrames((prev) => {
    const index = prev.findIndex((frame) => frame.id === id);
    const nextIndex = index + dir;
    if (index < 0 || nextIndex < 0 || nextIndex >= prev.length) return prev;
    const next = [...prev];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });

  const saveNamed = () => {
    if (!frames.length) return;
    const name = window.prompt(t.promptSaveName, 'electronbot-' + new Date().toISOString().slice(0, 10));
    if (!name) return;
    const data = JSON.parse(readStore(LS_CHOREOS) || '{}');
    data[name] = frames;
    writeStore(LS_CHOREOS, JSON.stringify(data));
    refreshSavedNames();
  };
  const loadNamed = (name) => {
    const data = JSON.parse(readStore(LS_CHOREOS) || '{}');
    if (Array.isArray(data[name])) {
      setFrames(data[name]);
      setSelectedId(null);
      setTab('choreo');
    }
  };
  const deleteNamed = (name) => {
    const data = JSON.parse(readStore(LS_CHOREOS) || '{}');
    delete data[name];
    writeStore(LS_CHOREOS, JSON.stringify(data));
    refreshSavedNames();
  };
  const exportJson = () => downloadJson('electronbot-choreography.json', { robot: 'electronbot', frames });
  const importJson = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const imported = normalizeFrames(data);
      if (!imported) throw new Error('invalid frames');
      setFrames(imported);
      setSelectedId(null);
      setTab('choreo');
    } catch (e) {
      addLog('err', t.logImportFail);
    } finally {
      event.target.value = '';
    }
  };

  const buildCurrentSharedChoreo = () => makeSharedChoreo({
    title: shareTitle,
    author: shareAuthor,
    description: shareDescription,
    frames,
  });

  const exportSharedChoreo = () => {
    if (!frames.length) return;
    const item = buildCurrentSharedChoreo();
    downloadJson(`${item.id || 'electronbot-choreography'}.json`, item);
  };

  const submitSharedChoreo = () => {
    if (!frames.length) return;
    const item = buildCurrentSharedChoreo();
    const pretty = JSON.stringify(item, null, 2);
    const body = [
      'Please review this ElectronBot choreography and add it to static/files/community-choreos.json.',
      '',
      '```json',
      pretty,
      '```',
    ].join('\n');
    downloadJson(`${item.id || 'electronbot-choreography'}.json`, item);
    const url = `https://github.com/${COMMUNITY_SUBMIT_REPO}/issues/new?title=${encodeURIComponent(`[Choreo] ${item.title}`)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const importSharedJson = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const imported = normalizeFrames(data);
      if (!imported) throw new Error('invalid frames');
      setFrames(imported);
      setSelectedId(null);
      setTab('choreo');
      if (data && !Array.isArray(data)) {
        if (data.title) setShareTitle(data.title);
        if (data.author) setShareAuthor(data.author);
        if (data.description) setShareDescription(data.description);
      }
    } catch (e) {
      addLog('err', t.logImportFail);
    } finally {
      event.target.value = '';
    }
  };

  const loadCommunityChoreo = (item) => {
    const sharedFrames = normalizeFrames(item);
    if (!sharedFrames) return;
    setFrames(sharedFrames);
    setSelectedId(null);
    setTab('choreo');
  };

  const previewCommunityChoreo = (item) => {
    const sharedFrames = normalizeFrames(item);
    if (sharedFrames) playFramesLocal(sharedFrames, false);
  };

  const sendCommunityChoreo = async (item) => {
    if (!connected) { addLog('err', t.logNeedConnect); return; }
    const sharedFrames = normalizeFrames(item);
    if (!sharedFrames) return;
    const chunks = buildSequenceChunks(sharedFrames);
    addLog('sys', t.logSendSeq(sharedFrames.length, chunks.length));
    playFramesLocal(sharedFrames, false);
    for (const chunk of chunks) {
      callTool('self.electron.servo_sequences', { sequence: chunk }, 'seq');
      await sleep(120);
    }
  };

  const statusText = {
    disconnected: t.statusDisconnected,
    connecting: t.statusConnecting,
    connected: t.statusConnected,
    error: t.statusError,
  }[status];

  return (
    <div className={styles.app}>
      {isSecure && <div className={styles.warn}>{t.mixedContent}</div>}
      <div className={styles.topbar}>
        <div className={styles.connRow}>
          <span className={styles['dot_' + status]} />
          <span className={styles.connLabel}>{statusText}</span>
          <input className={styles.ipInput} value={ip} placeholder={t.ipPlaceholder} onChange={(e) => setIp(e.target.value.trim())} />
          {connected ? <button className={styles.btnGhost} onClick={disconnect}>{t.disconnect}</button> : <button className={styles.btnPrimary} onClick={connect}>{t.connect}</button>}
          {serverInfo && <span className={styles.fw}>{serverInfo.name || 'MCP'} {serverInfo.version || ''}</span>}
          {battery && <span className={styles.fw}>{t.batteryLabel}: {battery.level}%{battery.charging ? ' · charging' : ''}</span>}
        </div>
        <div className={styles.hint}>{t.serviceHint}</div>
      </div>

      <div className={styles.grid}>
        <div className={styles.left}>
          <div className={styles.modelCard}>
            <div className={styles.modelHead}>
              <span>{t.modelTitle}</span>
              <span className={styles.modelBadge}>ElectronBot</span>
            </div>
            <div className={styles.modelStage}>
              <ElectronSimulator pose={pose} transitionMs={transitionMs} colors={simColors} faceTextureUrl={activeExpression.url} />
            </div>
            <div className={styles.modelBar}>
              <label className={styles.check}><input type="checkbox" checked={liveMode} onChange={(e) => setLiveMode(e.target.checked)} /> {t.liveSync}</label>
              <div className={styles.modelBtns}>
                <button className={styles.btnGhost} onClick={mirrorPose}>{t.mirror}</button>
                <button className={styles.btnGhost} onClick={randomPose}>{t.random}</button>
                <button className={styles.btnGhost} onClick={resetPose}>{t.reset}</button>
              </div>
            </div>
          </div>

          <details className={`${styles.panel} ${styles.appearanceCard}`} open={appearanceOpen} onToggle={(e) => setAppearanceOpen(e.currentTarget.open)}>
            <summary className={styles.cardTitle}>
              <span>外观与表情</span>
              <button type="button" className={styles.btnGhostSm} onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetAppearance(); }}>重置</button>
            </summary>
            <div className={styles.colorGrid}>
              <label className={`${styles.colorField} ${styles.expressionField}`}>
                <span>表情</span>
                <select value={expression} onChange={(e) => setExpression(e.target.value)}>
                  {EXPRESSIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              {COLOR_FIELDS.map((field) => (
                <label key={field.key} className={styles.colorField}>
                  <span>{field.label}</span>
                  <input type="color" value={simColors[field.key] || DEFAULT_SIM_COLORS[field.key]} onChange={(e) => updateSimColor(field.key, e.target.value)} />
                </label>
              ))}
            </div>
            <div className={styles.saveHint}>颜色和表情会保存在本机浏览器。</div>
          </details>

          <div className={styles.servoCard}>
            <div className={styles.cardTitle}>{t.servos}</div>
            {SERVOS.map((servo) => (
              <div key={servo.key} className={styles.servoRow}>
                <div className={styles.servoLabel}>{pick(lang, servo.label, servo.labelEn)} <code>{servo.short}</code></div>
                <input className={styles.slider} type="range" min={servo.min} max={servo.max} value={pose[servo.key]} onChange={(e) => updateServo(servo.key, Number(e.target.value))} />
                <span className={styles.servoVal}>{pose[servo.key]}°</span>
                <div className={styles.servoDesc}>{pick(lang, servo.desc, servo.descEn)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.tabs}>
            {[
              ['presets', t.tabPresets],
              ['choreo', t.tabChoreo],
              ['share', '用户分享'],
              ['calib', t.tabCalib],
            ].map(([id, label]) => (
              <button key={id} className={tab === id ? styles.tabActive : styles.tab} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          {tab === 'presets' && (
            <div className={styles.panel}>
              <div className={styles.paramHeader}>{t.actionParams}</div>
              <div className={styles.filterRow}>
                <span>{t.filter}</span>
                {ACTION_GROUPS.map((group) => (
                  <button key={group.id} className={actionGroup === group.id ? styles.filterActive : styles.filterBtn} onClick={() => setActionGroup(group.id)}>
                    {pick(lang, group.label, group.labelEn)}
                  </button>
                ))}
              </div>
              <div className={styles.paramGrid}>
                {PARAM_CONFIGS.filter((config) => activeNeeds.has(config.k)).map((config) => (
                  <ParamControl key={config.k} label={{ steps: t.pSteps, speed: t.pSpeed, amount: t.pAmount, angle: t.pAngle }[config.k]} min={config.k === 'angle' && activeActionMeta.category === 'head' ? 1 : config.min} max={config.k === 'angle' && activeActionMeta.category === 'head' ? 15 : config.max} step={config.step} value={params[config.k]} onChange={(value) => setParams((prev) => ({ ...prev, [config.k]: value }))} />
                ))}
                {!activeNeeds.size && <div className={styles.paramEmpty}>{t.noActionParams}</div>}
              </div>
              <div className={styles.actionGrid}>
                {availableActions.map((action) => (
                  <div key={action.id} className={(activeAction === action.id ? styles.actionCardActive : styles.actionCard)}>
                    <button className={styles.actionPreviewBtn} disabled={playing} onClick={() => previewAction(action.id)}>
                      <span className={styles.actionIcon}><ActionIcon id={action.icon} /></span>
                      <span>{pick(lang, action.label, action.labelEn)}</span>
                    </button>
                    <button className={styles.actionRunBtn} disabled={!connected} onClick={() => runAction(action.id)}>{t.sendRobot}</button>
                  </div>
                ))}
              </div>
              <div className={styles.quickRow}>
                <button className={styles.btnGhost} disabled={!playing} onClick={stopLocal}>{t.stopPreview}</button>
                <button className={styles.btnDanger} disabled={!connected} onClick={stopAll}>{t.stopReset}</button>
                <button className={styles.btnGhost} disabled={!connected} onClick={() => callTool('self.electron.get_status', {}, 'status')}>{t.queryStatus}</button>
                <button className={styles.btnGhost} disabled={!connected} onClick={() => callTool('self.electron.get_ip', {}, 'ip')}>{t.queryIp}</button>
                {robotStatus && <span className={styles.fw}>{t.statusLabel}: {robotStatus}</span>}
              </div>
              <div className={styles.cardTitleSpaced}>{t.presetLib}</div>
              <div className={styles.presetGrid}>
                {CHOREO_PRESETS.map((preset) => (
                  <div key={preset.id} className={styles.presetCard}>
                    <div className={styles.presetHead}>
                      <span className={styles.presetIcon}><PresetIcon id={preset.id} /></span>
                      <span className={styles.presetName}>{pick(lang, preset.name, preset.nameEn)}</span>
                    </div>
                    <div className={styles.presetDesc}>{pick(lang, preset.desc, preset.descEn)}</div>
                    <button className={styles.btnGhost} onClick={() => { setFrames(preset.build()); setSelectedId(null); setTab('choreo'); }}>{t.loadPreset}</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'calib' && (
            <div className={styles.panel}>
              <div className={styles.cardTitle}>{t.trimTitle}</div>
              <p className={styles.muted}>{t.trimIntro}</p>
              <div className={styles.calibRow}>
                <select value={trimServo} onChange={(e) => setTrimServo(e.target.value)}>
                  {SERVO_TYPES_FOR_TRIM.map((servo) => <option key={servo.value} value={servo.value}>{pick(lang, servo.label, servo.labelEn)}</option>)}
                </select>
                <input type="range" min="-30" max="30" value={trims ? (trims[trimServo] ?? 0) : 0} disabled={!connected} onChange={(e) => setTrims((prev) => ({ ...(prev || {}), [trimServo]: Number(e.target.value) }))} onMouseUp={(e) => applyTrim(Number(e.target.value))} onTouchEnd={(e) => applyTrim(Number(e.target.value))} className={styles.slider} />
                <span className={styles.servoVal}>{trims ? (trims[trimServo] ?? 0) : 0}°</span>
              </div>
              <div className={styles.quickRow}>
                <button className={styles.btnGhost} disabled={!connected} onClick={() => callTool('self.electron.get_trims', {}, 'trims')}>{t.readTrims}</button>
                <button className={styles.btnDanger} disabled={!connected} onClick={resetTrims}>{t.resetTrims}</button>
              </div>
              {trims && (
                <div className={styles.trimGrid}>
                  {SERVO_TYPES_FOR_TRIM.map((servo) => <div key={servo.value} className={styles.trimItem}><span>{pick(lang, servo.label, servo.labelEn)}</span><b>{trims[servo.value] ?? 0}°</b></div>)}
                </div>
              )}
            </div>
          )}

          {tab === 'choreo' && (
            <div className={styles.panel}>
              <div className={styles.choreoToolbar}>
                <button className={styles.btnPrimary} onClick={addMoveFrame}>{t.addMove}</button>
                <button className={styles.btnGhost} onClick={addOscFrame}>{t.addOsc}</button>
                {playing ? <button className={styles.btnDanger} onClick={stopLocal}>{t.stopPreview}</button> : <button className={styles.btnGhost} onClick={() => playFramesLocal(frames, loopPlay)} disabled={!frames.length}>{t.preview}</button>}
                <label className={styles.check}><input type="checkbox" checked={loopPlay} onChange={(e) => setLoopPlay(e.target.checked)} /> {t.loop}</label>
                <button className={styles.btnPrimary} onClick={sendChoreography} disabled={!connected || !frames.length}>{t.sendRobot}</button>
              </div>
              <div className={styles.timeline}>
                {frames.length === 0 && <div className={styles.empty}>{t.emptyTimeline}</div>}
                {frames.map((frame, index) => (
                  <div key={frame.id} className={(selectedId === frame.id ? styles.frameSel : styles.frame) + ' ' + (frame.type === 'osc' ? styles.frameOsc : '')} onClick={() => setSelectedId(frame.id)}>
                    <div className={styles.frameIdx}>{index + 1}</div>
                    <div className={styles.frameBody}>
                      <div className={styles.frameType}>{frame.type === 'osc' ? t.frameOsc : t.frameMove}</div>
                      <div className={styles.frameMeta}>{frame.type === 'osc' ? t.period + ' ' + frame.p + 'ms x' + frame.c + ' · ' + t.delay + ' ' + frame.d + 'ms' : SERVO_KEYS.filter((key) => frame.enabled[key]).map((key) => key + frame.pose[key]).join(' ') + ' · ' + frame.v + 'ms · ' + t.delay + ' ' + frame.d + 'ms'}</div>
                    </div>
                    <div className={styles.frameOps}>
                      <button onClick={(e) => { e.stopPropagation(); moveFrame(frame.id, -1); }}>↑</button>
                      <button onClick={(e) => { e.stopPropagation(); moveFrame(frame.id, 1); }}>↓</button>
                      <button onClick={(e) => { e.stopPropagation(); duplicateFrame(frame.id); }}>⧉</button>
                      <button onClick={(e) => { e.stopPropagation(); deleteFrame(frame.id); }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
              {selectedFrame && <FrameEditor frame={selectedFrame} onChange={(patch) => updateFrame(selectedFrame.id, patch)} pose={pose} t={t} lang={lang} />}
              <div className={styles.ioRow}>
                <button className={styles.btnGhost} onClick={saveNamed} disabled={!frames.length}>{t.save}</button>
                <button className={styles.btnGhost} onClick={exportJson} disabled={!frames.length}>{t.exportJson}</button>
                <label className={styles.btnGhost} style={{ cursor: 'pointer' }}>{t.importJson}<input type="file" accept="application/json" hidden onChange={importJson} /></label>
                <button className={styles.btnGhost} onClick={() => { setFrames([]); setSelectedId(null); }} disabled={!frames.length}>{t.clear}</button>
              </div>
              {savedNames.length > 0 && (
                <div className={styles.savedRow}>
                  <span className={styles.muted}>{t.saved}:</span>
                  {savedNames.map((name) => <span key={name} className={styles.savedChip}><button onClick={() => loadNamed(name)}>{name}</button><button className={styles.chipX} onClick={() => deleteNamed(name)}>×</button></span>)}
                </div>
              )}
              {seqPreview.length > 0 && (
                <details className={styles.preview}>
                  <summary>{t.seqPreview} · {seqPreview.length}{t.seqPreviewNote}</summary>
                  {seqPreview.map((chunk, index) => <pre key={index} className={styles.code}>{chunk}</pre>)}
                </details>
              )}
            </div>
          )}

          {tab === 'share' && (
            <div className={styles.panel}>
              <div className={styles.shareHero}>
                <div>
                  <div className={styles.cardTitle}>上传用户编排</div>
                  <p className={styles.muted}>当前没有自建服务器，上传会生成 GitHub Issue。审核合并到公开 JSON 后，所有访问网站的人都会在这里看到。</p>
                </div>
                <button className={styles.btnGhost} onClick={refreshCommunityItems}>刷新列表</button>
              </div>

              <div className={styles.shareForm}>
                <label>
                  <span>动作名称</span>
                  <input value={shareTitle} onChange={(e) => setShareTitle(e.target.value)} placeholder="例如：开心摇摆" />
                </label>
                <label>
                  <span>作者</span>
                  <input value={shareAuthor} onChange={(e) => setShareAuthor(e.target.value)} placeholder="昵称" />
                </label>
                <label className={styles.shareWide}>
                  <span>说明</span>
                  <input value={shareDescription} onChange={(e) => setShareDescription(e.target.value)} placeholder="动作特点、适用场景或注意事项" />
                </label>
              </div>

              <div className={styles.quickRow}>
                <button className={styles.btnPrimary} onClick={submitSharedChoreo} disabled={!frames.length}>上传当前编排</button>
                <button className={styles.btnGhost} onClick={exportSharedChoreo} disabled={!frames.length}>导出分享文件</button>
                <label className={styles.btnGhost} style={{ cursor: 'pointer' }}>
                  导入分享文件<input type="file" accept="application/json" hidden onChange={importSharedJson} />
                </label>
                {!frames.length && <span className={styles.muted}>先在“动作编排”里创建或导入动作。</span>}
              </div>

              <div className={styles.shareDivider} />
              <div className={styles.cardTitle}>用户分享板</div>
              {communityStatus === 'load-failed' && <div className={styles.empty}>分享列表加载失败。</div>}
              {!communityStatus && communityItems.length === 0 && <div className={styles.empty}>暂时还没有公开分享动作。</div>}
              <div className={styles.shareGrid}>
                {communityItems.map((item) => {
                  const itemFrames = normalizeFrames(item) || [];
                  return (
                    <div key={item.id || item.title} className={styles.shareCard}>
                      <div className={styles.shareTitle}>{item.title || '未命名动作'}</div>
                      <div className={styles.shareMeta}>
                        <span>{item.author || '匿名'}</span>
                        <span>{itemFrames.length} 帧</span>
                      </div>
                      {item.description && <div className={styles.shareDesc}>{item.description}</div>}
                      <div className={styles.shareOps}>
                        <button className={styles.btnGhost} onClick={() => previewCommunityChoreo(item)}>{t.preview}</button>
                        <button className={styles.btnGhost} onClick={() => loadCommunityChoreo(item)}>{t.loadPreset}</button>
                        <button className={styles.btnPrimary} disabled={!connected} onClick={() => sendCommunityChoreo(item)}>{t.sendRobot}</button>
                        <button className={styles.btnGhost} onClick={() => downloadJson(`${item.id || 'electronbot-choreography'}.json`, item)}>{t.exportJson}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      <details className={styles.console} open>
        <summary>{t.console} ({log.length})<button className={styles.clearLog} onClick={(e) => { e.preventDefault(); setLog([]); }}>{t.clear}</button></summary>
        <div className={styles.logBox}>
          {log.length === 0 && <div className={styles.muted}>{t.noMessages}</div>}
          {log.slice().reverse().map((item, index) => (
            <div key={index} className={styles.logLine + ' ' + styles['log_' + item.dir]}>
              <span className={styles.logTime}>{new Date(item.t).toLocaleTimeString()}</span>
              <span className={styles.logDir}>{{ out: '→', in: '←', err: '×', sys: '·' }[item.dir]}</span>
              <span className={styles.logText}>{item.text}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function FrameEditor({ frame, onChange, pose, t, lang }) {
  if (frame.type === 'osc') {
    return (
      <div className={styles.editor}>
        <div className={styles.cardTitle}>{t.oscTitle}</div>
        <p className={styles.muted}>{t.oscIntro}</p>
        {SERVOS.map((servo) => (
          <div key={servo.key} className={styles.oscRow}>
            <span className={styles.oscName}>{pick(lang, servo.label, servo.labelEn)} <code>{servo.short}</code></span>
            <label>{t.amplitude}<input type="number" min="0" max="90" value={frame.amplitude[servo.key]} onChange={(e) => onChange({ amplitude: { ...frame.amplitude, [servo.key]: clamp(Number(e.target.value), 0, 90) } })} /></label>
            <label>{t.center}<input type="number" min={servo.min} max={servo.max} value={frame.center[servo.key]} onChange={(e) => onChange({ center: { ...frame.center, [servo.key]: clampServo(servo.key, Number(e.target.value)) } })} /></label>
            <label>{t.phase}<input type="number" min="0" max="360" value={frame.phase[servo.key]} onChange={(e) => onChange({ phase: { ...frame.phase, [servo.key]: clamp(Number(e.target.value), 0, 360) } })} /></label>
          </div>
        ))}
        <div className={styles.editRow}>
          <label>{t.period} (ms)<input type="number" min="100" max="3000" value={frame.p} onChange={(e) => onChange({ p: clamp(Number(e.target.value), 100, 3000) })} /></label>
          <label>{t.cycles}<input type="number" min="0.1" max="20" step="0.1" value={frame.c} onChange={(e) => onChange({ c: clamp(Number(e.target.value), 0.1, 20) })} /></label>
          <label>{t.endDelay} (ms)<input type="number" min="0" max="5000" value={frame.d} onChange={(e) => onChange({ d: Math.max(0, Number(e.target.value)) })} /></label>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.editor}>
      <div className={styles.cardTitle}>{t.moveTitle}<button className={styles.btnGhostSm} onClick={() => onChange({ pose: { ...pose } })}>{t.grabPose}</button></div>
      <div className={styles.editServos}>
        {SERVOS.map((servo) => (
          <div key={servo.key} className={styles.editServo}>
            <label className={styles.check}><input type="checkbox" checked={!!frame.enabled[servo.key]} onChange={(e) => onChange({ enabled: { ...frame.enabled, [servo.key]: e.target.checked } })} />{pick(lang, servo.label, servo.labelEn)}</label>
            <input type="number" min={servo.min} max={servo.max} value={frame.pose[servo.key]} disabled={!frame.enabled[servo.key]} onChange={(e) => onChange({ pose: { ...frame.pose, [servo.key]: clampServo(servo.key, Number(e.target.value)) } })} />
          </div>
        ))}
      </div>
      <div className={styles.editRow}>
        <label>{t.moveDuration} (ms)<input type="number" min="100" max="3000" value={frame.v} onChange={(e) => onChange({ v: clamp(Number(e.target.value), 100, 3000) })} /></label>
        <label>{t.endDelay} (ms)<input type="number" min="0" max="5000" value={frame.d} onChange={(e) => onChange({ d: Math.max(0, Number(e.target.value)) })} /></label>
      </div>
    </div>
  );
}

function ParamControl({ label, min, max, step, value, onChange }) {
  const resolvedValue = clamp(Math.round(Number(value) || min), min, max);
  const setClamped = (next) => {
    if (next === '') return;
    onChange(clamp(Math.round(Number(next) || min), min, max));
  };
  return (
    <div className={styles.paramControl}>
      <div className={styles.paramControlHead}>
        <span>{label}</span>
        <input type="number" min={min} max={max} step={step} value={resolvedValue} aria-label={label} onChange={(e) => setClamped(e.target.value)} />
      </div>
      <div className={styles.paramStepper}>
        <button type="button" onClick={() => setClamped(resolvedValue - step)} aria-label={label + ' -'}>-</button>
        <input type="range" min={min} max={max} step={step} value={resolvedValue} aria-label={label} onChange={(e) => setClamped(e.target.value)} />
        <button type="button" onClick={() => setClamped(resolvedValue + step)} aria-label={label + ' +'}>+</button>
      </div>
      <div className={styles.paramScale}><span>{min}</span><span>{max}</span></div>
    </div>
  );
}
