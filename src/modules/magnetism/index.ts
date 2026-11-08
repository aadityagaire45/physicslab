import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const magnetismExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'magnetic-field-straight-wire',
    title: 'Magnetic Field of a Straight Wire',
    category: 'magnetism',
    status: 'planned',
    summary: 'Map the magnetic field around a current-carrying wire and verify its inverse-distance dependence.',
    description:
      'Move a virtual probe around a long straight conductor, vary the current, and compare measured flux density with the Biot–Savart result.',
    difficulty: 'intermediate',
    durationMinutes: 15,
    glyph: 'wire-field',
    objectives: [
      'Determine the direction of B with the right-hand grip rule.',
      'Verify that B is inversely proportional to distance from the wire.',
    ],
    equations: [{ label: 'Long straight wire', latex: tex`B = \frac{\mu_0 I}{2\pi r}` }],
    tags: ['biot-savart', 'fields', 'current'],
  },
  {
    slug: 'charged-particle-magnetic-field',
    title: 'Charged Particle in a Magnetic Field',
    category: 'magnetism',
    status: 'planned',
    summary: 'Trace circular and helical paths of charged particles in a uniform magnetic field.',
    description:
      'Inject electrons, protons or alpha particles into a uniform field and measure the radius and period of their motion.',
    difficulty: 'advanced',
    durationMinutes: 20,
    glyph: 'cyclotron',
    objectives: [
      'Relate orbit radius to momentum, charge and field strength.',
      'Show that the cyclotron period is independent of speed (non-relativistic).',
    ],
    equations: [
      { label: 'Lorentz force', latex: tex`\vec{F} = q\,\vec{v} \times \vec{B}` },
      { label: 'Orbit radius', latex: tex`r = \frac{mv}{|q|B}` },
    ],
    tags: ['lorentz force', 'circular motion', 'particles'],
  },
  {
    slug: 'faradays-law-induction',
    title: 'Faraday’s Law of Induction',
    category: 'magnetism',
    status: 'planned',
    summary: 'Move a magnet through a coil and measure the induced EMF as the flux changes.',
    description:
      'Vary magnet speed, coil turns and orientation to see how the rate of change of magnetic flux determines the induced EMF.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'induction',
    objectives: [
      'Show that induced EMF depends on the rate of change of flux linkage.',
      'Use Lenz’s law to predict the direction of the induced current.',
    ],
    equations: [
      { label: 'Faraday–Lenz law', latex: tex`\varepsilon = -N\frac{d\Phi_B}{dt}` },
      { label: 'Magnetic flux', latex: tex`\Phi_B = B A \cos\theta` },
    ],
    tags: ['induction', 'flux', 'lenz'],
  },
];
