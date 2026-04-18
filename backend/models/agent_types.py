from pydantic import BaseModel
from typing import Optional


class AgentResult(BaseModel):
    agent: str
    score: float          # 0-10
    confidence: float     # 0-1
    evidence: list[str]
    flags: list[str]
    audit_note: Optional[str] = None


class ConflictReport(BaseModel):
    exists: bool
    max_spread: float
    conflicting_agents: list[str]
    description: str


class ReasoningChain(BaseModel):
    product_id: str
    product_name: str
    agent_results: list[AgentResult]
    conflict_report: ConflictReport
    audit_passed: bool
    audit_attempts: list[str]
    final_score: float
    recommendation_rank: int
