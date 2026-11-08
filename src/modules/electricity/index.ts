import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const electricityExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'ohms-law',
    title: 'Ohm’s Law',
    category: 'electricity',
    status: 'available',
    load: () => import('./ohms-law/OhmsLawLab'),
    summary:
      'Measure current against voltage for ohmic resistors, filament lamps, and semiconductor diodes, and determine resistance and power.',
    description:
      'Use an interactive DC supply, series ammeter, parallel voltmeter, and 4-band EIA colour-coded resistor to record I–V, I–R, and P–V characteristics and compare linear ohmic conductors with non-ohmic components.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'circuit',
    featured: true,
    objectives: [
      'Plot current against potential difference for a fixed resistor and verify V = IR.',
      'Determine static and differential resistance from the I–V characteristic.',
      'Compare linear ohmic resistors with thermal filament lamps and forward-biased silicon diodes.',
      'Decode 4-band EIA resistor colour codes and compute dissipated power P = VI = I²R = V²/R.',
    ],
    equations: [
      { label: 'Ohm’s law', latex: tex`V = IR, \quad I = \frac{V}{R}, \quad R = \frac{V}{I}` },
      { label: 'Electrical power', latex: tex`P = VI = I^2 R = \frac{V^2}{R}` },
      { label: 'Differential resistance', latex: tex`r_\text{diff} = \left(\frac{dI}{dV}\right)^{-1}` },
    ],
    tags: ['current', 'voltage', 'resistance', 'ohms-law', 'circuits', 'diode', 'filament'],
  },
  {
    slug: 'series-parallel-circuits',
    title: 'Series & Parallel Circuits',
    category: 'electricity',
    status: 'available',
    load: () => import('./series-parallel-circuits/SeriesParallelCircuitsLab'),
    summary:
      'Build 2-to-5 resistor networks in series, parallel, and mixed topologies, toggle branch switches, and verify equivalent resistance and conservation laws.',
    description:
      'Configure series chains, parallel banks, and series–parallel ladders with up to five independent resistors and branch switches. Inspect live branch currents, potential drops, power distribution, and KCL/KVL conservation residuals.',
    difficulty: 'introductory',
    durationMinutes: 20,
    glyph: 'resistors',
    featured: true,
    objectives: [
      'Calculate equivalent resistance for series, parallel, and mixed series–parallel combinations.',
      'Observe how opening or closing individual branch switches redistributes current and voltage.',
      'Compare per-resistor voltage drops, branch currents, and power dissipation across topologies.',
      'Verify Kirchhoff’s current and voltage conservation laws to machine precision.',
    ],
    equations: [
      { label: 'Series equivalent', latex: tex`R_\text{eq} = \sum_{i=1}^{N} R_i` },
      { label: 'Parallel equivalent', latex: tex`\frac{1}{R_\text{eq}} = \sum_{i=1}^{N} \frac{1}{R_i}` },
      { label: 'Voltage divider', latex: tex`\Delta V_i = V_\text{source}\frac{R_i}{R_\text{eq}}` },
    ],
    tags: ['circuits', 'series', 'parallel', 'equivalent-resistance', 'kirchhoff', 'resistors'],
  },
  {
    slug: 'kirchhoff-laws',
    title: 'Kirchhoff’s Laws (KCL & KVL)',
    category: 'electricity',
    status: 'available',
    load: () => import('./kirchhoff-laws/KirchhoffLawsLab'),
    summary:
      'Solve multi-loop DC circuits with multiple EMF sources using Kirchhoff’s Current and Voltage Laws and inspect signed branch currents.',
    description:
      'Explore a two-loop, three-branch DC network with two independent voltage sources. Choose clockwise or counter-clockwise loop traversal conventions, step through the simultaneous linear equations, and see why a negative solved current indicates flow opposite to the assumed reference arrow.',
    difficulty: 'intermediate',
    durationMinutes: 25,
    glyph: 'circuit',
    objectives: [
      'Formulate Kirchhoff’s Current Law (KCL) at circuit junctions: ΣI_in = ΣI_out.',
      'Formulate Kirchhoff’s Voltage Law (KVL) around closed loops: ΣΔV = 0.',
      'Solve simultaneous linear equations for branch currents I₁, I₂, and I₃.',
      'Interpret negative signed currents as physical flow opposite to the assumed reference arrow.',
    ],
    equations: [
      { label: 'Kirchhoff’s Current Law', latex: tex`\sum I_\text{in} = \sum I_\text{out} \iff I_1 + I_2 - I_3 = 0` },
      { label: 'Kirchhoff’s Voltage Law', latex: tex`\sum_\text{loop} \Delta V = 0` },
      { label: 'Loop equations', latex: tex`\varepsilon_1 - I_1 R_1 - I_3 R_3 = 0, \quad \varepsilon_2 - I_2 R_2 - I_3 R_3 = 0` },
    ],
    tags: ['kirchhoff', 'kcl', 'kvl', 'multi-loop', 'circuits', 'linear-equations'],
  },
  {
    slug: 'electrical-power-heating',
    title: 'Electrical Power & Joule Heating',
    category: 'electricity',
    status: 'available',
    load: () => import('./electrical-power-heating/ElectricalPowerHeatingLab'),
    summary:
      'Investigate real-time electrical power dissipation, cumulative Joule heating in joules and kilowatt-hours, and thermal response.',
    description:
      'Operate a resistive heating circuit over adjustable durations, measure instantaneous power with a virtual wattmeter, compare energy in joules and kilowatt-hours (kWh), and contrast P = V²/R (constant voltage) with P = I²R (constant current).',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'heat',
    objectives: [
      'Distinguish instantaneous electrical power P (watts) from cumulative energy E = Pt (joules or kWh).',
      'Verify Joule’s heating law H = I²Rt = VIt = (V²/R)t across household and laboratory loads.',
      'Explain why lower resistance increases power under constant voltage (P = V²/R) whereas higher resistance increases power under constant current (P = I²R).',
      'Explore an illustrative lumped thermal model balancing Joule heating against Newton cooling.',
    ],
    equations: [
      { label: 'Electrical power', latex: tex`P = VI = I^2 R = \frac{V^2}{R}` },
      { label: 'Joule heating energy', latex: tex`H = E = P\,t = I^2 R\,t` },
      { label: 'Kilowatt-hour conversion', latex: tex`1\text{ kWh} = 3.6 \times 10^6\text{ J}` },
    ],
    tags: ['power', 'joule-heating', 'energy', 'kwh', 'thermal', 'circuits'],
  },
  {
    slug: 'capacitors',
    title: 'Capacitors & Dielectrics',
    category: 'electricity',
    status: 'available',
    load: () => import('./capacitors/CapacitorsLab'),
    summary:
      'Explore parallel-plate capacitance geometry, dielectric insertion under constant-voltage vs. isolated constant-charge conditions, and electrostatic energy.',
    description:
      'Vary plate area A, separation d, relative permittivity ε_r, and voltage V on an interactive parallel-plate capacitor. Compare dielectric insertion while connected to a battery (constant V) versus isolated (constant Q), and compute equivalent capacitance for series and parallel banks.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'capacitor',
    objectives: [
      'Relate parallel-plate capacitance C = ε₀ε_r A / d to plate area, separation, and dielectric constant.',
      'Calculate stored charge Q = CV, uniform electric field E = V/d, and electrostatic energy U = ½CV².',
      'Contrast dielectric insertion at constant voltage (Q and U increase by ε_r) with isolated constant charge (V and U decrease by 1/ε_r).',
      'Compare series and parallel capacitor combinations.',
    ],
    equations: [
      { label: 'Parallel-plate capacitance', latex: tex`C = \frac{\varepsilon_0 \varepsilon_r A}{d}` },
      { label: 'Charge & field', latex: tex`Q = CV, \qquad E = \frac{V}{d}` },
      { label: 'Stored energy', latex: tex`U = \tfrac{1}{2}CV^2 = \frac{Q^2}{2C} = \tfrac{1}{2}QV` },
    ],
    tags: ['capacitors', 'capacitance', 'dielectric', 'electric-field', 'energy-storage'],
  },
  {
    slug: 'rc-circuits',
    title: 'RC Circuits & Transients',
    category: 'electricity',
    status: 'available',
    load: () => import('./rc-circuits/RCCircuitsLab'),
    summary:
      'Observe exponential capacitor charging and discharging transients, measure the time constant τ = RC, and track voltage, current, charge, and energy.',
    description:
      'Flip a single-pole double-throw (SPDT) switch between charging and discharging modes in a series RC circuit. Inspect synchronized V_C(t), V_R(t), I(t), q(t), and U_C(t) curves and jump directly to 1τ, 2τ, 3τ, and 5τ milestones.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'capacitor',
    featured: true,
    objectives: [
      'Measure the capacitive time constant τ = RC from the 63.2 % charging or 36.8 % discharging point.',
      'Verify KVL (V_C(t) + V_R(t) = V_s) throughout the charging transient.',
      'Compare current reversal and exponential decay during capacitor discharge.',
      'Explain why 5τ (99.3 % completion) is treated as the practical steady-state settling time.',
    ],
    equations: [
      { label: 'Time constant', latex: tex`\tau = RC` },
      { label: 'Charging transient', latex: tex`V_C(t) = V_s\!\left(1 - e^{-t/RC}\right), \quad I(t) = \frac{V_s}{R}e^{-t/RC}` },
      { label: 'Discharging transient', latex: tex`V_C(t) = V_0 e^{-t/RC}, \quad I(t) = -\frac{V_0}{R}e^{-t/RC}` },
    ],
    tags: ['rc-circuit', 'capacitance', 'transients', 'time-constant', 'exponential'],
  },
  {
    slug: 'electric-field-point-charges',
    title: 'Electric Field of Point Charges',
    category: 'electricity',
    status: 'planned',
    summary: 'Place point charges and visualise the resulting field lines and equipotentials.',
    description:
      'Arrange positive and negative charges on a plane, probe the field vector at any point and explore superposition.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'charges',
    objectives: [
      'Apply the superposition principle to multiple charges.',
      'Relate field-line density to field strength.',
    ],
    equations: [
      { label: 'Field of a point charge', latex: tex`\vec{E} = \frac{1}{4\pi\varepsilon_0}\frac{q}{r^2}\,\hat{r}` },
      { label: 'Superposition', latex: tex`\vec{E} = \sum_i \vec{E}_i` },
    ],
    tags: ['electrostatics', 'fields', 'coulomb'],
  },
];
