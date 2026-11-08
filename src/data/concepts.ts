import type { CategoryId } from '@/modules/types';

const tex = String.raw;

export interface ConceptVariable {
  /** LaTeX symbol. */
  symbol: string;
  meaning: string;
  unit: string;
}

export interface Concept {
  id: string;
  title: string;
  category: CategoryId;
  summary: string;
  explanation: string;
  equation: string;
  variables: readonly ConceptVariable[];
  /** Validity conditions or key assumptions. */
  assumptions?: string;
  relatedExperiments: readonly string[];
}

export const CONCEPTS: readonly Concept[] = [
  {
    id: 'newtons-second-law',
    title: 'Newton’s Second Law',
    category: 'mechanics',
    summary: 'The net force on a body equals the rate of change of its momentum.',
    explanation:
      'For a body of constant mass, the net external force produces an acceleration in the same direction, proportional to the force and inversely proportional to the mass. It is the foundation of classical dynamics.',
    equation: tex`\vec{F}_\text{net} = \frac{d\vec{p}}{dt} = m\vec{a}`,
    variables: [
      { symbol: tex`\vec{F}_\text{net}`, meaning: 'Net external force', unit: 'N' },
      { symbol: 'm', meaning: 'Mass', unit: 'kg' },
      { symbol: tex`\vec{a}`, meaning: 'Acceleration', unit: 'm/s²' },
    ],
    assumptions: 'Inertial reference frame; speeds much less than the speed of light.',
    relatedExperiments: ['inclined-plane-friction', 'projectile-motion'],
  },
  {
    id: 'uniform-acceleration',
    title: 'Motion with Constant Acceleration',
    category: 'mechanics',
    summary: 'Position and velocity evolve quadratically and linearly in time under constant acceleration.',
    explanation:
      'When acceleration is constant, the kinematic equations follow directly from integration. Each Cartesian component can be treated independently, which is why projectile motion separates into uniform horizontal motion and uniformly accelerated vertical motion.',
    equation: tex`\vec{r}(t) = \vec{r}_0 + \vec{v}_0 t + \tfrac{1}{2}\vec{a}\,t^2`,
    variables: [
      { symbol: tex`\vec{r}_0`, meaning: 'Initial position', unit: 'm' },
      { symbol: tex`\vec{v}_0`, meaning: 'Initial velocity', unit: 'm/s' },
      { symbol: tex`\vec{a}`, meaning: 'Constant acceleration', unit: 'm/s²' },
    ],
    relatedExperiments: ['projectile-motion'],
  },
  {
    id: 'ohms-law',
    title: 'Ohm’s Law',
    category: 'electricity',
    summary: 'For ohmic conductors, current is proportional to the applied potential difference.',
    explanation:
      'Resistance is the ratio of voltage to current. Many metallic conductors at constant temperature are ohmic, giving a straight-line I–V graph through the origin; components such as diodes are not.',
    equation: tex`V = IR`,
    variables: [
      { symbol: 'V', meaning: 'Potential difference', unit: 'V' },
      { symbol: 'I', meaning: 'Current', unit: 'A' },
      { symbol: 'R', meaning: 'Resistance', unit: 'Ω' },
    ],
    assumptions: 'Constant temperature; ohmic material.',
    relatedExperiments: ['ohms-law', 'series-parallel-circuits', 'kirchhoff-laws', 'electrical-power-heating'],
  },
  {
    id: 'coulombs-law',
    title: 'Coulomb’s Law',
    category: 'electricity',
    summary: 'Point charges exert forces that vary with the inverse square of their separation.',
    explanation:
      'Like charges repel and unlike charges attract. The electrostatic force acts along the line joining the charges and obeys superposition: the total force on a charge is the vector sum of the forces from all others.',
    equation: tex`F = \frac{1}{4\pi\varepsilon_0}\frac{|q_1 q_2|}{r^2}`,
    variables: [
      { symbol: tex`q_1, q_2`, meaning: 'Point charges', unit: 'C' },
      { symbol: 'r', meaning: 'Separation', unit: 'm' },
      { symbol: tex`\varepsilon_0`, meaning: 'Vacuum permittivity', unit: 'F/m' },
    ],
    relatedExperiments: ['electric-field-point-charges'],
  },
  {
    id: 'lorentz-force',
    title: 'Lorentz Force',
    category: 'magnetism',
    summary: 'A moving charge in a magnetic field experiences a force perpendicular to its velocity.',
    explanation:
      'Because the magnetic force is always perpendicular to velocity, it does no work: it changes the direction of motion but not the speed. In a uniform field this produces circular or helical paths.',
    equation: tex`\vec{F} = q\left(\vec{E} + \vec{v}\times\vec{B}\right)`,
    variables: [
      { symbol: 'q', meaning: 'Charge', unit: 'C' },
      { symbol: tex`\vec{v}`, meaning: 'Velocity', unit: 'm/s' },
      { symbol: tex`\vec{B}`, meaning: 'Magnetic flux density', unit: 'T' },
    ],
    relatedExperiments: ['charged-particle-magnetic-field'],
  },
  {
    id: 'faradays-law',
    title: 'Faraday’s Law of Induction',
    category: 'magnetism',
    summary: 'A changing magnetic flux through a circuit induces an electromotive force.',
    explanation:
      'The induced EMF equals the negative rate of change of flux linkage. The minus sign expresses Lenz’s law: the induced current opposes the change that produced it, consistent with conservation of energy.',
    equation: tex`\varepsilon = -N\frac{d\Phi_B}{dt}`,
    variables: [
      { symbol: tex`\varepsilon`, meaning: 'Induced EMF', unit: 'V' },
      { symbol: 'N', meaning: 'Number of turns', unit: '—' },
      { symbol: tex`\Phi_B`, meaning: 'Magnetic flux', unit: 'Wb' },
    ],
    relatedExperiments: ['faradays-law-induction'],
  },
  {
    id: 'wave-equation',
    title: 'The Wave Relation',
    category: 'waves',
    summary: 'Wave speed equals frequency multiplied by wavelength.',
    explanation:
      'In one period a wave advances by one wavelength. Wave speed is set by the medium, while frequency is set by the source; the wavelength adjusts accordingly.',
    equation: tex`v = f\lambda`,
    variables: [
      { symbol: 'v', meaning: 'Wave speed', unit: 'm/s' },
      { symbol: 'f', meaning: 'Frequency', unit: 'Hz' },
      { symbol: tex`\lambda`, meaning: 'Wavelength', unit: 'm' },
    ],
    relatedExperiments: ['transverse-waves-string', 'standing-waves-harmonics'],
  },
  {
    id: 'superposition',
    title: 'Principle of Superposition',
    category: 'waves',
    summary: 'Overlapping linear waves add displacement point by point.',
    explanation:
      'Where waves meet, the resultant displacement is the algebraic sum of the individual displacements. Superposition explains interference, beats and standing waves.',
    equation: tex`y(x,t) = y_1(x,t) + y_2(x,t)`,
    variables: [{ symbol: tex`y_i`, meaning: 'Individual wave displacement', unit: 'm' }],
    assumptions: 'Linear medium (small amplitudes).',
    relatedExperiments: ['two-source-interference', 'standing-waves-harmonics'],
  },
  {
    id: 'snells-law',
    title: 'Snell’s Law',
    category: 'optics',
    summary: 'Light changes direction when crossing a boundary between media of different refractive index.',
    explanation:
      'Refraction occurs because light travels at different speeds in different media. Going from a higher to a lower index, rays bend away from the normal, and beyond the critical angle all light is reflected.',
    equation: tex`n_1\sin\theta_1 = n_2\sin\theta_2`,
    variables: [
      { symbol: tex`n_1, n_2`, meaning: 'Refractive indices', unit: '—' },
      { symbol: tex`\theta_1, \theta_2`, meaning: 'Angles from the normal', unit: 'rad' },
    ],
    relatedExperiments: ['refraction-snells-law', 'prism-dispersion'],
  },
  {
    id: 'thin-lens',
    title: 'Thin-Lens Equation',
    category: 'optics',
    summary: 'Object distance, image distance and focal length are related by a simple reciprocal law.',
    explanation:
      'For a thin lens, rays through the centre are undeviated and parallel rays pass through the focal point. Using the real-is-positive convention, a positive image distance indicates a real image.',
    equation: tex`\frac{1}{f} = \frac{1}{d_o} + \frac{1}{d_i}`,
    variables: [
      { symbol: 'f', meaning: 'Focal length', unit: 'm' },
      { symbol: tex`d_o`, meaning: 'Object distance', unit: 'm' },
      { symbol: tex`d_i`, meaning: 'Image distance', unit: 'm' },
    ],
    assumptions: 'Paraxial rays; lens thickness negligible.',
    relatedExperiments: ['thin-lens-imaging'],
  },
  {
    id: 'ideal-gas-law',
    title: 'Ideal Gas Law',
    category: 'thermodynamics',
    summary: 'Pressure, volume, temperature and amount of an ideal gas are linked by one equation of state.',
    explanation:
      'The ideal gas law combines Boyle’s, Charles’s and Gay-Lussac’s laws. It models real gases well at low pressure and high temperature, where intermolecular forces and molecular volume are negligible.',
    equation: tex`PV = nRT`,
    variables: [
      { symbol: 'P', meaning: 'Pressure', unit: 'Pa' },
      { symbol: 'V', meaning: 'Volume', unit: 'm³' },
      { symbol: 'n', meaning: 'Amount of substance', unit: 'mol' },
      { symbol: 'T', meaning: 'Absolute temperature', unit: 'K' },
    ],
    relatedExperiments: ['ideal-gas-laws'],
  },
  {
    id: 'first-law',
    title: 'First Law of Thermodynamics',
    category: 'thermodynamics',
    summary: 'Energy is conserved: internal energy changes by heat added minus work done by the system.',
    explanation:
      'Heat and work are two ways of transferring energy. The first law forbids perpetual-motion machines of the first kind and underpins the analysis of every heat engine.',
    equation: tex`\Delta U = Q - W`,
    variables: [
      { symbol: tex`\Delta U`, meaning: 'Change in internal energy', unit: 'J' },
      { symbol: 'Q', meaning: 'Heat supplied to the system', unit: 'J' },
      { symbol: 'W', meaning: 'Work done by the system', unit: 'J' },
    ],
    relatedExperiments: ['heat-engine-carnot', 'specific-heat-capacity'],
  },
  {
    id: 'photon-energy',
    title: 'Photon Energy',
    category: 'modern-physics',
    summary: 'Light is quantised into photons whose energy is proportional to frequency.',
    explanation:
      'Planck’s quantum hypothesis, extended by Einstein, explains why the photoelectric effect depends on frequency rather than intensity. Higher-frequency light carries more energy per photon.',
    equation: tex`E = hf = \frac{hc}{\lambda}`,
    variables: [
      { symbol: 'h', meaning: 'Planck constant', unit: 'J·s' },
      { symbol: 'f', meaning: 'Frequency', unit: 'Hz' },
      { symbol: tex`\lambda`, meaning: 'Wavelength', unit: 'm' },
    ],
    relatedExperiments: ['photoelectric-effect', 'hydrogen-spectrum'],
  },
  {
    id: 'radioactive-decay',
    title: 'Exponential Decay',
    category: 'modern-physics',
    summary: 'Unstable nuclei decay randomly, producing an exponential decrease in their number.',
    explanation:
      'Each nucleus has a constant probability of decaying per unit time. For large populations this gives exponential decay characterised by the half-life, the time for half of the nuclei to decay.',
    equation: tex`N(t) = N_0 e^{-\lambda t}, \qquad t_{1/2} = \frac{\ln 2}{\lambda}`,
    variables: [
      { symbol: tex`N_0`, meaning: 'Initial number of nuclei', unit: '—' },
      { symbol: tex`\lambda`, meaning: 'Decay constant', unit: 's⁻¹' },
      { symbol: tex`t_{1/2}`, meaning: 'Half-life', unit: 's' },
    ],
    relatedExperiments: ['radioactive-decay'],
  },
  {
    id: 'shockley-diode',
    title: 'Shockley Diode Equation',
    category: 'electronics',
    summary: 'Current through a p–n junction grows exponentially with forward voltage.',
    explanation:
      'Under forward bias, the barrier at the junction is lowered and current rises exponentially. Under reverse bias, only the tiny saturation current flows until breakdown.',
    equation: tex`I = I_s\left(e^{V/nV_T} - 1\right)`,
    variables: [
      { symbol: tex`I_s`, meaning: 'Saturation current', unit: 'A' },
      { symbol: 'n', meaning: 'Ideality factor', unit: '—' },
      { symbol: tex`V_T`, meaning: 'Thermal voltage, kT/q', unit: 'V' },
    ],
    assumptions: 'Excludes series resistance and reverse breakdown.',
    relatedExperiments: ['diode-iv-characteristics'],
  },
  {
    id: 'voltage-divider',
    title: 'Voltage Divider',
    category: 'electronics',
    summary: 'Two series resistors split a voltage in proportion to their resistances.',
    explanation:
      'The same current flows through both resistors, so each drops a share of the supply proportional to its resistance. Dividers set reference voltages and read resistive sensors.',
    equation: tex`V_\text{out} = V_\text{in}\frac{R_2}{R_1 + R_2}`,
    variables: [
      { symbol: tex`V_\text{in}`, meaning: 'Input voltage', unit: 'V' },
      { symbol: tex`R_1, R_2`, meaning: 'Series resistances', unit: 'Ω' },
    ],
    assumptions: 'No load current drawn from the output.',
    relatedExperiments: ['voltage-divider'],
  },
];
