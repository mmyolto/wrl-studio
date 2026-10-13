import { useEffect, useState } from 'react';
import { InstallPrompt } from './components/layout/InstallPrompt';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from './components/ui/toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ArchivePage } from './features/archive/ArchivePage';
import { OverviewPage } from './features/overview/OverviewPage';
import { RecordsPage } from './features/records/RecordsPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { ShowPrepPage } from './features/showprep/ShowPrepPage';
import { TrackerPage } from './features/showprep/TrackerPage';
import { TeamPage } from './features/team/TeamPage';
import { GivingPage } from './features/giving/GivingPage';
import { SchedulePage } from './features/schedule/SchedulePage';
import { TasksPage } from './features/tasks/TasksPage';
import { TicketsPage } from './features/tickets/TicketsPage';
import { UsersPage } from './features/users/UsersPage';
import type { Page } from './hooks/useRoute';
import { LoginPage } from './pages/LoginPage';
import { SetupPage } from './pages/SetupPage';
import { AccountProblem, Splash } from './pages/StatusScreens';
import { isSetupComplete } from './services/users';

function renderPage(page: Page) {
  switch (page) {
    case 'records':
      return <RecordsPage />;
    case 'show-prep':
      return <ShowPrepPage />;
    case 'tracker':
      return <TrackerPage />;
    case 'reports':
      return <ReportsPage />;
    case 'team':
      return <TeamPage />;
    case 'issues':
      return <TicketsPage />;
    case 'tasks':
      return <TasksPage />;
    case 'giving':
      return <GivingPage />;
    case 'schedule':
      return <SchedulePage />;
    case 'users':
      return <UsersPage />;
    case 'archive':
      return <ArchivePage />;
    default:
      return <OverviewPage />;
  }
}

function Gate() {
  const { status } = useAuth();
  const [setup, setSetup] = useState<'checking' | 'needed' | 'done'>('checking');

  useEffect(() => {
    isSetupComplete()
      .then((done) => setSetup(done ? 'done' : 'needed'))
      // Offline or blocked: assume the studio is already set up and show sign-in.
      .catch(() => setSetup('done'));
  }, []);

  if (setup === 'checking') return <Splash />;
  if (setup === 'needed') return <SetupPage onDone={() => setSetup('done')} />;

  switch (status) {
    case 'loading':
      return <Splash />;
    case 'signedOut':
      return <LoginPage />;
    case 'noProfile':
    case 'disabled':
      return <AccountProblem kind={status} />;
    default:
      return (
        <DataProvider>
          <AppShell render={renderPage} />
        </DataProvider>
      );
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
      <InstallPrompt />
      <Toaster />
    </AuthProvider>
  );
}
