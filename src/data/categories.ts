import {
  Atom,
  Cpu,
  Flame,
  Magnet,
  Orbit,
  Radio,
  ScanEye,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryId } from '@/modules/types';

export interface LabCategory {
  id: CategoryId;
  name: string;
  /** Brief identity statement for the laboratory. */
  tagline: string;
  description: string;
  /** Identity colour (hex) used for accents, tiles and strips. */
  color: string;
  icon: LucideIcon;
  topics: readonly string[];
}

export const CATEGORIES: readonly LabCategory[] = [
  {
    id: 'mechanics',
    name: 'Mechanics',
    tagline: 'Motion, forces and energy',
    description:
      'Kinematics, Newtonian dynamics, momentum, oscillations and gravitation — the behaviour of bodies under forces.',
    color: '#f59e0b',
    icon: Orbit,
    topics: ['Kinematics', 'Dynamics', 'Momentum', 'Oscillations', 'Gravitation'],
  },
  {
    id: 'electricity',
    name: 'Electricity',
    tagline: 'Charge, current and circuits',
    description:
      'Electrostatics, electric fields, current, resistance and transient behaviour of DC circuits.',
    color: '#eab308',
    icon: Zap,
    topics: ['Electrostatics', 'Electric fields', 'DC circuits', 'Capacitance'],
  },
  {
    id: 'magnetism',
    name: 'Magnetism',
    tagline: 'Fields, forces and induction',
    description:
      'Magnetic fields of currents, forces on moving charges and electromagnetic induction.',
    color: '#ec4899',
    icon: Magnet,
    topics: ['Magnetic fields', 'Lorentz force', 'Induction', 'Solenoids'],
  },
  {
    id: 'waves',
    name: 'Waves',
    tagline: 'Oscillation in space and time',
    description:
      'Travelling and standing waves, superposition, interference, resonance and the Doppler effect.',
    color: '#06b6d4',
    icon: Radio,
    topics: ['Travelling waves', 'Superposition', 'Resonance', 'Doppler effect'],
  },
  {
    id: 'optics',
    name: 'Optics',
    tagline: 'Rays, lenses and light',
    description:
      'Geometric optics with reflection, refraction and lenses, and wave optics with diffraction and interference.',
    color: '#6366f1',
    icon: ScanEye,
    topics: ['Refraction', 'Lenses', 'Diffraction', 'Dispersion'],
  },
  {
    id: 'thermodynamics',
    name: 'Thermodynamics',
    tagline: 'Heat, temperature and entropy',
    description:
      'Gas laws, heat transfer, thermodynamic cycles and the statistical picture of temperature.',
    color: '#ef4444',
    icon: Flame,
    topics: ['Gas laws', 'Calorimetry', 'Heat engines', 'Kinetic theory'],
  },
  {
    id: 'modern-physics',
    name: 'Modern Physics',
    tagline: 'Quanta, atoms and nuclei',
    description:
      'Photons, atomic spectra, wave–particle duality and radioactive decay — physics beyond the classical limit.',
    color: '#a855f7',
    icon: Atom,
    topics: ['Photoelectric effect', 'Atomic spectra', 'Radioactivity', 'Blackbody radiation'],
  },
  {
    id: 'electronics',
    name: 'Electronics',
    tagline: 'Semiconductors and signals',
    description:
      'Diodes, transistors, dividers and digital logic — the components behind modern devices.',
    color: '#22c55e',
    icon: Cpu,
    topics: ['Diodes', 'Transistors', 'Voltage dividers', 'Logic gates'],
  },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: CategoryId): LabCategory {
  const category = CATEGORY_MAP.get(id);
  if (!category) throw new Error(`Unknown category: ${id}`);
  return category;
}

export function isCategoryId(value: string | null | undefined): value is CategoryId {
  return !!value && CATEGORY_MAP.has(value as CategoryId);
}
