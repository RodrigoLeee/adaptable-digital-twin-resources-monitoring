import { useRecommendationStore } from '../store/recommendationStore';
import { RecommendationOutput } from '../types';

export function useHistory(): RecommendationOutput[] {
  return useRecommendationStore((s) => s.history);
}
