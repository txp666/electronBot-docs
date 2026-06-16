import React from 'react';

const PATHS = {
  'hand-up': <><path d="M7 16V8M5 10l2-2 2 2M17 16V8M15 10l2-2 2 2" /><path d="M10 18h4" /></>,
  'hand-down': <><path d="M7 8v8M5 14l2 2 2-2M17 8v8M15 14l2 2 2-2" /><path d="M10 18h4" /></>,
  wave: <><path d="M8.5 13V6.5a1.1 1.1 0 0 1 2.2 0V12M10.7 12V5a1.1 1.1 0 0 1 2.2 0v7M12.9 12V6a1.1 1.1 0 0 1 2.2 0v7a5.3 5.3 0 0 1-5.3 5.3c-2.4 0-3.7-1.2-5-3.4" /><path d="M18 4.5c1.2 1.2 1.2 3.2 0 4.4" /></>,
  flap: <><path d="M5 12c2.2-4 5.2-4 7.2 0 2-4 5-4 6.8 0" /><path d="M5 16c2.2 2.2 4.7 2.2 7 0 2.3 2.2 4.8 2.2 7 0" /></>,
  'turn-left': <><path d="M8 7h7a5 5 0 0 1 0 10H7" /><path d="M8 7l3-3M8 7l3 3" /></>,
  'turn-right': <><path d="M16 7H9a5 5 0 0 0 0 10h8" /><path d="M16 7l-3-3M16 7l-3 3" /></>,
  center: <><path d="M12 4v16M4 12h16" /><path d="M8 8l-4 4 4 4M16 8l4 4-4 4" /></>,
  'head-up': <><circle cx="12" cy="12" r="6" /><path d="M12 10V5M9.5 7.5L12 5l2.5 2.5" /></>,
  'head-down': <><circle cx="12" cy="10" r="6" /><path d="M12 12v7M9.5 16.5L12 19l2.5-2.5" /></>,
  nod: <><circle cx="12" cy="9" r="4" /><path d="M8 16c2.4 2 5.6 2 8 0" /><path d="M17 14l-1 3 3-.4" /></>,
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></>,
};

export default function ActionIcon({ id, size = 22 }) {
  const body = PATHS[id] || PATHS.home;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {body}
    </svg>
  );
}
