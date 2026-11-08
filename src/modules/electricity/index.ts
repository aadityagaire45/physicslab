import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const electricityExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'ohms-law',
    title: 'Ohm’s Law',
    category: 'electricity',
    status: 'planned',
    summary: 'Measure current against voltage for ohmic resistors and determine resistance from the gradient.',
    description:
      'Use a virtual variable supply, ammeter and voltmeter to record an I–V characteristic and compute resistance and power.',
    difficulty: 'introductory',
    durationMinutes: 10,
    glyph: 'circuit',
    featured: true,
    objectives: [
      'Plot current against potential difference for a fixed resistor.',
      'Determine resistance from the gradient of the I–V graph.',
    ],
    equations: [
      { label: 'Ohm’s law', latex: tex`V = IR` },
      { label: 'Power', latex: tex`P = VI = I^2 R = \frac{V^2}{R}` },
    ],
    tags: ['current', 'resistance', 'circuits'],
  },
  {
    slug: 'series-parallel-resistors',
    title: 'Series and Parallel Resistors',
    category: 'electricity',
    status: 'planned',
    summary: 'Build resistor networks and compare measured equivalent resistance with theory.',
    description:
      'Combine resistors in series and parallel, measure branch currents and node voltages, and verify Kirchhoff’s laws.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'resistors',
    objectives: [
      'Calculate equivalent resistance for series and parallel combinations.',
      'Apply Kirchhoff’s current and voltage laws.',
    ],
    equations: [
      { label: 'Series', latex: tex`R_\text{eq} = \sum_i R_i` },
      { label: 'Parallel', latex: tex`\frac{1}{R_\text{eq}} = \sum_i \frac{1}{R_i}` },
    ],
    tags: ['circuits', 'kirchhoff', 'resistance'],
  },
  {
    slug: 'rc-circuit',
    title: 'RC Circuit Charging',
    category: 'electricity',
    status: 'planned',
    summary: 'Observe the exponential charging and discharging of a capacitor and measure the time constant.',
    description:
      'Charge and discharge a capacitor through a resistor, record the voltage over time and extract the time constant τ = RC.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'capacitor',
    objectives: [
      'Measure the time constant from the 63 % charging point.',
      'Linearise discharge data with a logarithmic plot.',
    ],
    equations: [
      { label: 'Charging', latex: tex`V_C(t) = V_0\left(1 - e^{-t/RC}\right)` },
      { label: 'Time constant', latex: tex`\tau = RC` },
    ],
    tags: ['capacitance', 'transients', 'exponential'],
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
