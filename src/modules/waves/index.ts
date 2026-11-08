import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const wavesExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'transverse-waves-string',
    title: 'Transverse Waves on a String',
    category: 'waves',
    status: 'planned',
    summary: 'Generate travelling waves and relate frequency, wavelength and wave speed.',
    description:
      'Drive one end of a string sinusoidally and measure wavelength and speed as tension and linear density change.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'wave',
    objectives: [
      'Verify the relation v = fλ.',
      'Show how tension and linear density determine wave speed.',
    ],
    equations: [
      { label: 'Travelling wave', latex: tex`y(x,t) = A\sin(kx - \omega t)` },
      { label: 'Wave speed', latex: tex`v = f\lambda = \sqrt{\frac{T}{\mu}}` },
    ],
    tags: ['travelling waves', 'wave speed'],
  },
  {
    slug: 'standing-waves-harmonics',
    title: 'Standing Waves and Harmonics',
    category: 'waves',
    status: 'planned',
    summary: 'Excite resonant modes on a fixed string and identify nodes and antinodes.',
    description:
      'Sweep the driving frequency to find harmonics of a string fixed at both ends and compare them with theory.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'standing-wave',
    featured: true,
    objectives: [
      'Identify resonant frequencies as integer multiples of the fundamental.',
      'Locate nodes and antinodes for each harmonic.',
    ],
    equations: [{ label: 'Harmonic frequencies', latex: tex`f_n = \frac{n}{2L}\sqrt{\frac{T}{\mu}},\quad n = 1,2,3,\dots` }],
    tags: ['resonance', 'superposition', 'harmonics'],
  },
  {
    slug: 'two-source-interference',
    title: 'Two-Source Interference',
    category: 'waves',
    status: 'planned',
    summary: 'Superpose waves from two coherent sources and map constructive and destructive interference.',
    description:
      'Visualise a ripple-tank interference pattern and measure path differences along lines of maxima and minima.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'interference',
    objectives: [
      'Relate path difference to the interference condition.',
      'Predict how source separation and wavelength change the pattern.',
    ],
    equations: [
      { label: 'Constructive', latex: tex`\Delta r = m\lambda` },
      { label: 'Destructive', latex: tex`\Delta r = \left(m + \tfrac{1}{2}\right)\lambda` },
    ],
    tags: ['interference', 'superposition', 'coherence'],
  },
  {
    slug: 'doppler-effect',
    title: 'Doppler Effect',
    category: 'waves',
    status: 'planned',
    summary: 'Move a sound source and observer and measure the observed frequency shift.',
    description:
      'Visualise wavefronts from moving sources, including the transition to a shock cone above the wave speed.',
    difficulty: 'intermediate',
    durationMinutes: 15,
    glyph: 'doppler',
    objectives: [
      'Calculate observed frequency for moving source and observer.',
      'Explain wavefront compression ahead of a moving source.',
    ],
    equations: [{ label: 'Observed frequency', latex: tex`f' = f\,\frac{v + v_o}{v - v_s}` }],
    tags: ['sound', 'frequency', 'relative motion'],
  },
];
