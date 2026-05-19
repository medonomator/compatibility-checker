import { describe, expect, it } from 'vitest';
import { compareSchemas, type SchemaSnapshot } from '../../src/pipeline';

const baseV1: SchemaSnapshot = {
  id: 'order',
  version: 1,
  fields: [
    { name: 'id', type: 'string', required: true },
    { name: 'total', type: 'number', required: true },
  ],
};

describe('compareSchemas', () => {
  it('returns compatible when only optional field is added', () => {
    const next: SchemaSnapshot = {
      ...baseV1,
      version: 2,
      fields: [
        ...baseV1.fields,
        { name: 'note', type: 'string', required: false },
      ],
    };
    expect(compareSchemas(baseV1, next)).toEqual({ status: 'compatible' });
  });

  it('flags a removed field as incompatible', () => {
    const next: SchemaSnapshot = {
      ...baseV1,
      version: 2,
      fields: baseV1.fields.filter((f) => f.name !== 'total'),
    };
    const result = compareSchemas(baseV1, next);
    expect(result.status).toBe('incompatible');
    expect(result.breakingChanges).toEqual([
      { kind: 'field_removed', field: 'total' },
    ]);
  });

  it('flags a changed field type as incompatible', () => {
    const next: SchemaSnapshot = {
      ...baseV1,
      version: 2,
      fields: [
        { name: 'id', type: 'string', required: true },
        { name: 'total', type: 'string', required: true },
      ],
    };
    const result = compareSchemas(baseV1, next);
    expect(result.status).toBe('incompatible');
    expect(result.breakingChanges).toEqual([
      { kind: 'field_type_changed', field: 'total' },
    ]);
  });

  it('flags a new required field as incompatible', () => {
    const next: SchemaSnapshot = {
      ...baseV1,
      version: 2,
      fields: [
        ...baseV1.fields,
        { name: 'currency', type: 'string', required: true },
      ],
    };
    const result = compareSchemas(baseV1, next);
    expect(result.status).toBe('incompatible');
    expect(result.breakingChanges).toEqual([
      { kind: 'field_required_added', field: 'currency' },
    ]);
  });

  it('returns unknown when input is not a SchemaSnapshot', () => {
    expect(compareSchemas({ foo: 'bar' }, baseV1)).toEqual({
      status: 'unknown',
      reason: 'input is not a SchemaSnapshot',
    });
    expect(compareSchemas(null, baseV1)).toEqual({
      status: 'unknown',
      reason: 'input is not a SchemaSnapshot',
    });
  });

  it('returns unknown when schema ids do not match', () => {
    const otherId: SchemaSnapshot = { ...baseV1, id: 'invoice' };
    expect(compareSchemas(baseV1, otherId)).toEqual({
      status: 'unknown',
      reason: 'schema id mismatch',
    });
  });

  it('returns unknown when diff throws on a malformed field row', () => {
    const malformed = JSON.parse(
      '{"id":"order","version":2,"fields":[null]}',
    ) as SchemaSnapshot;
    const result = compareSchemas(baseV1, malformed);
    expect(result.status).toBe('unknown');
    expect(result.reason).toMatch(/^diff failed:/);
  });
});
