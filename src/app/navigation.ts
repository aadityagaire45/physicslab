import {
  ChartSpline,
  FlaskConical,
  GraduationCap,
  Info,
  LayoutDashboard,
  NotebookPen,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Laboratory',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview of the laboratory and your activity' },
      { to: '/experiments', label: 'Experiments', icon: FlaskConical, description: 'Browse the experiment catalogue' },
      { to: '/graph-studio', label: 'Graph Studio', icon: ChartSpline, description: 'Plot physical models and export data' },
      { to: '/challenges', label: 'Challenge Mode', icon: Trophy, description: 'Solve generated quantitative problems' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/notebook', label: 'My Notebook', icon: NotebookPen, description: 'Your lab notes and recorded results' },
      { to: '/learn', label: 'Learn', icon: GraduationCap, description: 'Core concepts and governing equations' },
      { to: '/about', label: 'About', icon: Info, description: 'About PHYSQORA' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const REPOSITORY_URL = 'https://github.com/aadityagaire45/physicslab';
