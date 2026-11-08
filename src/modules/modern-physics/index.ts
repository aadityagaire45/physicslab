import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const modernPhysicsExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'photoelectric-effect',
    title: 'Photoelectric Effect',
    category: 'modern-physics',
    status: 'planned',
    summary: 'Illuminate a metal surface and measure stopping potential to determine Planck’s constant.',
    description:
      'Vary light wavelength and intensity, measure photocurrent and stopping voltage, and find the work function of different metals.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'photon',
    featured: true,
    objectives: [
      'Show that electron energy depends on frequency, not intensity.',
      'Determine Planck’s constant from a stopping-potential graph.',
    ],
    equations: [
      { label: 'Einstein’s equation', latex: tex`K_\text{max} = hf - \phi` },
      { label: 'Stopping potential', latex: tex`eV_s = K_\text{max}` },
    ],
    tags: ['quantum', 'photons', 'work function'],
  },
  {
    slug: 'radioactive-decay',
    title: 'Radioactive Decay',
    category: 'modern-physics',
    status: 'planned',
    summary: 'Model the stochastic decay of nuclei and measure half-life from count data.',
    description:
      'Simulate a population of unstable nuclei, compare random decay with the exponential law and determine the half-life.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'decay',
    objectives: [
      'Show that decay is random for individual nuclei but exponential in aggregate.',
      'Determine half-life from a decay curve.',
    ],
    equations: [
      { label: 'Decay law', latex: tex`N(t) = N_0\, e^{-\lambda t}` },
      { label: 'Half-life', latex: tex`t_{1/2} = \frac{\ln 2}{\lambda}` },
    ],
    tags: ['nuclear', 'half-life', 'statistics'],
  },
  {
    slug: 'hydrogen-spectrum',
    title: 'Hydrogen Spectrum and the Bohr Model',
    category: 'modern-physics',
    status: 'planned',
    summary: 'Excite hydrogen atoms and match emission lines to transitions between energy levels.',
    description:
      'Explore the Lyman, Balmer and Paschen series and compute emitted wavelengths from the Rydberg formula.',
    difficulty: 'advanced',
    durationMinutes: 20,
    glyph: 'spectrum',
    objectives: [
      'Relate spectral lines to electron transitions.',
      'Calculate wavelengths of the Balmer series.',
    ],
    equations: [
      { label: 'Energy levels', latex: tex`E_n = -\frac{13.6\ \text{eV}}{n^2}` },
      { label: 'Rydberg formula', latex: tex`\frac{1}{\lambda} = R_H\left(\frac{1}{n_1^2} - \frac{1}{n_2^2}\right)` },
    ],
    tags: ['atomic physics', 'spectra', 'quantisation'],
  },
  {
    slug: 'blackbody-radiation',
    title: 'Blackbody Radiation',
    category: 'modern-physics',
    status: 'planned',
    summary: 'Plot Planck spectra at different temperatures and verify Wien’s displacement law.',
    description:
      'Compare Planck’s law with the classical Rayleigh–Jeans prediction and examine the ultraviolet catastrophe.',
    difficulty: 'advanced',
    durationMinutes: 20,
    glyph: 'distribution',
    objectives: [
      'Locate the peak wavelength as temperature changes.',
      'Contrast quantum and classical predictions.',
    ],
    equations: [
      {
        label: 'Planck’s law',
        latex: tex`B_\lambda(T) = \frac{2hc^2}{\lambda^5}\,\frac{1}{e^{hc/\lambda k_B T} - 1}`,
      },
      { label: 'Wien’s displacement law', latex: tex`\lambda_\text{max} T = b` },
    ],
    tags: ['quantum', 'thermal radiation', 'spectra'],
  },
];
