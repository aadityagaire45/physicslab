import type { ComponentType } from 'react';

export type CategoryId =
  | 'mechanics'
  | 'electricity'
  | 'magnetism'
  | 'waves'
  | 'optics'
  | 'thermodynamics'
  | 'modern-physics'
  | 'electronics';

export type Difficulty = 'introductory' | 'intermediate' | 'advanced';

/**
 * - `available`: a working, verified interactive experiment.
 * - `planned`: specified in the catalogue but not yet implemented.
 */
export type ExperimentStatus = 'available' | 'planned';

/** Visual line-art motif used to illustrate an experiment. */
export type GlyphKind =
  | 'trajectory'
  | 'pendulum'
  | 'spring'
  | 'incline'
  | 'collision'
  | 'orbit'
  | 'circuit'
  | 'resistors'
  | 'capacitor'
  | 'charges'
  | 'wire-field'
  | 'cyclotron'
  | 'induction'
  | 'wave'
  | 'standing-wave'
  | 'interference'
  | 'doppler'
  | 'refraction'
  | 'lens'
  | 'double-slit'
  | 'prism'
  | 'gas'
  | 'heat'
  | 'cycle'
  | 'distribution'
  | 'photon'
  | 'decay'
  | 'spectrum'
  | 'diode'
  | 'divider'
  | 'logic'
  | 'transistor';

export interface Equation {
  /** Short human-readable label, e.g. "Time of flight". */
  label: string;
  /** KaTeX-compatible LaTeX source. */
  latex: string;
}

export type ExperimentComponent = ComponentType;
export type ExperimentLoader = () => Promise<{ default: ExperimentComponent }>;

interface ExperimentBase {
  /** URL-safe unique identifier. */
  slug: string;
  title: string;
  category: CategoryId;
  /** One-sentence description used on cards. */
  summary: string;
  /** Longer description shown on the experiment page. */
  description: string;
  difficulty: Difficulty;
  /** Typical time to complete the experiment, in minutes. */
  durationMinutes: number;
  glyph: GlyphKind;
  objectives: readonly string[];
  equations: readonly Equation[];
  tags: readonly string[];
  featured?: boolean;
}

export interface AvailableExperiment extends ExperimentBase {
  status: 'available';
  /** Lazily loads the interactive lab so each experiment is code-split. */
  load: ExperimentLoader;
}

export interface PlannedExperiment extends ExperimentBase {
  status: 'planned';
  load?: never;
}

export type ExperimentDefinition = AvailableExperiment | PlannedExperiment;
