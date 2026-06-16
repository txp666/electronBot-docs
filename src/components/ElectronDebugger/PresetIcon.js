import React from 'react';

const PATHS = {
  'hello-nod': <><path d="M8 13V6.8a1.1 1.1 0 0 1 2.2 0V12M10.2 12V5.4a1.1 1.1 0 0 1 2.2 0V12M12.4 12V6.5a1.1 1.1 0 0 1 2.2 0V13" /><path d="M17 5c1 1 1 2.8 0 3.8M7 18c2.8 1.5 7.2 1.5 10 0" /></>,
  'curious-scan': <><circle cx="12" cy="10" r="4" /><path d="M4 16c4.5 3 11.5 3 16 0" /><path d="M6 10h2M16 10h2" /></>,
  'happy-sway': <><path d="M7 15V7M5 9l2-2 2 2M17 15V7M15 9l2-2 2 2" /><path d="M6 19c3.5 2 8.5 2 12 0" /><path d="M4 12c2-1.4 4-1.4 6 0M14 12c2 1.4 4 1.4 6 0" /></>,
  'victory-cheer': <><path d="M6 16V7M4 9l2-2 2 2M18 16V7M16 9l2-2 2 2" /><path d="M8 19h8" /><path d="M12 4l1.2 2.3 2.6.4-1.9 1.8.5 2.5L12 9.8 9.6 11l.5-2.5-1.9-1.8 2.6-.4L12 4z" /></>,
  'shy-peek': <><path d="M7 9c1.2-2 3-3 5-3 2.2 0 4 1.3 5 3" /><path d="M6 15c2.8 2.2 9.2 2.2 12 0" /><path d="M9 11h.01M15 11h.01" /><path d="M4 8c1 3 1 6 0 9M20 8c-1 3-1 6 0 9" /></>,
  'relay-wave': <><path d="M7 16V7M5 9l2-2 2 2" /><path d="M17 8v9M15 15l2 2 2-2" /><path d="M9 20h6" /><path d="M4 13c1.5 1 3 1 4.5 0M15.5 11c1.5-1 3-1 4.5 0" /></>,
};

export default function PresetIcon({ id, size = 26 }) {
  const body = PATHS[id] || PATHS['hello-nod'];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {body}
    </svg>
  );
}
