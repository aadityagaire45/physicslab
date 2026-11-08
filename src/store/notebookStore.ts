import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createId } from '@/utils/id';

export interface NotebookMeasurement {
  label: string;
  value: string;
}

export interface NotebookEntry {
  id: string;
  title: string;
  body: string;
  /** Slug of the experiment the entry was recorded from, if any. */
  experimentSlug?: string;
  measurements: NotebookMeasurement[];
  createdAt: number;
  updatedAt: number;
}

export type NewNotebookEntry = Pick<NotebookEntry, 'title' | 'body'> &
  Partial<Pick<NotebookEntry, 'experimentSlug' | 'measurements'>>;

interface NotebookState {
  entries: NotebookEntry[];
  addEntry: (entry: NewNotebookEntry) => string;
  updateEntry: (id: string, patch: Partial<Pick<NotebookEntry, 'title' | 'body'>>) => void;
  deleteEntry: (id: string) => void;
}

export const useNotebookStore = create<NotebookState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => {
        const now = Date.now();
        const id = createId();
        set((state) => ({
          entries: [
            {
              id,
              title: entry.title.trim() || 'Untitled entry',
              body: entry.body,
              experimentSlug: entry.experimentSlug,
              measurements: entry.measurements ?? [],
              createdAt: now,
              updatedAt: now,
            },
            ...state.entries,
          ],
        }));
        return id;
      },
      updateEntry: (id, patch) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e,
          ),
        })),
      deleteEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
    }),
    { name: 'physicslab:notebook', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
