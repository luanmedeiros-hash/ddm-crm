'use client';

import React from 'react';

type IconName =
  | 'dashboard' | 'funnel' | 'alert' | 'block' | 'rank' | 'history'
  | 'star' | 'sim' | 'chevronDown' | 'chevronUp' | 'chevronRight'
  | 'chevronLeft' | 'bell' | 'search' | 'settings' | 'arrowUpRight'
  | 'plus' | 'refresh' | 'filter' | 'trend' | 'close' | 'upload'
  | 'mail' | 'add';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, React.ReactNode> = {
  dashboard: (<>
    <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </>),
  funnel: <path d="M3 4h18l-7 9v6l-4-2v-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>,
  alert: (<>
    <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
  </>),
  block: (<>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="m5.6 5.6 12.8 12.8" stroke="currentColor" strokeWidth="1.5"/>
  </>),
  rank: <path d="M3 17V9M9 17V5M15 17v-7M21 17V3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>,
  history: (<>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  </>),
  star: <path d="m12 2 3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>,
  sim: (<>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </>),
  chevronDown: <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  chevronUp: <path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  chevronRight: <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  chevronLeft: <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  bell: (<>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
    <path d="M10 21a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </>),
  search: (<>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </>),
  settings: (<>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </>),
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
  plus: <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>,
  refresh: (<>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    <path d="M21 3v5h-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  </>),
  filter: <path d="M3 4h18l-7 9v6l-4-2v-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>,
  trend: (<>
    <path d="M3 17 9 11l4 4L21 7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 7h7v7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </>),
  close: <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>,
  upload: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>,
  mail: (<>
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="m3 7 9 6 9-6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
  </>),
  add: (<>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </>),
};

export default function Icon({ name, size = 16, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
      {PATHS[name]}
    </svg>
  );
}
