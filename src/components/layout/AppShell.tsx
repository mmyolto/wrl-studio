import {
  Archive,
  CalendarX,
  ChartColumn,
  ClipboardList,
  FileText,
  HandCoins,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Mic,
  TriangleAlert,
  Users,
  UsersRound,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import logo from '../../assets/logo.png';
import { useAuth, useCurrentUser } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { NavContext } from '../../context/NavContext';
import type { Page } from '../../hooks/useRoute';
import { useRoute } from '../../hooks/useRoute';
import { cn } from '../../lib/cn';
import { AVAILABILITY, STATION_TAGLINE } from '../../lib/constants';
import { permissionsFor } from '../../lib/permissions';
import { checkRules } from '../../lib/rulesCheck';
import { isCurrentOrUpcoming } from '../../services/scheduleChanges';
import { Avatar } from '../ui/misc';
import { toast } from '../ui/toast';
import { AVAILABILITY_DOT, AvailabilityDialog } from './AvailabilityDialog';
import { NotificationBell } from './NotificationBell';
import { ReportIssueDialog } from './ReportIssueDialog';

interface NavItem {
  page: Page;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function AppShell({ render }: { render: (page: Page) => ReactNode }) {
  const me = useCurrentUser();
  const { logout } = useAuth();
  const { records, showPreps, tickets, tasks, scheduleChanges, error } = useData();
  const { page, params, navigate } = useRoute();
  const can = permissionsFor(me.role);
  const online = useOnline();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [rulesOld, setRulesOld] = useState(false);

  // Spot a Firebase project still running older security rules than this app needs.
  useEffect(() => {
    let live = true;
    checkRules().then((old) => live && setRulesOld(old));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    const onSyncError = () =>
      toast.error('A change made while offline could not be saved. Please check and try again.');
    window.addEventListener('wrl:sync-error', onSyncError);
    return () => window.removeEventListener('wrl:sync-error', onSyncError);
  }, []);

  const groups = useMemo(() => {
    const pendingReferrals = records.filter((r) => r.referredTo === me.id && r.referralStatus === 'pending').length;
    const toReview = can.trackShowPrep ? showPreps.filter((p) => !p.reviewedAt && p.submittedBy !== me.id).length : 0;
    const openTickets = tickets.filter((t) => t.status !== 'resolved').length;

    const workspace: NavItem[] = [
      { page: 'overview', label: 'Overview', icon: LayoutDashboard },
      { page: 'records', label: 'Listener records', icon: FileText, badge: pendingReferrals },
    ];
    const myOpenTasks = tasks.filter((t) => t.assignedTo === me.id && t.status !== 'done').length;
    workspace.push({
      page: 'tasks',
      label: can.assignTasks ? 'Tasks' : 'My tasks',
      icon: ListTodo,
      badge: myOpenTasks,
    });
    if (can.recordGiving) workspace.push({ page: 'giving', label: 'Pledges & gifts', icon: HandCoins });
    if (can.submitShowPrep) workspace.push({ page: 'show-prep', label: 'My show prep', icon: Mic });
    // Management see how many reports they haven't noted yet.
    const unnoted = can.acknowledgeScheduleChange
      ? scheduleChanges.filter(
          (c) => c.createdBy !== me.id && !c.acknowledgedBy?.includes(me.id) && isCurrentOrUpcoming(c),
        ).length
      : 0;
    workspace.push({ page: 'schedule', label: 'Schedule changes', icon: CalendarX, badge: unnoted });
    workspace.push({
      page: 'issues',
      label: can.manageTickets ? 'Issues' : 'My issues',
      icon: TriangleAlert,
      badge: can.manageTickets ? openTickets : 0,
    });

    const management: NavItem[] = [];
    if (can.trackShowPrep)
      management.push({ page: 'tracker', label: 'Show prep tracker', icon: ClipboardList, badge: toReview });
    if (can.viewReports) management.push({ page: 'reports', label: 'Reports', icon: ChartColumn });
    if (can.viewTeam) management.push({ page: 'team', label: 'Team progress', icon: UsersRound });

    const admin: NavItem[] = [];
    if (can.manageUsers) admin.push({ page: 'users', label: 'Staff & access', icon: Users });
    if (can.viewArchive) admin.push({ page: 'archive', label: 'Archive', icon: Archive });

    return [
      { label: 'Workspace', items: workspace },
      { label: 'Management', items: management },
      { label: 'Administration', items: admin },
    ].filter((g) => g.items.length);
  }, [
    records,
    tasks,
    scheduleChanges,
    can.acknowledgeScheduleChange,
    can.assignTasks,
    can.recordGiving,
    showPreps,
    tickets,
    me.id,
    can.trackShowPrep,
    can.submitShowPrep,
    can.manageTickets,
    can.viewReports,
    can.viewTeam,
    can.manageUsers,
    can.viewArchive,
  ]);

  const allowed = groups.flatMap((g) => g.items.map((i) => i.page));
  const current: Page = allowed.includes(page) ? page : 'overview';
  const currentLabel = groups.flatMap((g) => g.items).find((i) => i.page === current)?.label ?? 'Overview';

  useEffect(() => {
    setDrawerOpen(false);
    window.scrollTo({ top: 0 });
  }, [current]);

  const availability = me.availability ?? 'active';

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-stone-200">
          <img src={logo} alt="Wantok Radio Light 93.9 FM" className="mx-auto h-12 w-auto" />
        </div>
        <p className="mt-3 text-center text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
          Studio · {STATION_TAGLINE}
        </p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Main">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-[11px] font-bold tracking-wider text-stone-400 uppercase">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.page === current;
                return (
                  <li key={item.page}>
                    <a
                      href={`#/${item.page}`}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition',
                        active
                          ? 'bg-brand-700 text-white shadow-sm'
                          : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900',
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-[18px] w-[18px]',
                          active ? 'text-brand-100' : 'text-stone-400 group-hover:text-stone-600',
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {!!item.badge && (
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums',
                            active ? 'bg-white/20 text-white' : 'bg-flame-600 text-white',
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-stone-200 p-3">
        <div className="flex items-center gap-3 rounded-xl p-2">
          <Avatar name={me.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-stone-900">{me.name}</p>
            <p className="truncate text-xs text-stone-500">{me.role}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-200/60 hover:text-stone-700"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setAvailabilityOpen(true)}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-stone-600 transition hover:bg-stone-200/60"
        >
          <span className={cn('h-2 w-2 rounded-full', AVAILABILITY_DOT[availability])} />
          {AVAILABILITY[availability].label}
          <span className="ml-auto text-stone-400">Change</span>
        </button>
      </div>
    </div>
  );

  return (
    <NavContext.Provider value={{ page: current, params, navigate, openReportIssue: () => setIssueOpen(true) }}>
      <div className="min-h-dvh lg:pl-64">
        {/* Desktop sidebar */}
        <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-stone-200 bg-stone-100/80 backdrop-blur lg:block">
          {sidebar}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="absolute inset-0 animate-fade-in bg-stone-950/40" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-pop-in bg-stone-100 shadow-2xl">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="absolute top-3 right-3 z-10 rounded-lg p-2 text-stone-500 hover:bg-stone-200"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </div>
        )}

        <header className="no-print sticky top-0 z-20 border-b border-stone-200/80 bg-canvas/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="-ml-2 rounded-lg p-2 text-stone-600 hover:bg-stone-200/60 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-semibold text-stone-500 lg:hidden">{currentLabel}</p>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              {!online && (
                <span className="mr-1 flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Offline — changes will sync</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => setIssueOpen(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-200/60 hover:text-stone-900"
              >
                <TriangleAlert className="h-4 w-4 text-flame-600" />
                <span className="hidden sm:inline">Report issue</span>
              </button>
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {rulesOld && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950"
            >
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-flame-600" />
              <div>
                <p className="font-semibold">The database rules on Firebase are out of date</p>
                <p className="mt-0.5 text-red-900">
                  Some saves (such as pledges, gifts and schedule changes) will say “no permission” until they are
                  updated.{' '}
                  {me.role === 'Administrator'
                    ? 'On the studio computer, open the app folder and double-click DEPLOY-RULES.bat, then reload this page.'
                    : 'Please tell the Administrator to run DEPLOY-RULES.bat.'}
                </p>
              </div>
            </div>
          )}
          {render(current)}
        </main>
      </div>

      <AvailabilityDialog open={availabilityOpen} onClose={() => setAvailabilityOpen(false)} />
      <ReportIssueDialog open={issueOpen} onClose={() => setIssueOpen(false)} />
    </NavContext.Provider>
  );
}
