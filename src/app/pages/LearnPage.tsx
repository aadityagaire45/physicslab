import { useEffect, useState, type CSSProperties } from 'react';
import { Link, useLocation } from 'react-router';
import { CATEGORIES, getCategory } from '@/data/categories';
import { CONCEPTS } from '@/data/concepts';
import {
  AVOGADRO_CONSTANT,
  BOLTZMANN_CONSTANT,
  COULOMB_CONSTANT,
  ELECTRON_MASS,
  ELEMENTARY_CHARGE,
  GAS_CONSTANT,
  GRAVITATIONAL_CONSTANT,
  PLANCK_CONSTANT,
  PROTON_MASS,
  SPEED_OF_LIGHT,
  STANDARD_GRAVITY,
  VACUUM_PERMEABILITY,
  VACUUM_PERMITTIVITY,
} from '@/engine/units/constants';
import { formatNumber } from '@/engine/units/format';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { getExperiment } from '@/modules/registry';
import type { CategoryId } from '@/modules/types';
import { cn } from '@/utils/cn';
import { MathFormula } from '@/components/common/MathFormula';
import { PageHeader, SectionHeading } from '@/components/common/PageHeader';
import { Panel, PanelHeader } from '@/components/common/Panel';

const FUNDAMENTAL_CONSTANTS = [
  { name: 'Speed of light in vacuum', symbol: 'c', value: formatNumber(SPEED_OF_LIGHT, 6), unit: 'm/s' },
  { name: 'Planck constant', symbol: 'h', value: formatNumber(PLANCK_CONSTANT, 4), unit: 'J·s' },
  { name: 'Elementary charge', symbol: 'e', value: formatNumber(ELEMENTARY_CHARGE, 4), unit: 'C' },
  { name: 'Boltzmann constant', symbol: 'k_B', value: formatNumber(BOLTZMANN_CONSTANT, 4), unit: 'J/K' },
  { name: 'Avogadro constant', symbol: 'N_A', value: formatNumber(AVOGADRO_CONSTANT, 4), unit: 'mol⁻¹' },
  { name: 'Molar gas constant', symbol: 'R', value: formatNumber(GAS_CONSTANT, 4), unit: 'J/(mol·K)' },
  { name: 'Standard gravity', symbol: 'g_n', value: formatNumber(STANDARD_GRAVITY, 5), unit: 'm/s²' },
  { name: 'Gravitational constant', symbol: 'G', value: formatNumber(GRAVITATIONAL_CONSTANT, 4), unit: 'm³/(kg·s²)' },
  { name: 'Vacuum permittivity', symbol: String.raw`\varepsilon_0`, value: formatNumber(VACUUM_PERMITTIVITY, 4), unit: 'F/m' },
  { name: 'Vacuum permeability', symbol: String.raw`\mu_0`, value: formatNumber(VACUUM_PERMEABILITY, 4), unit: 'N/A²' },
  { name: 'Coulomb constant', symbol: 'k_e', value: formatNumber(COULOMB_CONSTANT, 4), unit: 'N·m²/C²' },
  { name: 'Electron mass', symbol: 'm_e', value: formatNumber(ELECTRON_MASS, 4), unit: 'kg' },
  { name: 'Proton mass', symbol: 'm_p', value: formatNumber(PROTON_MASS, 4), unit: 'kg' },
];

export default function LearnPage() {
  useDocumentTitle('Learn');
  const { hash } = useLocation();
  const targetId = hash.startsWith('#') ? decodeURIComponent(hash.slice(1)) : '';
  const [category, setCategory] = useState<CategoryId | null>(null);

  // If a hash points to a concept hidden by the current category filter, clear the filter
  // and scroll the target card into view.
  useEffect(() => {
    if (!targetId) return;
    const targetConcept = CONCEPTS.find((c) => c.id === targetId);
    if (!targetConcept) return;
    setCategory((current) => (current && current !== targetConcept.category ? null : current));
  }, [targetId]);

  useEffect(() => {
    if (!targetId) return;
    const element = document.getElementById(targetId);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [targetId, category]);

  const visible = category ? CONCEPTS.filter((c) => c.category === category) : CONCEPTS;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Learn"
        title="Principles, Laws & Physical Constants"
        description="Concise reference sheets for the equations used across PHYSQORA, with SI units, symbol definitions and validity assumptions."
      />

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter concepts by laboratory">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={cn(
            'h-7.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors',
            category === null
              ? 'border-accent/40 bg-accent-soft text-accent'
              : 'border-line bg-surface text-muted hover:text-fg',
          )}
        >
          All topics ({CONCEPTS.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            style={{ '--cat': c.color } as CSSProperties}
            className={cn(
              'inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium transition-colors',
              category === c.id
                ? 'border-line-strong bg-surface text-fg'
                : 'border-line bg-surface-2/60 text-muted hover:text-fg',
            )}
          >
            <span className="cat-strip size-2 rounded-full" aria-hidden />
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {visible.map((concept) => {
          const cat = getCategory(concept.category);
          const isTargeted = concept.id === targetId;
          return (
            <Panel
              key={concept.id}
              id={concept.id}
              style={{ '--cat': cat.color } as CSSProperties}
              className={cn(
                'flex flex-col p-5 scroll-mt-24',
                isTargeted && 'border-accent/60 ring-2 ring-accent/40',
              )}
            >
              <span className="cat-text text-[11.5px] font-semibold tracking-wider uppercase">{cat.name}</span>
              <h2 className="mt-1 text-base font-semibold text-fg">{concept.title}</h2>
              <p className="mt-1 text-[13px] font-medium text-fg-soft">{concept.summary}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{concept.explanation}</p>

              <div className="my-4 rounded-lg border border-line bg-surface-2/60 px-4 py-3">
                <MathFormula latex={concept.equation} display />
              </div>

              <dl className="grid gap-1.5 text-[12.5px] sm:grid-cols-2">
                {concept.variables.map((v) => (
                  <div key={v.meaning} className="flex items-baseline gap-2">
                    <dt className="shrink-0">
                      <MathFormula latex={v.symbol} />
                    </dt>
                    <dd className="text-muted">
                      — {v.meaning} <span className="text-subtle">({v.unit})</span>
                    </dd>
                  </div>
                ))}
              </dl>

              {concept.assumptions && (
                <p className="mt-3 text-[12px] text-subtle">
                  <strong className="font-medium text-muted">Validity: </strong>
                  {concept.assumptions}
                </p>
              )}

              {concept.relatedExperiments.length > 0 && (
                <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-3 mt-4 text-[12px]">
                  <span className="text-subtle">Experiments:</span>
                  {concept.relatedExperiments.map((slug) => {
                    const exp = getExperiment(slug);
                    if (!exp) return null;
                    return (
                      <Link key={slug} to={`/experiments/${slug}`} className="font-medium text-accent hover:underline">
                        {exp.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </Panel>
          );
        })}
      </div>

      <section>
        <SectionHeading
          title="CODATA Fundamental Physical Constants"
          description="Values exported by src/engine/units/constants.ts and used across all calculations."
        />
        <Panel className="overflow-hidden">
          <PanelHeader title="SI Reference Table" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-line bg-surface-2 text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Quantity</th>
                  <th className="px-4 py-2.5 font-medium">Symbol</th>
                  <th className="px-4 py-2.5 font-medium">Value</th>
                  <th className="px-4 py-2.5 font-medium">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {FUNDAMENTAL_CONSTANTS.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-2 text-fg">{c.name}</td>
                    <td className="px-4 py-2">
                      <MathFormula latex={c.symbol} />
                    </td>
                    <td className="tabular px-4 py-2 text-fg-soft">{c.value}</td>
                    <td className="px-4 py-2 text-muted">{c.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}
