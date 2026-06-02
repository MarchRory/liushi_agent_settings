import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseToml } from "smol-toml";

export const REQUIRED_STRATEGY_FIELDS = [
  "id",
  "use_when",
  "avoid_when",
  "required_signals",
  "contraindications",
  "candidate_agents",
  "max_agents",
  "parallelism",
  "required_evidence",
  "stop_conditions",
  "validation_required",
  "model_selection_hints",
  "script",
] as const;

const HIGH_RISK_PATTERNS = [
  /\bsecrets?\b/,
  /\bcredentials?\b/,
  /\btokens?\b/,
  /\bpasswords?\b/,
  /\bauth(?:entication|orization)?\b/,
  /\bpayments?\b/,
  /\bdatabases?\b/,
  /\bdb\b/,
  /\bmigrations?\b/,
  /\bdeploy(?:ment|ing|ed|s)?\b/,
  /\bproduction\b/,
  /\bprod\b/,
  /\bdelete\b/,
  /\bremove\b/,
  /\bdestroy\b/,
  /\bdestructive\b/,
  /\bdrop\b/,
  /\btruncate\b/,
  /\brollback\b/,
  /\bgit\s+reset\b/,
  /\bgit\s+clean\b/,
  /\bgit\s+restore\b/,
  /\bgit\s+checkout\b/,
  /\bdocker\s+.*\bprune\b/,
  /\bterraform\s+destroy\b/,
  /\bkubectl\s+delete\b/,
  /\bcloud\b/,
];

const DESTRUCTIVE_ACTION_PATTERNS = [
  /\bdelete\b/,
  /\bremove\b/,
  /\bdestroy\b/,
  /\bdestructive\b/,
  /\bdrop\b/,
  /\btruncate\b/,
  /\brollback\b/,
  /\bgit\s+reset\b/,
  /\bgit\s+clean\b/,
  /\bgit\s+restore\b/,
  /\bgit\s+checkout\b/,
  /\bdocker\s+.*\bprune\b/,
  /\bterraform\s+destroy\b/,
  /\bkubectl\s+delete\b/,
];

const VALID_ROLES = new Set([
  "architect",
  "codebase-explorer",
  "critic",
  "implementer",
  "memory-curator",
  "researcher",
  "reviewer",
  "tester",
]);

export type ModelDecision = {
  chosen_model?: string;
  reasoning_effort?: string;
  cost_risk?: string;
  why_this_model?: string;
  fallback_model?: string;
};

export type ApprovalRecord = {
  approved?: boolean;
  approver_source?: string;
  exact_operation?: string;
  exact_target?: string;
  timestamp?: string;
  risk_acknowledged?: boolean;
};

export type TaskContext = {
  task?: string;
  task_summary?: string;
  task_type?:
    | "small_fix"
    | "pr_review"
    | "architecture_decision"
    | "external_research"
    | "memory_update"
    | "high_risk_operation";
  complexity?: number;
  risk?: number;
  signals?: string[];
  lead_analysis?: string;
  lead_strategy_reason?: string;
  risks?: string[];
  files_or_sources?: string[];
  requires_edit?: boolean;
  requires_code_changes?: boolean;
  requires_research?: boolean;
  requires_external_sources?: boolean;
  parallelizable?: boolean;
  requires_tests?: boolean;
  has_competing_options?: boolean;
  has_decision_criteria?: boolean;
  user_requested_debate?: boolean;
  user_requested_agents?: string[];
  available_evidence?: string[];
  forbidden_actions?: string[];
  sensitive_domains?: string[];
  validation_available?: boolean;
  operation?: string;
  target?: string;
  risk_statement?: string;
  safer_alternative?: string;
  source_list?: string[];
  source_priority?: string;
  date_or_version_context?: string;
  uncertainty_notes?: string;
  routing_reason?: string;
  agent_scope_boundaries?: string[];
  handoff_constraints?: string[];
  stage_plan?: string[];
  stage_exit_gates?: string[];
  validation_path?: string;
  competing_options?: string[];
  decision_criteria?: string[];
  critique_questions?: string[];
  diff_scope?: string;
  validation_commands?: string[];
  review_scope?: string;
  item_partition?: string[];
  per_item_output_schema?: Record<string, unknown> | string;
  reduce_rule?: string;
  turn_budget?: number;
  speaker_selection_rule?: string;
  lead_checkpoint_rule?: string;
  approval_record?: ApprovalRecord;
  model_decision?: ModelDecision;
};

export type Strategy = {
  id: string;
  name?: string;
  priority?: number;
  use_when: string[];
  avoid_when: string[];
  required_signals: string[];
  contraindications: string[];
  candidate_agents: string[];
  max_agents: number;
  parallelism: string;
  required_evidence: string[];
  stop_conditions: string[];
  validation_required: string[];
  model_selection_hints: string[];
  script: string;
};

type Registry = {
  schema_version?: string;
  strategies?: Strategy[];
};

type ModelPolicy = {
  role_hints?: Array<{ role: string }>;
  strategy_hints?: Array<{ strategy: string }>;
};

export type ActivationPacket = {
  schema_version: "1.0";
  selected_strategy: string;
  strategy_id: string;
  strategy_name: string;
  eligible: boolean;
  score: number;
  confidence: "low" | "medium" | "high";
  reason: string;
  matched_signals: string[];
  missing_required_signals: string[];
  contraindication_hits: string[];
  lead_decision_required: true;
  recommended_action: string;
  task_summary: string;
  agents: string[];
  candidate_agents: string[];
  max_agents: number;
  parallelism: string;
  required_evidence: string[];
  missing_evidence: string[];
  stop_conditions: string[];
  validation_required: string[];
  expected_outputs: string[];
  handoff_skeletons: Array<Record<string, unknown>>;
  model_decision_record: Required<ModelDecision>;
  model_selection_hints: string[];
  safety_gate: {
    requires_human_approval: boolean;
    approval_required: boolean;
    approval_record_valid: boolean;
    approval_record_missing_fields: string[];
    approval_record_mismatch: string[];
    action_may_proceed: boolean;
  };
  script_contract: {
    read_only: true;
    network: false;
    repo_mutation: false;
    starts_agents: false;
  };
};

export function skillDir(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

function readText(path: string): string {
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
}

function loadToml<T>(path: string): T {
  return parseToml(readText(path)) as T;
}

export function loadRegistry(): Registry {
  return loadToml<Registry>(resolve(skillDir(), "references", "strategy-registry.toml"));
}

export function loadModelPolicy(): ModelPolicy {
  return loadToml<ModelPolicy>(resolve(skillDir(), "references", "model-policy.toml"));
}

export function strategiesById(): Map<string, Strategy> {
  return new Map((loadRegistry().strategies ?? []).map((strategy) => [strategy.id, strategy]));
}

export function normalizeContext(raw: TaskContext): Required<TaskContext> {
  const taskSummary = raw.task_summary ?? raw.task ?? "";
  const complexity = Number.isFinite(raw.complexity) ? Number(raw.complexity) : 0;
  const risk = Number.isFinite(raw.risk) ? Number(raw.risk) : 0;
  const availableEvidence = Array.isArray(raw.available_evidence) ? raw.available_evidence.map(String) : [];
  const validationCommands = Array.isArray(raw.validation_commands) ? raw.validation_commands.map(String) : [];
  const requiresResearch = Boolean(raw.requires_research || raw.requires_external_sources || raw.task_type === "external_research");
  const requiresEdit = Boolean(raw.requires_edit || raw.requires_code_changes);
  const requiresTests = Boolean(raw.requires_tests || validationCommands.length > 0 || availableEvidence.includes("test_commands") || availableEvidence.includes("validation_commands"));
  const context: Required<TaskContext> = {
    task: raw.task ?? "",
    task_summary: taskSummary,
    task_type: raw.task_type ?? "small_fix",
    complexity,
    risk,
    signals: Array.isArray(raw.signals) ? raw.signals.map(String) : [],
    lead_analysis: raw.lead_analysis ?? "",
    lead_strategy_reason: raw.lead_strategy_reason ?? "",
    risks: Array.isArray(raw.risks) ? raw.risks.map(String) : [],
    files_or_sources: Array.isArray(raw.files_or_sources) ? raw.files_or_sources.map(String) : [],
    requires_edit: requiresEdit,
    requires_code_changes: Boolean(raw.requires_code_changes),
    requires_research: requiresResearch,
    requires_external_sources: Boolean(raw.requires_external_sources),
    parallelizable: Boolean(raw.parallelizable),
    requires_tests: requiresTests,
    has_competing_options: Boolean(raw.has_competing_options),
    has_decision_criteria: Boolean(raw.has_decision_criteria),
    user_requested_debate: Boolean(raw.user_requested_debate),
    user_requested_agents: Array.isArray(raw.user_requested_agents) ? raw.user_requested_agents.map(String) : [],
    available_evidence: availableEvidence,
    forbidden_actions: Array.isArray(raw.forbidden_actions) ? raw.forbidden_actions.map(String) : [],
    sensitive_domains: Array.isArray(raw.sensitive_domains) ? raw.sensitive_domains.map(String) : [],
    validation_available: Boolean(raw.validation_available || requiresTests),
    operation: raw.operation ?? "",
    target: raw.target ?? "",
    risk_statement: raw.risk_statement ?? "",
    safer_alternative: raw.safer_alternative ?? "",
    source_list: Array.isArray(raw.source_list) ? raw.source_list.map(String) : [],
    source_priority: raw.source_priority ?? "",
    date_or_version_context: raw.date_or_version_context ?? "",
    uncertainty_notes: raw.uncertainty_notes ?? "",
    routing_reason: raw.routing_reason ?? "",
    agent_scope_boundaries: Array.isArray(raw.agent_scope_boundaries) ? raw.agent_scope_boundaries.map(String) : [],
    handoff_constraints: Array.isArray(raw.handoff_constraints) ? raw.handoff_constraints.map(String) : [],
    stage_plan: Array.isArray(raw.stage_plan) ? raw.stage_plan.map(String) : [],
    stage_exit_gates: Array.isArray(raw.stage_exit_gates) ? raw.stage_exit_gates.map(String) : [],
    validation_path: raw.validation_path ?? "",
    competing_options: Array.isArray(raw.competing_options) ? raw.competing_options.map(String) : [],
    decision_criteria: Array.isArray(raw.decision_criteria) ? raw.decision_criteria.map(String) : [],
    critique_questions: Array.isArray(raw.critique_questions) ? raw.critique_questions.map(String) : [],
    diff_scope: raw.diff_scope ?? "",
    validation_commands: validationCommands,
    review_scope: raw.review_scope ?? "",
    item_partition: Array.isArray(raw.item_partition) ? raw.item_partition.map(String) : [],
    per_item_output_schema: raw.per_item_output_schema ?? {},
    reduce_rule: raw.reduce_rule ?? "",
    turn_budget: Number.isFinite(raw.turn_budget) ? Number(raw.turn_budget) : 0,
    speaker_selection_rule: raw.speaker_selection_rule ?? "",
    lead_checkpoint_rule: raw.lead_checkpoint_rule ?? "",
    approval_record: raw.approval_record ?? {},
    model_decision: raw.model_decision ?? {},
  };

  const signals = new Set(context.signals);
  if (context.requires_research) signals.add("external_research_required");
  if (context.parallelizable) signals.add("parallelizable_scope");
  if (context.requires_research && context.parallelizable) signals.add("multiple_independent_research_threads");
  if (context.requires_edit) {
    signals.add("implementation_required");
    signals.add("code_modified_or_to_modify");
  }
  if (context.validation_available) signals.add("validation_available");
  if (context.requires_tests) signals.add("validation_available");
  if (context.task_type === "pr_review") signals.add("code_modified_or_to_modify");
  if (context.task_type === "architecture_decision") signals.add("high_uncertainty");
  if (context.task_type === "architecture_decision" && (context.risk >= 3 || context.complexity >= 4)) signals.add("high_failure_cost");
  if (context.user_requested_debate) signals.add("high_uncertainty");
  if (context.user_requested_debate && (context.risk >= 3 || context.complexity >= 4)) signals.add("high_failure_cost");
  if (context.task_type === "external_research") signals.add("external_research_required");
  const riskSurface = [
    context.task_summary,
    context.task,
    context.operation,
    context.target,
    ...context.risks,
    ...context.sensitive_domains,
    ...context.forbidden_actions,
    ...context.files_or_sources,
  ]
    .join(" ")
    .toLowerCase();

  const highRiskPatternHit = HIGH_RISK_PATTERNS.some((pattern) => pattern.test(riskSurface));
  const destructiveActionHit = DESTRUCTIVE_ACTION_PATTERNS.some((pattern) => pattern.test(riskSurface));
  const explicitHighRisk = context.task_type === "high_risk_operation" || context.risk >= 5 || context.forbidden_actions.length > 0;
  const highRiskActionIntent =
    context.operation.length > 0 ||
    context.target.length > 0 ||
    context.sensitive_domains.length > 0 ||
    (context.requires_edit && (context.risk >= 3 || context.forbidden_actions.length > 0));
  if (explicitHighRisk || (destructiveActionHit && highRiskActionIntent) || (highRiskPatternHit && highRiskActionIntent)) {
    signals.add("high_risk_operation");
  }

  if (
    (context.task_type === "small_fix" || (context.complexity <= 1 && context.risk <= 1)) &&
    !context.requires_edit &&
    !context.requires_research &&
    !signals.has("high_risk_operation")
  ) {
    signals.add("small_task");
  }

  context.signals = [...signals].sort();
  return context;
}

export function validateRegistry(): string[] {
  const errors: string[] = [];
  const strategies = loadRegistry().strategies ?? [];
  const seen = new Set<string>();

  for (const strategy of strategies) {
    if (seen.has(strategy.id)) errors.push(`duplicate strategy id: ${strategy.id}`);
    seen.add(strategy.id);
    for (const field of REQUIRED_STRATEGY_FIELDS) {
      if (!(field in strategy)) errors.push(`${strategy.id}: missing required field ${field}`);
    }
    if (!existsSync(resolve(skillDir(), strategy.script))) {
      errors.push(`${strategy.id}: script path does not exist: ${strategy.script}`);
    }
    for (const role of strategy.candidate_agents ?? []) {
      if (!VALID_ROLES.has(role)) errors.push(`${strategy.id}: unknown candidate agent ${role}`);
    }
    if ((strategy.max_agents ?? 0) > (strategy.candidate_agents ?? []).length) {
      errors.push(`${strategy.id}: max_agents exceeds candidate_agents length`);
    }
  }

  const modelPolicy = loadModelPolicy();
  const strategyHints = new Set((modelPolicy.strategy_hints ?? []).map((hint) => hint.strategy));
  for (const strategy of strategies) {
    if (!strategyHints.has(strategy.id)) errors.push(`model-policy missing strategy hint: ${strategy.id}`);
  }
  for (const hint of modelPolicy.role_hints ?? []) {
    if (!VALID_ROLES.has(hint.role)) errors.push(`model-policy has unknown role hint: ${hint.role}`);
  }
  return errors;
}

export function buildPacket(strategyId: string, rawContext: TaskContext): ActivationPacket {
  const strategies = strategiesById();
  const strategy = strategies.get(strategyId);
  if (!strategy) throw new Error(`unknown strategy: ${strategyId}`);

  const context = normalizeContext(rawContext);
  const signals = new Set(context.signals);
  const required = new Set(strategy.required_signals);
  const contraindications = new Set(strategy.contraindications);
  const matched = [...required].filter((signal) => signals.has(signal)).sort();
  const missing = [...required].filter((signal) => !signals.has(signal)).sort();
  const contraindicationHits = [...contraindications].filter((signal) => signals.has(signal)).sort();
  const missingEvidence = strategy.required_evidence.filter((key) => !evidencePresent(key, context));
  const eligible = missing.length === 0 && contraindicationHits.length === 0 && missingEvidence.length === 0;
  const score = contraindicationHits.length > 0 ? 0 : Math.min(1, Number((0.2 + 0.5 * (matched.length / Math.max(required.size, 1)) + 0.3 * ((strategy.required_evidence.length - missingEvidence.length) / Math.max(strategy.required_evidence.length, 1))).toFixed(3)));
  const confidence: ActivationPacket["confidence"] = contraindicationHits.length > 0 ? "high" : eligible && score >= 0.9 ? "high" : matched.length > 0 ? "medium" : "low";
  const safetyGate = buildSafetyGate(strategy.id, context, eligible);

  return {
    schema_version: "1.0",
    selected_strategy: strategy.id,
    strategy_id: strategy.id,
    strategy_name: strategy.name ?? strategy.id,
    eligible,
    score,
    confidence,
    reason: packetReason(strategy, context, matched, missing, contraindicationHits, missingEvidence),
    matched_signals: matched,
    missing_required_signals: missing,
    contraindication_hits: contraindicationHits,
    lead_decision_required: true,
    recommended_action: recommendedAction(strategy.id, eligible, safetyGate),
    task_summary: context.task_summary,
    agents: strategy.candidate_agents.slice(0, strategy.max_agents),
    candidate_agents: strategy.candidate_agents,
    max_agents: strategy.max_agents,
    parallelism: strategy.parallelism,
    required_evidence: strategy.required_evidence,
    missing_evidence: missingEvidence,
    stop_conditions: strategy.stop_conditions,
    validation_required: strategy.validation_required,
    expected_outputs: expectedOutputs(strategy.id),
    handoff_skeletons: buildHandoffs(strategy, context),
    model_decision_record: normalizeModelDecision(context.model_decision),
    model_selection_hints: strategy.model_selection_hints,
    safety_gate: safetyGate,
    script_contract: {
      read_only: true,
      network: false,
      repo_mutation: false,
      starts_agents: false,
    },
  };
}

function evidencePresent(key: string, context: Required<TaskContext>): boolean {
  const evidenceMap: Record<string, boolean> = {
    reason_lead_only_is_sufficient: context.signals.includes("small_task") || context.task_summary.length > 0,
    risk_is_low: !context.signals.includes("high_risk_operation") && context.risks.length === 0,
    source_list: context.source_list.length > 0 || context.files_or_sources.length > 0 || mentionsAny(context.lead_analysis, ["source", "sources", "docs", "papers", "research threads"]),
    source_priority: context.source_priority.length > 0 || mentionsAny(context.lead_analysis, ["prefer", "priority", "primary sources", "official docs"]),
    date_or_version_context: context.date_or_version_context.length > 0 || mentionsAny(context.lead_analysis, ["date", "version", "current", "recent"]),
    uncertainty_notes: context.uncertainty_notes.length > 0 || mentionsAny(context.lead_analysis, ["uncertain", "uncertainty", "conflict", "unknown"]),
    routing_reason: context.routing_reason.length > 0 || context.lead_strategy_reason.length > 0,
    agent_scope_boundaries: context.agent_scope_boundaries.length > 0 || mentionsAny(context.lead_analysis, ["scope", "boundary", "permissions", "domains"]),
    handoff_constraints: context.handoff_constraints.length > 0 || mentionsAny(context.lead_analysis, ["constraint", "constraints", "must not", "read-only"]),
    stage_plan: context.stage_plan.length > 0 || mentionsAny(context.lead_analysis, ["stage", "stages", "sequence", "pipeline"]),
    stage_exit_gates: context.stage_exit_gates.length > 0 || mentionsAny(context.lead_analysis, ["gate", "exit", "checkpoint", "acceptance"]),
    validation_path: context.validation_path.length > 0 || context.validation_commands.length > 0 || mentionsAny(context.lead_analysis, ["validate", "test", "check"]),
    competing_options: context.has_competing_options || context.competing_options.length >= 2 || mentionsAny(context.lead_analysis, ["option", "options", "alternative", "alternatives"]),
    decision_criteria: context.has_decision_criteria || context.decision_criteria.length > 0 || mentionsAny(context.lead_analysis, ["criteria", "tradeoff", "risk", "cost"]),
    critique_questions: context.user_requested_debate || context.critique_questions.length > 0 || mentionsAny(context.lead_analysis, ["critic", "critique", "challenge", "assumption"]),
    diff_scope: context.diff_scope.length > 0 || context.task_type === "pr_review" || context.files_or_sources.length > 0 || context.available_evidence.includes("diff"),
    validation_commands: context.validation_commands.length > 0 || context.available_evidence.includes("test_commands") || context.available_evidence.includes("validation_commands"),
    review_scope: context.review_scope.length > 0 || context.task_type === "pr_review" || context.files_or_sources.length > 0,
    item_partition: context.item_partition.length > 0,
    per_item_output_schema: typeof context.per_item_output_schema === "string" ? context.per_item_output_schema.length > 0 : Object.keys(context.per_item_output_schema).length > 0,
    reduce_rule: context.reduce_rule.length > 0,
    turn_budget: context.turn_budget > 0,
    speaker_selection_rule: context.speaker_selection_rule.length > 0,
    lead_checkpoint_rule: context.lead_checkpoint_rule.length > 0,
    exact_operation: context.operation.length > 0,
    exact_target_path_or_resource: context.target.length > 0 || context.files_or_sources.length > 0,
    risk_statement: context.risk_statement.length > 0 || context.risks.length > 0,
    safer_alternative: context.safer_alternative.length > 0,
  };
  return Boolean(evidenceMap[key]);
}

function packetReason(
  strategy: Strategy,
  context: Required<TaskContext>,
  matched: string[],
  missing: string[],
  contraindications: string[],
  missingEvidence: string[],
): string {
  if (contraindications.length > 0) {
    return `${strategy.id} is blocked by contraindications: ${contraindications.join(", ")}.`;
  }
  if (missing.length > 0 || missingEvidence.length > 0) {
    return `${strategy.id} needs more evidence before activation. Missing signals: ${missing.join(", ") || "none"}; missing evidence: ${missingEvidence.join(", ") || "none"}.`;
  }
  if (strategy.id === "human-approval-gate") {
    return "High-risk signals require an approval gate before any action may proceed.";
  }
  if (strategy.id === "lead-only-default") {
    return "The task is low risk and local enough for the lead to complete without specialist delegation.";
  }
  return `${strategy.id} matches ${matched.length} required signal(s) for: ${context.task_summary || "the current task"}.`;
}

function expectedOutputs(strategyId: string): string[] {
  const outputsByStrategy: Record<string, string[]> = {
    "lead-only-default": ["lead_decision_record", "validation_or_not_run_reason"],
    "parallel-research-swarm": ["research_summary", "source_list", "uncertainty_notes"],
    "supervisor-router": ["routing_record", "specialist_outputs", "integration_summary"],
    "sop-assembly-line": ["stage_outputs", "stage_gate_results", "validation_record"],
    "debate-critic-panel": ["accepted_findings", "rejected_findings", "unresolved_risks", "validation_plan"],
    "reviewer-tester-loop": ["validation_record", "review_findings", "blocking_issues"],
    "batch-map-reduce": ["per_item_findings", "reduced_findings", "coverage_record"],
    "selector-group-chat": ["turn_records", "lead_checkpoints", "final_integration_record"],
    "human-approval-gate": ["risk_statement", "approval_record", "safer_alternative"],
  };
  return outputsByStrategy[strategyId] ?? ["lead_decision_record"];
}

function mentionsAny(text: string, needles: string[]): boolean {
  const normalized = text.toLowerCase();
  return needles.some((needle) => normalized.includes(needle.toLowerCase()));
}

function recommendedAction(strategyId: string, eligible: boolean, safetyGate: ActivationPacket["safety_gate"]): string {
  if (!eligible) return "lead_decision_required_no_auto_selection";
  if (strategyId === "human-approval-gate" && !safetyGate.approval_record_valid) {
    return "lead_request_human_approval_before_action";
  }
  if (strategyId === "human-approval-gate") return "lead_review_approval_record_before_action";
  return "lead_review_activation_packet";
}

function buildSafetyGate(strategyId: string, context: Required<TaskContext>, eligible: boolean): ActivationPacket["safety_gate"] {
  if (strategyId !== "human-approval-gate") {
    return {
      requires_human_approval: false,
      approval_required: false,
      approval_record_valid: false,
      approval_record_missing_fields: [],
      approval_record_mismatch: [],
      action_may_proceed: false,
    };
  }

  const record = context.approval_record;
  const missing = [
    ["approved", typeof record.approved === "boolean"],
    ["approver_source", typeof record.approver_source === "string" && record.approver_source.length > 0],
    ["exact_operation", typeof record.exact_operation === "string" && record.exact_operation.length > 0],
    ["exact_target", typeof record.exact_target === "string" && record.exact_target.length > 0],
    ["timestamp", typeof record.timestamp === "string" && record.timestamp.length > 0],
    ["risk_acknowledged", typeof record.risk_acknowledged === "boolean"],
  ]
    .filter(([, present]) => !present)
    .map(([field]) => String(field));

  const mismatch: string[] = [];
  if (record.approved !== true) mismatch.push("approved_not_true");
  if (record.risk_acknowledged !== true) mismatch.push("risk_not_acknowledged");
  if (typeof record.exact_operation === "string" && context.operation.length > 0 && normalizeComparable(record.exact_operation) !== normalizeComparable(context.operation)) {
    mismatch.push("operation_mismatch");
  }
  if (typeof record.exact_target === "string" && context.target.length > 0 && normalizeComparable(record.exact_target) !== normalizeComparable(context.target)) {
    mismatch.push("target_mismatch");
  }

  const valid = missing.length === 0 && mismatch.length === 0;
  return {
    requires_human_approval: true,
    approval_required: true,
    approval_record_valid: valid,
    approval_record_missing_fields: missing,
    approval_record_mismatch: mismatch,
    action_may_proceed: eligible && valid,
  };
}

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHandoffs(strategy: Strategy, context: Required<TaskContext>): Array<Record<string, unknown>> {
  return strategy.candidate_agents.map((role) => ({
    from: "lead",
    to: role,
    role,
    objective: `Handle the ${role} portion of ${strategy.id}.`,
    relevant_context: context.task_summary,
    files_or_sources: context.files_or_sources,
    constraints: [
      "Stay within delegated role.",
      "Return specialist_output with evidence.",
      "Do not start other strategies or agents.",
    ],
    risks: context.risks,
    expected_output: "specialist_output",
    validation_required: strategy.validation_required,
  }));
}

function normalizeModelDecision(raw: ModelDecision): Required<ModelDecision> {
  return {
    chosen_model: raw.chosen_model ?? "",
    reasoning_effort: raw.reasoning_effort ?? "",
    cost_risk: raw.cost_risk ?? "",
    why_this_model: raw.why_this_model ?? "",
    fallback_model: raw.fallback_model ?? "",
  };
}

export function selectStrategy(rawContext: TaskContext): ActivationPacket {
  const context = normalizeContext(rawContext);
  if (context.signals.includes("high_risk_operation")) {
    return buildPacket("human-approval-gate", context);
  }

  const packets = (loadRegistry().strategies ?? []).map((strategy) => buildPacket(strategy.id, context));
  const eligible = packets.filter((packet) => packet.eligible);
  if (eligible.length === 0) return noEligiblePacket(context, packets);
  return eligible.sort((a, b) => b.score - a.score || priority(b.strategy_id) - priority(a.strategy_id))[0];
}

function noEligiblePacket(context: Required<TaskContext>, packets: ActivationPacket[]): ActivationPacket {
  return {
    schema_version: "1.0",
    selected_strategy: "no-eligible-strategy",
    strategy_id: "no-eligible-strategy",
    strategy_name: "No eligible strategy",
    eligible: false,
    score: 0,
    confidence: "high",
    reason: "No strategy satisfied required signals, evidence, and contraindication checks.",
    matched_signals: [],
    missing_required_signals: [...new Set(packets.flatMap((packet) => packet.missing_required_signals))].sort(),
    contraindication_hits: [...new Set(packets.flatMap((packet) => packet.contraindication_hits))].sort(),
    lead_decision_required: true,
    recommended_action: "lead_decision_required_no_auto_selection",
    task_summary: context.task_summary,
    agents: [],
    candidate_agents: [],
    max_agents: 0,
    parallelism: "none",
    required_evidence: [],
    missing_evidence: [...new Set(packets.flatMap((packet) => packet.missing_evidence))].sort(),
    stop_conditions: ["lead_collects_more_context", "lead_runs_no_specialist"],
    validation_required: ["lead_records_no_strategy_reason"],
    expected_outputs: ["lead_decision_record", "missing_evidence_record"],
    handoff_skeletons: [],
    model_decision_record: normalizeModelDecision(context.model_decision),
    model_selection_hints: ["Do not start specialists until a strategy is eligible or the lead records an override."],
    safety_gate: {
      requires_human_approval: false,
      approval_required: false,
      approval_record_valid: false,
      approval_record_missing_fields: [],
      approval_record_mismatch: [],
      action_may_proceed: false,
    },
    script_contract: {
      read_only: true,
      network: false,
      repo_mutation: false,
      starts_agents: false,
    },
  };
}

function priority(strategyId: string): number {
  return strategiesById().get(strategyId)?.priority ?? 0;
}

export function parseContextArg(args: string[]): { context: TaskContext; validate: boolean; assertExamples: boolean } {
  const result = { context: {} as TaskContext, validate: false, assertExamples: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--validate") result.validate = true;
    else if (arg === "--assert") result.assertExamples = true;
    else if (arg === "--context") result.context = JSON.parse(args[++index] ?? "{}") as TaskContext;
    else if (arg === "--context-file") result.context = JSON.parse(readText(args[++index] ?? "")) as TaskContext;
    else if (arg === "--help" || arg === "-h") {
      console.log("Usage: tsx scripts/select_strategy.ts [--validate] [--context JSON] [--context-file path]");
      process.exit(0);
    }
  }
  return result;
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}
