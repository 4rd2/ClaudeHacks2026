import { useEffect } from 'react';
import { PreferencePanel } from './components/PreferencePanel';
import { ProductCard } from './components/ProductCard';
import { ChatInput } from './components/ChatInput';
import { SkeletonCard } from './components/SkeletonCard';
import { useRecommendations } from './hooks/useRecommendations';

export default function App() {
  const { recommendations, preferenceVector, loading, error, query, reset, updateSlider } =
    useRecommendations();

  // Load initial results on mount
  useEffect(() => {
    query('show me the best noise-cancelling headphones');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Shopping Agent</h1>
            <p className="text-sm text-gray-500 mt-1">
              Before any recommendation reaches you, the system tried to disprove it first.
            </p>
          </div>
          <button
            onClick={reset}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            Reset
          </button>
        </div>

        <div className="flex gap-6 items-start">
          {/* Preferences sidebar */}
          <div className="w-64 shrink-0">
            <PreferencePanel values={preferenceVector} onChange={updateSlider} />
          </div>

          {/* Chat + Results */}
          <div className="flex-1 space-y-4">
            <ChatInput onSubmit={query} loading={loading} />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {loading
                ? [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)
                : recommendations.map((chain) => (
                    <ProductCard key={chain.product_id} chain={chain} />
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
