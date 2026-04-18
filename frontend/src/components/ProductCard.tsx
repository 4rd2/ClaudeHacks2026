import { useState } from 'react';
import { ConflictBadge } from './ConflictBadge';
import { ReasoningDrawer } from './ReasoningDrawer';

interface Props {
  name?: string;
  finalScore?: number;
  auditPassed?: boolean;
  conflictExists?: boolean;
  rank?: number;
}

export function ProductCard({
  name = 'Sony WH-1000XM5',
  finalScore = 8.4,
  auditPassed = true,
  conflictExists = true,
  rank = 1,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-violet-300 transition-colors"
      onClick={() => setOpen((o) => !o)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400">#{rank}</span>
          <span className="font-semibold text-gray-900">{name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {conflictExists && <ConflictBadge />}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              auditPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {auditPassed ? '✓ Audit passed' : '✗ Audit failed'}
          </span>
          <span className="text-lg font-bold text-violet-700">{finalScore.toFixed(1)}</span>
        </div>
      </div>

      {open && <ReasoningDrawer />}
    </div>
  );
}
