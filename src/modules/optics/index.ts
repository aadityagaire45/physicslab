import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const opticsExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'refraction-snells-law',
    title: 'Refraction and Snell’s Law',
    category: 'optics',
    status: 'planned',
    summary: 'Trace a ray across a boundary, measure refraction angles and find the critical angle.',
    description:
      'Direct a light ray between media of different refractive index and observe refraction, partial reflection and total internal reflection.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'refraction',
    featured: true,
    objectives: [
      'Verify Snell’s law from measured angles.',
      'Determine the critical angle for total internal reflection.',
    ],
    equations: [
      { label: 'Snell’s law', latex: tex`n_1 \sin\theta_1 = n_2 \sin\theta_2` },
      { label: 'Critical angle', latex: tex`\sin\theta_c = \frac{n_2}{n_1}` },
    ],
    tags: ['refraction', 'rays', 'total internal reflection'],
  },
  {
    slug: 'thin-lens-imaging',
    title: 'Thin Lens Imaging',
    category: 'optics',
    status: 'planned',
    summary: 'Form real and virtual images with converging and diverging lenses using ray diagrams.',
    description:
      'Move an object along the optical axis and observe image position, orientation and magnification.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'lens',
    objectives: [
      'Apply the thin-lens equation to locate images.',
      'Distinguish real and virtual images from the sign of the image distance.',
    ],
    equations: [
      { label: 'Thin-lens equation', latex: tex`\frac{1}{f} = \frac{1}{d_o} + \frac{1}{d_i}` },
      { label: 'Magnification', latex: tex`m = -\frac{d_i}{d_o}` },
    ],
    tags: ['lenses', 'ray diagrams', 'images'],
  },
  {
    slug: 'youngs-double-slit',
    title: 'Young’s Double-Slit Experiment',
    category: 'optics',
    status: 'planned',
    summary: 'Measure fringe spacing from two narrow slits and determine the wavelength of light.',
    description:
      'Adjust slit separation, screen distance and wavelength to observe the resulting intensity pattern.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'double-slit',
    objectives: [
      'Measure fringe spacing and calculate the wavelength.',
      'Observe the single-slit diffraction envelope.',
    ],
    equations: [
      { label: 'Bright fringes', latex: tex`d\sin\theta = m\lambda` },
      { label: 'Fringe spacing (small angles)', latex: tex`\Delta y = \frac{\lambda L}{d}` },
    ],
    tags: ['diffraction', 'interference', 'wave optics'],
  },
  {
    slug: 'prism-dispersion',
    title: 'Dispersion in a Prism',
    category: 'optics',
    status: 'planned',
    summary: 'Split white light into a spectrum and relate deviation to wavelength-dependent refractive index.',
    description:
      'Send white light through a glass prism and measure the angular spread of the spectrum using a Cauchy dispersion model.',
    difficulty: 'advanced',
    durationMinutes: 20,
    glyph: 'prism',
    objectives: [
      'Relate refractive index to wavelength.',
      'Measure the angle of minimum deviation.',
    ],
    equations: [
      { label: 'Cauchy’s equation', latex: tex`n(\lambda) = A + \frac{B}{\lambda^2}` },
      { label: 'Minimum deviation', latex: tex`n = \frac{\sin\frac{A_p + \delta_\text{min}}{2}}{\sin\frac{A_p}{2}}` },
    ],
    tags: ['dispersion', 'spectrum', 'refraction'],
  },
];
