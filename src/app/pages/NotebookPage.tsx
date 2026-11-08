import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Download, NotebookPen, Plus, Trash2 } from 'lucide-react';
import { EXPERIMENTS, getExperiment } from '@/modules/registry';
import { useNotebookStore } from '@/store/notebookStore';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { downloadTextFile } from '@/utils/download';
import { formatDateTime } from '@/utils/time';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel, PanelHeader } from '@/components/common/Panel';
import { SelectField } from '@/components/controls/SelectField';

const EXPERIMENT_OPTIONS = [
  { value: '', label: 'General observation (no specific experiment)' },
  ...EXPERIMENTS.map((e) => ({ value: e.slug, label: e.title })),
];

export default function NotebookPage() {
  useDocumentTitle('My Notebook');
  const entries = useNotebookStore((s) => s.entries);
  const addEntry = useNotebookStore((s) => s.addEntry);
  const updateEntry = useNotebookStore((s) => s.updateEntry);
  const deleteEntry = useNotebookStore((s) => s.deleteEntry);

  const [title, setTitle] = useState('');
  const [experimentSlug, setExperimentSlug] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !body.trim()) return;
    addEntry({
      title: title.trim() || 'Laboratory observation',
      body: body.trim(),
      experimentSlug: experimentSlug || undefined,
    });
    setTitle('');
    setBody('');
  };

  const exportMarkdown = () => {
    const md = [
      '# PHYSQORA Laboratory Notebook',
      '',
      ...entries.flatMap((entry) => {
        const exp = getExperiment(entry.experimentSlug);
        const lines = [
          `## ${entry.title}`,
          `- Recorded: ${formatDateTime(entry.createdAt)}`,
          ...(exp ? [`- Experiment: ${exp.title}`] : []),
          '',
          entry.body || '_No commentary._',
          '',
        ];
        if (entry.measurements.length > 0) {
          lines.push('| Quantity | Value |', '| --- | --- |');
          for (const m of entry.measurements) lines.push(`| ${m.label} | ${m.value} |`);
          lines.push('');
        }
        return lines;
      }),
    ].join('\n');
    downloadTextFile('physqora-notebook.md', md, 'text/markdown');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Notebook"
        title="Laboratory Notebook"
        description="Record hypotheses, measurements and conclusions. Entries are persisted locally in your browser and can be exported as Markdown."
        actions={
          entries.length > 0 ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={exportMarkdown}
              icon={<Download className="size-3.5" aria-hidden />}
            >
              Export Markdown
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Panel>
          <PanelHeader title="New Entry" icon={<Plus className="size-4" aria-hidden />} />
          <form onSubmit={onCreate} className="space-y-4 p-5">
            <div>
              <label htmlFor="note-title" className="mb-1.5 block text-[13px] font-medium text-fg-soft">
                Title
              </label>
              <input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Complementary angles test at 20 m/s"
                className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
              />
            </div>

            <SelectField
              label="Linked experiment"
              value={experimentSlug}
              options={EXPERIMENT_OPTIONS}
              onChange={setExperimentSlug}
            />

            <div>
              <label htmlFor="note-body" className="mb-1.5 block text-[13px] font-medium text-fg-soft">
                Observations & notes
              </label>
              <textarea
                id="note-body"
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your hypothesis, procedure or conclusions…"
                className="w-full rounded-lg border border-line bg-surface p-3 text-[13px] leading-relaxed text-fg placeholder:text-subtle focus:border-accent focus:outline-none"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Add to Notebook
            </Button>
          </form>
        </Panel>

        <div className="space-y-4">
          {entries.length === 0 ? (
            <EmptyState
              icon={<NotebookPen className="size-5" aria-hidden />}
              title="Your notebook is empty"
              description="Create an entry on the left, or use the “Record run in My Notebook” button inside an interactive experiment."
            />
          ) : (
            entries.map((entry) => {
              const exp = getExperiment(entry.experimentSlug);
              const isEditing = editingId === entry.id;
              return (
                <Panel key={entry.id} className="p-5">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        aria-label="Edit title"
                        className="h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm font-semibold text-fg focus:border-accent focus:outline-none"
                      />
                      <textarea
                        rows={4}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        aria-label="Edit observations"
                        className="w-full rounded-lg border border-line bg-surface-2 p-3 text-[13px] text-fg focus:border-accent focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            updateEntry(entry.id, { title: editTitle.trim() || entry.title, body: editBody });
                            setEditingId(null);
                          }}
                        >
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-fg">{entry.title}</h3>
                          <p className="mt-0.5 text-[12px] text-muted">
                            {formatDateTime(entry.updatedAt)}
                            {exp && (
                              <>
                                {' · '}
                                <Link to={`/experiments/${exp.slug}`} className="text-accent hover:underline">
                                  {exp.title}
                                </Link>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(entry.id);
                              setEditTitle(entry.title);
                              setEditBody(entry.body);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete ${entry.title}`}
                            onClick={() => deleteEntry(entry.id)}
                            icon={<Trash2 className="size-3.5" aria-hidden />}
                          />
                        </div>
                      </div>

                      {entry.body && (
                        <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-fg-soft">
                          {entry.body}
                        </p>
                      )}

                      {entry.measurements.length > 0 && (
                        <dl className="mt-4 grid gap-2 rounded-lg border border-line bg-surface-2/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
                          {entry.measurements.map((m) => (
                            <div key={m.label}>
                              <dt className="text-[11.5px] text-muted">{m.label}</dt>
                              <dd className="tabular text-[13px] font-semibold text-fg">{m.value}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </>
                  )}
                </Panel>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
