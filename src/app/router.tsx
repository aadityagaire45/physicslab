import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/app/pages/DashboardPage';
import { RouteErrorPage } from '@/app/pages/RouteErrorPage';

// Secondary pages are code-split so the initial dashboard load stays small.
const ExperimentsPage = lazy(() => import('@/app/pages/ExperimentsPage'));
const ExperimentPage = lazy(() => import('@/app/pages/ExperimentPage'));
const GraphStudioPage = lazy(() => import('@/app/pages/GraphStudioPage'));
const ChallengePage = lazy(() => import('@/app/pages/ChallengePage'));
const NotebookPage = lazy(() => import('@/app/pages/NotebookPage'));
const LearnPage = lazy(() => import('@/app/pages/LearnPage'));
const AboutPage = lazy(() => import('@/app/pages/AboutPage'));
const NotFoundPage = lazy(() => import('@/app/pages/NotFoundPage'));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'experiments', element: <ExperimentsPage /> },
      { path: 'experiments/:slug', element: <ExperimentPage /> },
      { path: 'graph-studio', element: <GraphStudioPage /> },
      { path: 'challenges', element: <ChallengePage /> },
      { path: 'notebook', element: <NotebookPage /> },
      { path: 'learn', element: <LearnPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const createAppRouter = () => createBrowserRouter(routes);
