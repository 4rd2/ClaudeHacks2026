export interface AgentResult {
  agent: string;
  score: number;       // 0-10
  confidence: number;  // 0-1
  evidence: string[];
  flags: string[];
  audit_note?: string;
}

export interface ConflictReport {
  exists: boolean;
  max_spread: number;
  conflicting_agents: string[];
  description: string;
}

export interface ReasoningChain {
  product_id: string;
  product_name: string;
  agent_results: AgentResult[];
  conflict_report: ConflictReport;
  audit_passed: boolean;
  audit_attempts: string[];
  final_score: number;
  recommendation_rank: number;
}

export interface RecommendResponse {
  preference_vector: Record<string, number>;
  recommendations: ReasoningChain[];
}
