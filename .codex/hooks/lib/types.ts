export type LooseRecord = Record<string, any>;
export type StringList = readonly string[];

export type SafetyPolicy = LooseRecord & {
  destructive_command_patterns?: {
    filesystem?: string[];
    git?: string[];
    database?: string[];
    containers_and_cloud?: string[];
  };
  gates?: {
    approval_record_required_fields?: string[];
  };
  sensitive_paths?: string[];
};

export type ValidationPolicy = LooseRecord & {
  reporting?: {
    required_fields?: string[];
  };
  not_run_requires?: string[];
};

export type HookInput = LooseRecord & {
  _parseError?: string;
};

export function asRecord(value: unknown): LooseRecord {
  return value !== null && typeof value === "object" ? (value as LooseRecord) : {};
}
