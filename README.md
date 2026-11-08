# PHYSQORA

**THE UNIVERSE, EXPLORED.**

An interactive virtual physics laboratory where students can explore scientific concepts, conduct experiments, visualize physical phenomena, and understand the laws governing our universe.

---

## Features (Phase 1 Foundation)

- **Scientific Application Shell**: Responsive sidebar, mobile navigation drawer, global command search (`Ctrl`/`⌘` + `K` or `/`), and persistent light/dark/system themes.
- **Dashboard**: Ballistic trajectory family preview, quick-access laboratories, 8 discipline cards, featured experiments, recent activity history, and notebook summary.
- **Experiment Catalogue**: 33 catalogued experiments across 8 laboratories (**Mechanics**, **Electricity**, **Magnetism**, **Waves**, **Optics**, **Thermodynamics**, **Modern Physics**, **Electronics**) with live search, category/difficulty/status filters, and honest separation between **Available** and **Planned** apparatus.
- **Interactive Projectile Motion Laboratory**: 1:1 metric 2D canvas apparatus, velocity vector decomposition, trajectory pinning (up to 4 traces), gravity presets (Earth, Moon, Mars, Jupiter), live Recharts kinematic plots, and one-click notebook logging.
- **Graph Studio**: Multi-model analytical plotter (Projectile trajectory, Damped harmonic oscillator, RC transient, Snell's law, Radioactive decay, Shockley diode I–V curve) with numerical tables and CSV export.
- **Challenge Mode**: Deterministic, seed-reproducible quantitative physics problems across all 8 disciplines, graded within ±2 % relative tolerance with worked LaTeX solutions.
- **My Notebook**: Local-first laboratory notebook with experiment linking, measurement tables, inline editing, and Markdown export.
- **Learn Reference**: 16 core laws and a CODATA 2022 SI fundamental constants table rendered with KaTeX.

---

## Technology Stack

- **UI**: React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React
- **Routing & State**: React Router, Zustand (with `localStorage` persistence)
- **Visualisation & Math Typesetting**: HTML5 2D Canvas, Recharts, KaTeX
- **Build & Verification**: Vite, Vitest, Testing Library, Playwright

---

## Project Structure

```text
src/
  app/                  # Router, navigation config, and top-level pages
  components/
    layout/             # AppShell, Sidebar, Header, MobileNav, SearchDialog, ThemeSwitcher
    common/             # Button, Panel, Badge, MathFormula, ExperimentCard, ExperimentGlyph
    controls/           # Slider, SegmentedControl, SelectField, Toggle
    graphs/             # PlotChart, TrajectoryFamily
  modules/              # 8 laboratory modules + central experiment registry
    mechanics/
    electricity/
    magnetism/
    waves/
    optics/
    thermodynamics/
    modern-physics/
    electronics/
  engine/               # UI-independent scientific calculations
    physics/            # Kinematics, oscillations, circuits, magnetism, waves, optics, thermo, modern, electronics
    mathematics/        # Vec2, RK4 & Euler integrators, AGM elliptic integral, seeded PRNG
    units/              # CODATA 2022 SI constants, conversions, significant-figure formatting
    simulation/         # Fixed-timestep rAF loop and equal-aspect viewport transform
  hooks/                # Theme, ResizeObserver, and document title hooks
  store/                # Zustand stores (theme, activity, notebook, UI)
  data/                 # Categories, concepts, graph models, challenge generators, search index
  utils/                # Classname, ID, relative time, and file download helpers
  styles/               # Design tokens and Tailwind CSS configuration
```

---

## Getting Started

### Prerequisites

- **Node.js** `>= 20.19.0`
- **npm** `>= 10`

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

### Type-Checking, Unit Tests & Production Build

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

### End-to-End Tests (Playwright)

```bash
npm run test:e2e
```

---

## License

Released under the [MIT License](./LICENSE). Copyright © 2026 Aaditya Gaire.
