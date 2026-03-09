import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PracticePage from './pages/PracticePage';
import PracticeDetailPage from './pages/PracticeDetailPage';
import HistoryPage from './pages/HistoryPage';
import PracticeResultPage from './pages/PracticeResultPage';
import ReportsPage from './pages/ReportsPage';
import ScenariosPage from './pages/ScenariosPage';
import LivePracticePage from './pages/LivePracticePage';
import SettingsPage from './pages/SettingsPage';
import type { ReactNode } from 'react';

interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
}

const routes: RouteConfig[] = [
  {
    name: 'Login',
    path: '/login',
    element: <LoginPage />,
  },
  {
    name: 'Home',
    path: '/',
    element: <HomePage />,
  },
  {
    name: 'Practice',
    path: '/practice',
    element: <PracticePage />,
  },
  {
    name: 'Practice Detail',
    path: '/practice/:taskId',
    element: <PracticeDetailPage />,
  },
  {
    name: 'History',
    path: '/history',
    element: <HistoryPage />,
  },
  {
    name: 'Practice Result',
    path: '/history/:recordId',
    element: <PracticeResultPage />,
  },
  {
    name: 'Reports',
    path: '/reports',
    element: <ReportsPage />,
  },
  {
    name: 'Scenarios',
    path: '/scenarios',
    element: <ScenariosPage />,
  },
  {
    name: 'Live Practice',
    path: '/live-practice',
    element: <LivePracticePage />,
  },
  {
    name: 'Settings',
    path: '/settings',
    element: <SettingsPage />,
  },
];

export default routes;
