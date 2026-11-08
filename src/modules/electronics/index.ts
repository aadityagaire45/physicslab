import type { ExperimentDefinition } from '../types';

const tex = String.raw;

export const electronicsExperiments: readonly ExperimentDefinition[] = [
  {
    slug: 'diode-iv-characteristics',
    title: 'Diode I–V Characteristics',
    category: 'electronics',
    status: 'planned',
    summary: 'Sweep the voltage across a p–n junction diode and plot its exponential I–V curve.',
    description:
      'Measure forward and reverse bias behaviour of silicon and germanium diodes and fit the Shockley equation.',
    difficulty: 'intermediate',
    durationMinutes: 20,
    glyph: 'diode',
    featured: true,
    objectives: [
      'Identify the forward-bias turn-on region.',
      'Examine how temperature changes the characteristic.',
    ],
    equations: [
      { label: 'Shockley equation', latex: tex`I = I_s\left(e^{V/nV_T} - 1\right)` },
      { label: 'Thermal voltage', latex: tex`V_T = \frac{k_B T}{q}` },
    ],
    tags: ['semiconductors', 'diodes', 'non-linear'],
  },
  {
    slug: 'voltage-divider',
    title: 'Voltage Divider',
    category: 'electronics',
    status: 'planned',
    summary: 'Design a resistive divider and observe the effect of load resistance on output voltage.',
    description:
      'Choose resistor values to set an output voltage, then connect a load and quantify the loading error.',
    difficulty: 'introductory',
    durationMinutes: 10,
    glyph: 'divider',
    objectives: [
      'Calculate divider output voltage.',
      'Explain why loading reduces the output voltage.',
    ],
    equations: [{ label: 'Unloaded output', latex: tex`V_\text{out} = V_\text{in}\,\frac{R_2}{R_1 + R_2}` }],
    tags: ['circuits', 'sensors', 'design'],
  },
  {
    slug: 'logic-gates',
    title: 'Logic Gates and Truth Tables',
    category: 'electronics',
    status: 'planned',
    summary: 'Combine AND, OR and NOT gates and verify truth tables and Boolean identities.',
    description:
      'Build combinational circuits from basic gates and confirm De Morgan’s theorems interactively.',
    difficulty: 'introductory',
    durationMinutes: 15,
    glyph: 'logic',
    objectives: [
      'Construct truth tables for combinational circuits.',
      'Verify De Morgan’s theorems.',
    ],
    equations: [
      { label: 'De Morgan (NAND)', latex: tex`\overline{A \cdot B} = \overline{A} + \overline{B}` },
      { label: 'De Morgan (NOR)', latex: tex`\overline{A + B} = \overline{A} \cdot \overline{B}` },
    ],
    tags: ['digital', 'boolean algebra', 'logic'],
  },
  {
    slug: 'transistor-switch',
    title: 'Transistor as a Switch',
    category: 'electronics',
    status: 'planned',
    summary: 'Drive an NPN transistor between cut-off and saturation to switch a load.',
    description:
      'Choose a base resistor to saturate an NPN transistor and examine collector current and voltage in each region.',
    difficulty: 'advanced',
    durationMinutes: 25,
    glyph: 'transistor',
    objectives: [
      'Calculate base current needed for saturation.',
      'Identify cut-off, active and saturation regions.',
    ],
    equations: [
      { label: 'Current gain (active region)', latex: tex`I_C = \beta I_B` },
      { label: 'Base current', latex: tex`I_B = \frac{V_\text{in} - V_{BE}}{R_B}` },
    ],
    tags: ['transistors', 'switching', 'semiconductors'],
  },
];
