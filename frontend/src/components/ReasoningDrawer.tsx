import { useState } from 'react';
import type { AgentResult, ConflictReport } from '../types';

const AGENT_LABELS: Record<string, string> = {
  price: 'Price',
  specs: 'Specs',
  review: 'Review',
  bias_detector: 'Bias Detector',
};

function AgentRow({ result }: { result: AgentResult }) {
  const [open, setOpen] = useState(false);
  const scoreColor =
    result.score >= 7 ? 'text-green-600' : result.score >= 4 ? 'text-amber-600' : 'text-red-600';
  const label = AGENT_LABELS[result.agent] ?? result.agent;

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{Math.round(result.confidence * 100)}% conf</span>
          <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>
            {result.score.toFixed(1)}
          </span>
          <span className="text-gray-300 text-xs">{open ? '▲' : '▼'}</span>
        </div>
      </button>

      {open && (
        <div className="ml-4 mb-1 space-y-1">
          {result.evidence.map((e, i) => (
            <p key={i} className="text-xs text-gray-500 leading-snug">• {e}</p>
          ))}
          {result.flags.map((f, i) => (
            <p key={`f${i}`} className="text-xs text-amber-700 leading-snug">⚑ {f}</p>
          ))}
          {result.audit_note && (
            <p className="text-xs text-violet-600 italic leading-snug">{result.audit_note}</p>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  agentResults: AgentResult[];
  conflictReport: ConflictReport;
  auditPassed: boolean;
}

export function ReasoningDrawer({ agentResults, conflictReport, auditPassed }: Props) {
  const allFlags = agentResults.flatMap((r) => r.flags);

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      {/* Agent score grid */}
      <div className="divide-y divide-gray-50">
        {agentResults.map((r) => (
          <AgentRow key={r.agent} result={r} />
        ))}
      </div>

      {/* Conflict callout */}
      {conflictReport.exists && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Agent conflict:</span> {conflictReport.description}
        </div>
      )}

      {/* Audit result */}
      {auditPassed ? (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 font-medium">
          ✓ System tried to disprove this recommendation — failed. Trust signal confirmed.
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800 font-medium">
          ✗ Audit found disqualifying evidence — review flags below before trusting this result.
        </div>
      )}

      {/* Flag pills */}
      {allFlags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allFlags.map((flag, i) => (
            <span
              key={i}
              className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium"
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
