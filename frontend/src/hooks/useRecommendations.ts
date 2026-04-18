import { useState } from 'react';
import type { ReasoningChain, RecommendResponse } from '../types';

const API = 'http://localhost:8000';

const ATTRIBUTE_KEYS = [
  'price_sensitivity',
  'sound_quality',
  'comfort',
  'battery_life',
  'portability',
  'noise_cancellation',
];

const DEFAULT_PREFERENCES: Record<string, number> = {
  price_sensitivity: 0.5,
  sound_quality: 0.7,
  comfort: 0.6,
  battery_life: 0.6,
  portability: 0.5,
  noise_cancellation: 0.7,
};

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<ReasoningChain[]>([]);
  const [preferenceVector, setPreferenceVector] = useState<Record<string, number>>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = async (message: string, overrideVector?: number[]) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, preference_vector: overrideVector ?? null }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: RecommendResponse = await res.json();
      setRecommendations(data.recommendations);
      setPreferenceVector(data.preference_vector);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch(`${API}/recommend/reset`, { method: 'POST' });
      await query('show me headphones');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
      setLoading(false);
    }
  };

  const updateSlider = (key: string, value: number) => {
    const updated = { ...preferenceVector, [key]: value };
    setPreferenceVector(updated);
    const vector = ATTRIBUTE_KEYS.map((k) => updated[k] ?? 0.5);
    query('update preferences', vector);
  };

  return { recommendations, preferenceVector, loading, error, query, reset, updateSlider };
}
