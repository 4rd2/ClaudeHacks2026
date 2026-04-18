import { PreferencePanel } from './components/PreferencePanel';
import { ProductCard } from './components/ProductCard';
import { ChatInput } from './components/ChatInput';
import { SkeletonCard } from './components/SkeletonCard';

const DEMO_PRODUCTS = [
  { name: 'Sony WH-1000XM5', finalScore: 8.4, auditPassed: true, conflictExists: true, rank: 1 },
  { name: 'Bose QC45', finalScore: 7.9, auditPassed: false, conflictExists: false, rank: 2 },
  { name: 'Anker Soundcore Q45', finalScore: 7.2, auditPassed: true, conflictExists: false, rank: 3 },
];

export default function App() {
  const loading = false;

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
            <PreferencePanel />
          </div>

          <div className="flex-1 space-y-4">
            <ChatInput />

            <div className="space-y-3">
              {loading
                ? [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)
                : DEMO_PRODUCTS.map((p) => (
                    <ProductCard key={p.name} {...p} />
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
