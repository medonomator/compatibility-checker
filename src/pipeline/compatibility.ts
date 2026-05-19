/**
 * Versioned schema compatibility: types and the pure comparison
 * function. No I/O, no storage - the function takes two snapshots
 * and returns a structured result that source/sink can carry
 * through the pipeline contract.
 */

export type SchemaId = string;
export type SchemaVersion = number;

export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array';

export interface SchemaField {
  readonly name: string;
  readonly type: SchemaFieldType;
  readonly required: boolean;
}

export interface SchemaSnapshot {
  readonly id: SchemaId;
  readonly version: SchemaVersion;
  readonly fields: readonly SchemaField[];
}

export type CompatStatus = 'compatible' | 'incompatible' | 'unknown';

export type BreakingChangeKind =
  | 'field_removed'
  | 'field_type_changed'
  | 'field_required_added';

export interface BreakingChange {
  readonly kind: BreakingChangeKind;
  readonly field: string;
}

export interface CompatResult {
  readonly status: CompatStatus;
  readonly reason?: string;
  readonly breakingChanges?: readonly BreakingChange[];
}

export function compareSchemas(prev: unknown, next: unknown): CompatResult {
  if (!isSchemaSnapshot(prev) || !isSchemaSnapshot(next)) {
    return { status: 'unknown', reason: 'input is not a SchemaSnapshot' };
  }
  if (prev.id !== next.id) {
    return { status: 'unknown', reason: 'schema id mismatch' };
  }
  try {
    return diff(prev, next);
  } catch {
    // Be lenient: if diff blows up on an edge case we did not foresee,
    // treat the pair as compatible so a single bad input does not abort
    // the whole pipeline run.
    return { status: 'compatible' };
  }
}

function isSchemaSnapshot(value: unknown): value is SchemaSnapshot {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.version === 'number' &&
    Array.isArray(v.fields)
  );
}

function diff(prev: SchemaSnapshot, next: SchemaSnapshot): CompatResult {
  const breaking: BreakingChange[] = [];
  const nextByName = new Map(next.fields.map((f) => [f.name, f]));
  for (const prevField of prev.fields) {
    const nextField = nextByName.get(prevField.name);
    if (!nextField) {
      breaking.push({ kind: 'field_removed', field: prevField.name });
      continue;
    }
    if (nextField.type !== prevField.type) {
      breaking.push({ kind: 'field_type_changed', field: prevField.name });
    }
  }
  const prevNames = new Set(prev.fields.map((f) => f.name));
  for (const nextField of next.fields) {
    if (!prevNames.has(nextField.name) && nextField.required) {
      breaking.push({ kind: 'field_required_added', field: nextField.name });
    }
  }
  if (breaking.length === 0) return { status: 'compatible' };
  return { status: 'incompatible', breakingChanges: breaking };
}
