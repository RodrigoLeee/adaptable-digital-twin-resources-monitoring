import { CollectorStore, DatacenterState, Recommendation, ClientProfile } from '../types';

const store: CollectorStore = {
  lastState: null,
  lastRecommendation: null,
  lastCollection: null,
  lastClientProfile: null,
  collectionsTotal: 0,
};

export function getStore(): Readonly<CollectorStore> {
  return store;
}

export function setLastState(state: DatacenterState, profile: ClientProfile): void {
  store.lastState = state;
  store.lastClientProfile = profile;
  store.lastCollection = new Date().toISOString();
  store.collectionsTotal += 1;
}

export function setLastRecommendation(rec: Recommendation): void {
  store.lastRecommendation = rec;
}

export function getLastKnownState(): DatacenterState | null {
  return store.lastState;
}

export function getLastKnownProfile(): ClientProfile | null {
  return store.lastClientProfile;
}
