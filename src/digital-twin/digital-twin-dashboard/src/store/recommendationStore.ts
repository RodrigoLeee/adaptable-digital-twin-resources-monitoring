import { create } from 'zustand';
import {
  RecommendationOutput,
  ClientProfile,
  SLAConfig,
} from '../types';

interface RecommendationStore {
  current: RecommendationOutput | null;
  history: RecommendationOutput[];
  clientProfile: ClientProfile | null;
  slaConfig: SLAConfig;
  isConnected: boolean;

  setCurrent: (r: RecommendationOutput) => void;
  setClientProfile: (p: ClientProfile) => void;
  setSlaConfig: (s: SLAConfig) => void;
  setConnected: (v: boolean) => void;
}

export const useRecommendationStore = create<RecommendationStore>((set) => ({
  current: null,
  history: [],
  clientProfile: null,
  slaConfig: {
    max_energy_kwh: 1000,
    max_wait_s: 60,
    max_cost_usd: 500,
  },
  isConnected: false,

  setCurrent: (r) =>
    set((state) => ({
      current: r,
      history: [r, ...state.history].slice(0, 50),
    })),

  setClientProfile: (p) => set({ clientProfile: p }),

  setSlaConfig: (s) => set({ slaConfig: s }),

  setConnected: (v) => set({ isConnected: v }),
}));
