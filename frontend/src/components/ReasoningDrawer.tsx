import { useState } from 'react';

interface AgentResult {
  agent: string;
  score: number;
  confidence: number;
  evidence: string[];
  flags: string[];
  audit_note?: string;
}

interface ConflictReport {
  exists: boolean;
  max_spread: number;
  conflicting_agents: string[];
  description: string;
}

interface Props {
  agentResults?: AgentResult[];
  conflictReport?: ConflictReport;
  auditPassed?: boolean;
}

const HARDCODED_AGENTS: AgentResult[] = [
  { agent: 'price', score: 8.1, confidence: 0.9, evidence: ['Below category average by $40'], flags: [] },
  { agent: 'specs', score: 9.2, confidence: 0.85, evidence: ['Best ANC in class', '30h battery'], flags: [] },
  { agent: 'review', score: 6.8, confidence: 0.75, evidence: ['Ear cup pressure complaints after 2h'], flags: [] },
  { agent: 'bias_detector', score: 2.1, confidence: 0.8, evidence: ['No disqualifying evidence found'], flags: [], audit_note: 'Adversarial attack failed — no disqualifying evidence found' },
];

export function ReasoningDrawer({
  agentResults = HARDCODED_AGENTS,
  conflictReport = { exists: true, max_spread: 2.4, conflicting_agents: ['specs', 'review'], description: 'Specs vs Review conflict' },
  auditPassed = true,
}: Props) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-3 text-sm">
      {/* Agent score grid */}
      <div className="space-y-2">
        {agentResults.map((r) => (
          <div key={r.agent} className="space-y-1">
            <button
              onClick={() => setExpandedAgent(expandedAgent === r.agent ? null : r.agent)}
              className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded px-2 py-1"
            >
              <span className="capitalize font-medium text-gray-700">{r.agent.replace('_', ' ')}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{Math.round(r.confidence * 100)}% conf</span>
                <span className={`font-semibold ${r.score >= 7 ? 'text-green-600' : r.score >= 4 ? 'text-amber-600' : 'text-red-600'}`}>
                  {r.score.toFixed(1)}
                </span>
              </div>
            </button>
            {expandedAgent === r.agent && (
              <ul className="ml-4 text-xs text-gray-500 space-y-0.5 list-disc list-inside">
                {r.evidence.map((e, i) => <li key={i}>{e}</li>)}
                {r.flags.map((f, i) => (
                  <li key={`f${i}`} className="text-amber-600">{f}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Conflict callout */}
      {conflictReport.exists && (
        <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-800 text-xs">
          <span className="font-semibold">Conflict detected:</span> {conflictReport.description}
        </div>
      )}

      {/* Audit result */}
      {auditPassed ? (
        <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-green-800 text-xs font-medium">
          ✓ System tried to disprove this — failed. Recommendation stands.
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-red-800 text-xs font-medium">
          ✗ Audit flagged issues — review flags before trusting this recommendation.
        </div>
      )}

      {/* Flags */}
      {agentResults.flatMap((r) => r.flags).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {agentResults.flatMap((r) => r.flags).map((flag, i) => (
            <span key={i} className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">{flag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
