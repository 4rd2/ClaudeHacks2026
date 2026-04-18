import { useState } from 'react';
import { ConflictBadge } from './ConflictBadge';
import { ReasoningDrawer } from './ReasoningDrawer';
import type { ReasoningChain } from '../types';

interface Props {
  chain: ReasoningChain;
}

export function ProductCard({ chain }: Props) {
  const [open, setOpen] = useState(false);
  const { product_name, final_score, audit_passed, conflict_report, agent_results, recommendation_rank } = chain;

  return (
    <div
      onClick={() => setOpen((o) => !o)}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-violet-300 transition-colors select-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-gray-300 shrink-0">#{recommendation_rank}</span>
          <span className="font-semibold text-gray-900 truncate">{product_name}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {conflict_report.exists && (
            <ConflictBadge
              maxSpread={conflict_report.max_spread}
              description={conflict_report.description}
            />
          )}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              audit_passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {audit_passed ? '✓ Audit passed' : '✗ Audit failed'}
          </span>
          <span className="text-lg font-bold text-violet-700 tabular-nums">
            {final_score.toFixed(1)}
          </span>
        </div>
      </div>

      {open && (
        <ReasoningDrawer
          agentResults={agent_results}
          conflictReport={conflict_report}
          auditPassed={audit_passed}
        />
      )}
    </div>
  );
}
