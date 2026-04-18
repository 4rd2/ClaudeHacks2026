import { PreferencePanel } from './components/PreferencePanel';
import { ProductCard } from './components/ProductCard';
import { ChatInput } from './components/ChatInput';
import { SkeletonCard } from './components/SkeletonCard';
import type { ReasoningChain } from './types';

const MOCK_RECOMMENDATIONS: ReasoningChain[] = [
  {
    product_id: 'sony-wh1000xm5',
    product_name: 'Sony WH-1000XM5',
    recommendation_rank: 1,
    final_score: 8.4,
    audit_passed: true,
    audit_attempts: ['Adversarial attack failed — no disqualifying evidence found'],
    conflict_report: {
      exists: true,
      max_spread: 2.9,
      conflicting_agents: ['specs', 'review'],
      description: 'specs (9.2) vs review (6.3) — comfort complaints after 2h contradict hardware scores',
    },
    agent_results: [
      { agent: 'price', score: 7.8, confidence: 0.88, evidence: ['$279 — competitive for flagship ANC tier'], flags: [] },
      { agent: 'specs', score: 9.2, confidence: 0.92, evidence: ['Best-in-class ANC (9.5/10)', '30h battery', '30mm driver'], flags: [] },
      { agent: 'review', score: 6.3, confidence: 0.79, evidence: ['4.6 stars / 18 420 reviews', 'Top complaint: ear cup pressure after 2h (22% of signals)'], flags: ['COMFORT_COMPLAINT_THRESHOLD: 22% > 15% signal rate'] },
      { agent: 'bias_detector', score: 1.8, confidence: 0.85, evidence: ['No disqualifying pattern found'], flags: [], audit_note: 'Adversarial attack failed — no disqualifying evidence found' },
    ],
  },
  {
    product_id: 'bose-qc45',
    product_name: 'Bose QC45',
    recommendation_rank: 2,
    final_score: 7.2,
    audit_passed: false,
    audit_attempts: ['Source concentration flag triggered — 62% of reviews from Amazon'],
    conflict_report: {
      exists: false,
      max_spread: 1.1,
      conflicting_agents: [],
      description: 'Agents in agreement.',
    },
    agent_results: [
      { agent: 'price', score: 7.1, confidence: 0.82, evidence: ['$279 — same tier as XM5, weaker specs'], flags: [] },
      { agent: 'specs', score: 7.4, confidence: 0.80, evidence: ['Strong comfort rating (0.88)', 'ANC below XM5 tier'], flags: [] },
      { agent: 'review', score: 8.0, confidence: 0.70, evidence: ['4.4 stars / 12 800 reviews', 'Praised for all-day comfort'], flags: [] },
      { agent: 'bias_detector', score: 7.2, confidence: 0.90, evidence: ['62% of reviews from Amazon — single-source concentration'], flags: ['SOURCE_CONCENTRATION: amazon = 62% of reviews'], audit_note: 'Adversarial attack succeeded — source concentration is a disqualifying signal' },
    ],
  },
  {
    product_id: 'anker-q45',
    product_name: 'Anker Soundcore Q45',
    recommendation_rank: 3,
    final_score: 7.9,
    audit_passed: true,
    audit_attempts: ['Adversarial attack failed — value tier product with consistent signal across sources'],
    conflict_report: {
      exists: false,
      max_spread: 0.8,
      conflicting_agents: [],
      description: 'Agents in agreement.',
    },
    agent_results: [
      { agent: 'price', score: 9.1, confidence: 0.95, evidence: ['$79 — exceptional value for feature set'], flags: [] },
      { agent: 'specs', score: 7.8, confidence: 0.82, evidence: ['Solid ANC for price tier', '50h battery'], flags: [] },
      { agent: 'review', score: 8.3, confidence: 0.78, evidence: ['4.2 stars / 8 600 reviews', 'Consistently praised for value'], flags: [] },
      { agent: 'bias_detector', score: 1.2, confidence: 0.88, evidence: ['No disqualifying pattern found; diverse source distribution'], flags: [], audit_note: 'Adversarial attack failed — consistent signal across sources' },
    ],
  },
];

const MOCK_PREFERENCES: Record<string, number> = {
  price_sensitivity: 0.5,
  sound_quality: 0.7,
  comfort: 0.6,
  battery_life: 0.6,
  portability: 0.5,
  noise_cancellation: 0.7,
};

export default function App() {
  const loading = false;
  const recommendations = MOCK_RECOMMENDATIONS;
  const preferences = MOCK_PREFERENCES;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Shopping Agent</h1>
          <p className="text-sm text-gray-500 mt-1">
            Before any recommendation reaches you, the system tried to disprove it first.
          </p>
        </div>

        <div className="flex gap-6 items-start">
          <div className="w-64 shrink-0">
            <PreferencePanel values={preferences} />
          </div>

          <div className="flex-1 space-y-4">
            <ChatInput />

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
