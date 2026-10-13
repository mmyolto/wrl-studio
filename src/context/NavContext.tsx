import { createContext, useContext } from 'react';
import type { Page } from '../hooks/useRoute';

export interface Nav {
  page: Page;
  params: URLSearchParams;
  navigate: (page: Page, params?: Record<string, string>) => void;
  openReportIssue: () => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside the app shell');
  return ctx;
}
