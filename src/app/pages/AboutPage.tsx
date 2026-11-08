import { Cpu, Gauge, Layers, ShieldCheck } from 'lucide-react';
import { REPOSITORY_URL } from '@/app/navigation';
import { CATEGORIES } from '@/data/categories';
import { EXPERIMENTS } from '@/modules/registry';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, PanelHeader } from '@/components/common/Panel';

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: 'Scientific Honesty',
    body: 'Every calculation uses explicit SI units and CODATA 2022 constants. Planned catalogue entries are clearly labelled rather than disguised with placeholder controls.',
  },
  {
    icon: Layers,
    title: 'Decoupled Physics Engine',
    body: 'Kinematics, oscillations, circuits, waves, optics, thermodynamics, quantum relations and ODE integrators live in pure TypeScript modules under src/engine/ with zero UI dependencies.',
  },
  {
    icon: Gauge,
    title: 'Engineered for Ordinary Hardware',
    body: '2D canvas rendering, fixed-timestep integration and non-animated chart updates keep CPU and integrated GPU usage low on standard laptops (Intel Core i5 4th gen / 4 GB RAM and newer).',
  },
  {
    icon: Cpu,
    title: 'Local-First & Open Source',
    body: 'Runs entirely in the browser with no mandatory accounts, paid APIs or external telemetry. Notebook entries and activity history stay in your local storage.',
  },
];

export default function AboutPage() {
  useDocumentTitle('About');
  const available = EXPERIMENTS.filter((e) => e.status === 'available').length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="About PHYSQORA"
        title="THE UNIVERSE, EXPLORED."
        description="An interactive virtual physics laboratory where students can explore scientific concepts, conduct experiments, visualize physical phenomena, and understand the laws governing our universe."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {PRINCIPLES.map(({ icon: Icon, title, body }) => (
          <Panel key={title} className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-fg">{title}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="System Architecture" />
          <div className="space-y-3 p-5 text-[13.5px] leading-relaxed text-muted">
            <p>
              The codebase is organised into four layers:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-fg-soft">
              <li>
                <code className="text-fg">src/engine/</code> — pure physical models, SI constants, vector math, RK4 and
                symplectic Euler integrators, and the fixed-timestep simulation loop.
              </li>
              <li>
                <code className="text-fg">src/modules/</code> — eight laboratory disciplines registered through a single
                typed catalogue (<code className="text-fg"> {available}</code> interactive,{' '}
                <code className="text-fg">{EXPERIMENTS.length}</code> total across{' '}
                <code className="text-fg">{CATEGORIES.length}</code> laboratories).
              </li>
              <li>
                <code className="text-fg">src/components/</code> — reusable scientific controls, KaTeX formula
                rendering, Recharts plotters and the responsive application shell.
              </li>
              <li>
                <code className="text-fg">src/store/</code> — local-first state for theme preference, activity history
                and the laboratory notebook.
              </li>
            </ul>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Project & Licence" />
          <dl className="divide-y divide-line text-[13px]">
            <div className="flex justify-between px-5 py-3">
              <dt className="text-muted">Version</dt>
              <dd className="tabular font-medium text-fg">v{__APP_VERSION__} (Phase 1 Foundation)</dd>
            </div>
            <div className="flex justify-between px-5 py-3">
              <dt className="text-muted">Licence</dt>
              <dd className="font-medium text-fg">MIT License · Copyright © 2026 Aaditya Gaire</dd>
            </div>
            <div className="flex justify-between px-5 py-3">
              <dt className="text-muted">Target hardware</dt>
              <dd className="font-medium text-fg">Intel Core i5 (4th gen+) · 4 GB+ RAM · Integrated GPU</dd>
            </div>
            <div className="flex justify-between px-5 py-3">
              <dt className="text-muted">Source repository</dt>
              <dd>
                <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
                  github.com/aadityagaire45/physicslab
                </a>
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
