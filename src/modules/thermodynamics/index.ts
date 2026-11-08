import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const thermodynamicsExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'ideal-gas-laws',
    title: 'Ideal Gas Laws',
    category: 'thermodynamics',
    status: 'planned',
    summary: 'Vary pressure, volume and temperature of a gas sample and verify Boyle’s, Charles’s and Gay-Lussac’s laws.',
    description:
      'Control a gas in a piston-cylinder, hold one variable constant and record the relationship between the other two.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'gas',
    featured: true,
    objectives: [
      'Verify Boyle’s law at constant temperature.',
      'Extrapolate gas data to estimate absolute zero.',
    ],
    equations: [{ label: 'Ideal gas equation', latex: tex`PV = nRT` }],
    tags: ['gas laws', 'pressure', 'temperature'],
  },
  {
    slug: 'specific-heat-capacity',
    title: 'Specific Heat Capacity',
    category: 'thermodynamics',
    status: 'planned',
    summary: 'Heat samples of different materials and determine their specific heat capacities.',
    description:
      'Supply known electrical energy to a sample, record the temperature rise and account for heat losses.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'heat',
    objectives: [
      'Determine specific heat capacity from energy and temperature data.',
      'Compare materials with different heat capacities.',
    ],
    equations: [{ label: 'Sensible heat', latex: tex`Q = mc\,\Delta T` }],
    tags: ['calorimetry', 'heat', 'energy'],
  },
  {
    slug: 'heat-engine-carnot',
    title: 'Heat Engines and the Carnot Cycle',
    category: 'thermodynamics',
    status: 'planned',
    summary: 'Run an ideal gas through a Carnot cycle and compute work, heat flow and efficiency.',
    description:
      'Trace isothermal and adiabatic processes on a P–V diagram and relate the enclosed area to net work.',
    difficulty: 'advanced',
    durationMinutes: 25,
    glyph: 'cycle',
    objectives: [
      'Compute net work as the area enclosed on a P–V diagram.',
      'Show that efficiency depends only on reservoir temperatures.',
    ],
    equations: [
      { label: 'Carnot efficiency', latex: tex`\eta = 1 - \frac{T_c}{T_h}` },
      { label: 'First law', latex: tex`\Delta U = Q - W` },
    ],
    tags: ['cycles', 'efficiency', 'entropy'],
  },
  {
    slug: 'maxwell-boltzmann-distribution',
    title: 'Maxwell–Boltzmann Distribution',
    category: 'thermodynamics',
    status: 'planned',
    summary: 'Simulate gas molecules and compare their speed distribution with the Maxwell–Boltzmann law.',
    description:
      'Observe colliding particles in a box, build a histogram of molecular speeds and compare it with theory at different temperatures.',
    difficulty: 'advanced',
    durationMinutes: 20,
    glyph: 'distribution',
    objectives: [
      'Relate the most probable speed to temperature and molecular mass.',
      'Connect microscopic motion to macroscopic temperature.',
    ],
    equations: [
      {
        label: 'Speed distribution',
        latex: tex`f(v) = 4\pi\left(\frac{m}{2\pi k_B T}\right)^{3/2} v^2\, e^{-mv^2/2k_B T}`,
      },
      { label: 'Most probable speed', latex: tex`v_p = \sqrt{\frac{2k_B T}{m}}` },
    ],
    tags: ['kinetic theory', 'statistics', 'temperature'],
  },
];
