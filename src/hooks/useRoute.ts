import { useCallback, useEffect, useState } from 'react';

export type Page =
  | 'overview'
  | 'records'
  | 'show-prep'
  | 'tracker'
  | 'reports'
  | 'team'
  | 'issues'
  | 'tasks'
  | 'giving'
  | 'schedule'
  | 'users'
  | 'archive';

const PAGES: Page[] = [
  'overview',
  'records',
  'show-prep',
  'tracker',
  'reports',
  'team',
  'issues',
  'tasks',
  'giving',
  'schedule',
  'users',
  'archive',
];

export interface Route {
  page: Page;
  params: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, search = ''] = raw.split('?');
  const page = (PAGES as string[]).includes(path ?? '') ? (path as Page) : 'overview';
  return { page, params: new URLSearchParams(search) };
}

/** Tiny hash router: #/records?open=abc — survives refreshes and works on any static host. */
export function useRoute() {
  const [route, setRoute] = useState<Route>(parse);

  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((page: Page, params?: Record<string, string>) => {
    const search = params ? `?${new URLSearchParams(params).toString()}` : '';
    const next = `#/${page}${search}`;
    if (window.location.hash === next) setRoute(parse());
    else window.location.hash = next;
  }, []);

  return { ...route, navigate };
}
