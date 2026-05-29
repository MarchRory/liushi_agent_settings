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

const HIGH_RISK_TERMS = [
  "secret",
  "credential",
  "token",
  "password",
  "auth",
  "payment",
  "database",
  "db",
  "migration",
  "deploy",
  "production",
  "prod",
  "delete",
  "remove",
  "destroy",
  "destructive",
  "drop",
  "truncate",
  "rollback",
  "git reset",
  "git clean",
  "git restore",
  "git checkout",
  "cloud",
  "terraform destroy",
  "kubectl delete",
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

export type TaskContext = {
  task_summary?: string;
  signals?: string[];
  risks?: string[];
  files_or_sources?: string[];
  requires_edit?: boolean;
  requires_research?: boolean;
  parallelizable?: boolean;
  sensitive_domains?: string[];
  validation_available?: boolean;
  operation?: string;
  target?: string;
  risk_statement?: string;
  safer_alternative?: string;
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
  strategy_id: string;
  strategy_name: string;
  eligible: boolean;
  score: number;
  confidence: "low" | "medium" | "high";
  matched_signals: string[];
  missing_required_signals: string[];
  contraindication_hits: string[];
  lead_decision_required: true;
  recommended_action: string;
  task_summary: string;
  candidate_agents: string[];
  max_agents: number;
  parallelism: string;
  required_evidence: string[];
  missing_evidence: string[];
  stop_conditions: string[];
  validation_required: string[];
  handoff_skeletons: Array<Record<string, unknown>>;
  model_decision_record: Required<ModelDecision>;
  model_selection_hints: string[];
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
  const context: Required<TaskContext> = {
    task_summary: raw.task_summary ?? "",
    signals: Array.isArray(raw.signals) ? raw.signals.map(String) : [],
    risks: Array.isArray(raw.risks) ? raw.risks.map(String) : [],
    files_or_sources: Array.isArray(raw.files_or_sources) ? raw.files_or_sources.map(String) : [],
    requires_edit: Boolean(raw.requires_edit),
    requires_research: Boolean(raw.requires_research),
    parallelizable: Boolean(raw.parallelizable),
    sensitive_domains: Array.isArray(raw.sensitive_domains) ? raw.sensitive_domains.map(String) : [],
    validation_available: Boolean(raw.validation_available),
    operation: raw.operation ?? "",
    target: raw.target ?? "",
    risk_statement: raw.risk_statement ?? "",
    safer_alternative: raw.safer_alternative ?? "",
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

  const riskSurface = [
    context.task_summary,
    context.operation,
    context.target,
    ...context.risks,
    ...context.sensitive_domains,
    ...context.files_or_sources,
  ]
    .join(" ")
    .toLowerCase();

  if (context.sensitive_domains.length > 0 || HIGH_RISK_TERMS.some((term) => riskSurface.includes(term))) {
    signals.add("high_risk_operation");
  }

  if (signals.size === 0 && !context.requires_edit && !context.requires_research) {
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

  return {
    schema_version: "1.0",
    strategy_id: strategy.id,
    strategy_name: strategy.name ?? strategy.id,
    eligible,
    score,
    confidence,
    matched_signals: matched,
    missing_required_signals: missing,
    contraindication_hits: contraindicationHits,
    lead_decision_required: true,
    recommended_action: eligible ? "lead_review_activation_packet" : "lead_decision_required_no_auto_selection",
    task_summary: context.task_summary,
    candidate_agents: strategy.candidate_agents,
    max_agents: strategy.max_agents,
    parallelism: strategy.parallelism,
    required_evidence: strategy.required_evidence,
    missing_evidence: missingEvidence,
    stop_conditions: strategy.stop_conditions,
    validation_required: strategy.validation_required,
    handoff_skeletons: buildHandoffs(strategy, context),
    model_decision_record: normalizeModelDecision(context.model_decision),
    model_selection_hints: strategy.model_selection_hints,
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
    source_list: context.files_or_sources.length > 0 || context.requires_research,
    source_priority: context.requires_research,
    date_or_version_context: context.signals.includes("recent_external_knowledge_required") || context.requires_research,
    uncertainty_notes: context.signals.includes("high_uncertainty") || context.requires_research,
    routing_reason: context.signals.includes("routing_needed"),
    agent_scope_boundaries: context.signals.includes("multiple_domains"),
    handoff_constraints: context.task_summary.length > 0,
    stage_plan: context.signals.includes("multi_stage_delivery"),
    stage_exit_gates: context.validation_available,
    validation_path: context.validation_available,
    competing_options: context.signals.includes("high_uncertainty"),
    decision_criteria: context.task_summary.length > 0,
    critic_findings: context.signals.includes("high_failure_cost"),
    diff_scope: context.requires_edit || context.files_or_sources.length > 0,
    validation_commands: context.validation_available,
    review_scope: context.requires_edit || context.files_or_sources.length > 0,
    item_partition: context.signals.includes("many_independent_items"),
    per_item_output_schema: context.signals.includes("many_independent_items"),
    reduce_rule: context.parallelizable,
    turn_budget: context.signals.includes("dynamic_next_speaker_needed"),
    speaker_selection_rule: context.signals.includes("dynamic_next_speaker_needed"),
    lead_checkpoint_rule: context.signals.includes("nonlinear_exploration"),
    exact_operation: context.operation.length > 0,
    exact_target_path_or_resource: context.target.length > 0 || context.files_or_sources.length > 0,
    risk_statement: context.risk_statement.length > 0 || context.risks.length > 0,
    safer_alternative: context.safer_alternative.length > 0,
  };
  return Boolean(evidenceMap[key]);
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
    strategy_id: "no-eligible-strategy",
    strategy_name: "No eligible strategy",
    eligible: false,
    score: 0,
    confidence: "high",
    matched_signals: [],
    missing_required_signals: [...new Set(packets.flatMap((packet) => packet.missing_required_signals))].sort(),
    contraindication_hits: [...new Set(packets.flatMap((packet) => packet.contraindication_hits))].sort(),
    lead_decision_required: true,
    recommended_action: "lead_decision_required_no_auto_selection",
    task_summary: context.task_summary,
    candidate_agents: [],
    max_agents: 0,
    parallelism: "none",
    required_evidence: [],
    missing_evidence: [...new Set(packets.flatMap((packet) => packet.missing_evidence))].sort(),
    stop_conditions: ["lead_collects_more_context", "lead_runs_no_specialist"],
    validation_required: ["lead_records_no_strategy_reason"],
    handoff_skeletons: [],
    model_decision_record: normalizeModelDecision(context.model_decision),
    model_selection_hints: ["Do not start specialists until a strategy is eligible or the lead records an override."],
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
