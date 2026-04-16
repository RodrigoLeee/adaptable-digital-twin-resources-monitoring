import { useState } from 'react';
import { postManualCollect } from '../api/collector';
import { DatacenterState, SLAConfig, ClientProfile, RecommendationOutput } from '../types';

interface UseRecommendationReturn {
  loading: boolean;
  error: string | null;
  result: RecommendationOutput | null;
  send: (
    state: DatacenterState,
    sla: SLAConfig,
    profile: ClientProfile
  ) => Promise<void>;
}

export function useRecommendation(): UseRecommendationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationOutput | null>(null);

  async function send(
    state: DatacenterState,
    sla: SLAConfig,
    profile: ClientProfile
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await postManualCollect({ state, sla, client_profile: profile });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, result, send };
}
