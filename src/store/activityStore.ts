import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface RecentExperiment {
  slug: string;
  /** Epoch milliseconds of the most recent visit. */
  openedAt: number;
}

interface ActivityState {
  recent: RecentExperiment[];
  /** Total number of experiment sessions started. */
  sessions: number;
  challengesAttempted: number;
  challengesSolved: number;
  currentStreak: number;
  bestStreak: number;
  recordExperimentOpen: (slug: string, now?: number) => void;
  recordChallengeResult: (correct: boolean) => void;
  clearActivity: () => void;
}

export const MAX_RECENT = 8;

const initialState = {
  recent: [] as RecentExperiment[],
  sessions: 0,
  challengesAttempted: 0,
  challengesSolved: 0,
  currentStreak: 0,
  bestStreak: 0,
};

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      ...initialState,
      recordExperimentOpen: (slug, now = Date.now()) =>
        set((state) => ({
          sessions: state.sessions + 1,
          recent: [{ slug, openedAt: now }, ...state.recent.filter((r) => r.slug !== slug)].slice(
            0,
            MAX_RECENT,
          ),
        })),
      recordChallengeResult: (correct) =>
        set((state) => {
          const currentStreak = correct ? state.currentStreak + 1 : 0;
          return {
            challengesAttempted: state.challengesAttempted + 1,
            challengesSolved: state.challengesSolved + (correct ? 1 : 0),
            currentStreak,
            bestStreak: Math.max(state.bestStreak, currentStreak),
          };
        }),
      clearActivity: () => set(initialState),
    }),
    { name: 'physicslab:activity', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
