import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const mechanicsExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'projectile-motion',
    title: 'Projectile Motion',
    category: 'mechanics',
    status: 'available',
    load: () => import('./projectile-motion/ProjectileMotionLab'),
    summary: 'Launch a projectile and measure its range, peak height and flight time under uniform gravity.',
    description:
      'Investigate two-dimensional motion under constant gravitational acceleration. Adjust launch speed, angle, launch height and gravitational field, then compare trajectories. The simulation uses the exact kinematic solution and neglects air resistance.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'trajectory',
    featured: true,
    objectives: [
      'Resolve the launch velocity into independent horizontal and vertical components.',
      'Determine how launch angle affects range and identify the maximum-range angle on level ground.',
      'Compare projectile behaviour in different gravitational fields.',
    ],
    equations: [
      { label: 'Position', latex: tex`x = v_0 \cos\theta\, t,\qquad y = h + v_0 \sin\theta\, t - \tfrac{1}{2} g t^2` },
      { label: 'Time of flight', latex: tex`T = \frac{v_0\sin\theta + \sqrt{v_0^2\sin^2\theta + 2gh}}{g}` },
      { label: 'Maximum height', latex: tex`H = h + \frac{v_0^2 \sin^2\theta}{2g}` },
      { label: 'Range on level ground (h = 0)', latex: tex`R = \frac{v_0^2 \sin 2\theta}{g}` },
    ],
    tags: ['kinematics', 'gravity', 'trajectory', 'vectors'],
  },
  {
    slug: 'simple-pendulum',
    title: 'Simple Pendulum',
    category: 'mechanics',
    status: 'planned',
    summary: 'Measure the period of a pendulum and test the small-angle approximation against the exact solution.',
    description:
      'Explore how the period of an ideal pendulum depends on length, gravitational field and amplitude, and quantify where the small-angle approximation breaks down.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'pendulum',
    featured: true,
    objectives: [
      'Verify that the small-angle period is independent of mass and amplitude.',
      'Measure the deviation from the small-angle period at large amplitudes.',
    ],
    equations: [
      { label: 'Small-angle period', latex: tex`T_0 = 2\pi\sqrt{\frac{L}{g}}` },
      { label: 'Exact period', latex: tex`T = 4\sqrt{\frac{L}{g}}\; K\!\left(\sin\frac{\theta_0}{2}\right)` },
    ],
    tags: ['oscillations', 'period', 'simple harmonic motion'],
  },
  {
    slug: 'spring-mass-oscillator',
    title: 'Damped Spring–Mass Oscillator',
    category: 'mechanics',
    status: 'planned',
    summary: 'Study simple harmonic motion and the underdamped, critical and overdamped regimes.',
    description:
      'Attach a mass to an ideal spring, add linear damping and observe how displacement, velocity and energy evolve in each damping regime.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'spring',
    objectives: [
      'Relate the oscillation period to mass and spring constant.',
      'Classify motion by comparing the damping rate with the natural frequency.',
    ],
    equations: [
      { label: 'Equation of motion', latex: tex`m\ddot{x} + b\dot{x} + kx = 0` },
      { label: 'Natural period', latex: tex`T = 2\pi\sqrt{\frac{m}{k}}` },
    ],
    tags: ['oscillations', 'damping', 'energy'],
  },
  {
    slug: 'inclined-plane-friction',
    title: 'Inclined Plane and Friction',
    category: 'mechanics',
    status: 'planned',
    summary: 'Resolve forces on a block on a slope and determine the coefficient of kinetic friction.',
    description:
      'Place a block on an adjustable incline, vary the angle and surface friction, and analyse the free-body diagram and resulting acceleration.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'incline',
    objectives: [
      'Resolve weight into components parallel and perpendicular to the slope.',
      'Find the angle at which the block begins to slide.',
    ],
    equations: [
      { label: 'Acceleration down the slope', latex: tex`a = g\,(\sin\theta - \mu_k \cos\theta)` },
      { label: 'Onset of sliding', latex: tex`\tan\theta_c = \mu_s` },
    ],
    tags: ['forces', 'friction', 'free-body diagram'],
  },
  {
    slug: 'collisions-momentum',
    title: 'Collisions and Momentum',
    category: 'mechanics',
    status: 'planned',
    summary: 'Compare elastic and inelastic one-dimensional collisions and track momentum and kinetic energy.',
    description:
      'Collide two carts on a frictionless track with adjustable masses, velocities and coefficient of restitution.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'collision',
    objectives: [
      'Confirm conservation of linear momentum in all collisions.',
      'Measure the kinetic energy lost as a function of the coefficient of restitution.',
    ],
    equations: [
      { label: 'Momentum conservation', latex: tex`m_1 u_1 + m_2 u_2 = m_1 v_1 + m_2 v_2` },
      { label: 'Coefficient of restitution', latex: tex`e = \frac{v_2 - v_1}{u_1 - u_2}` },
    ],
    tags: ['momentum', 'energy', 'collisions'],
  },
  {
    slug: 'orbital-motion',
    title: 'Orbital Motion and Kepler’s Laws',
    category: 'mechanics',
    status: 'planned',
    summary: 'Simulate a body orbiting a central mass and verify Kepler’s three laws numerically.',
    description:
      'Integrate Newtonian gravitation to trace elliptical orbits, measure swept areas and compare orbital periods with semi-major axes.',
    difficulty: 'advanced',
    durationMinutes: 25,
    glyph: 'orbit',
    objectives: [
      'Observe equal areas swept in equal times.',
      'Verify the relationship between period and semi-major axis.',
    ],
    equations: [
      { label: 'Newtonian gravitation', latex: tex`F = \frac{G M m}{r^2}` },
      { label: 'Kepler’s third law', latex: tex`T^2 = \frac{4\pi^2}{G M} a^3` },
    ],
    tags: ['gravitation', 'orbits', 'numerical integration'],
  },
];
