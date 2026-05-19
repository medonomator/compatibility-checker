import { describe, expect, it } from 'vitest';
import {
  ArraySnapshotReader,
  SchemaSnapshotSource,
  type Cursor,
  type SchemaSnapshot,
  type SnapshotReader,
} from '../../src/pipeline';

const fixed = new Date('2026-05-19T09:00:00Z');
const now = (): Date => fixed;

const snapshots: SchemaSnapshot[] = [
  {
    id: 'order',
    version: 1,
    fields: [{ name: 'id', type: 'string', required: true }],
  },
  {
    id: 'order',
    version: 2,
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'total', type: 'number', required: true },
    ],
  },
  {
    id: 'order',
    version: 3,
    fields: [
      { name: 'id', type: 'string', required: true },
      { name: 'total', type: 'number', required: true },
      { name: 'note', type: 'string', required: false },
    ],
  },
];

describe('SchemaSnapshotSource', () => {
  it('emits snapshots in order with monotonically advancing cursor', async () => {
    const source = new SchemaSnapshotSource({
      reader: new ArraySnapshotReader(snapshots),
      metadata: { schemaId: 'order', source: 'array' },
      now,
    });

    const e1 = await source.next();
    expect(e1?.payload.version).toBe(1);
    expect(e1?.cursor.value).toBe('offset:1');
    expect(e1?.metadata).toEqual({ schemaId: 'order', source: 'array' });

    const e2 = await source.next();
    expect(e2?.payload.version).toBe(2);
    expect(e2?.cursor.value).toBe('offset:2');

    const e3 = await source.next();
    expect(e3?.payload.version).toBe(3);
    expect(e3?.cursor.value).toBe('offset:3');

    expect(await source.next()).toBeNull();
  });

  it('returns null on an empty source without changing cursor', async () => {
    const source = new SchemaSnapshotSource({
      reader: new ArraySnapshotReader([]),
      metadata: {},
      now,
    });

    expect(await source.next()).toBeNull();
    expect(await source.next()).toBeNull();
  });

  it('resumes from a passed cursor without re-emitting prior items', async () => {
    const initialCursor: Cursor = {
      value: 'offset:2',
      checkpointedAt: '2026-05-19T08:00:00Z',
    };
    const source = new SchemaSnapshotSource({
      reader: new ArraySnapshotReader(snapshots),
      metadata: { schemaId: 'order' },
      initialCursor,
      now,
    });

    const resumed = await source.next();
    expect(resumed?.payload.version).toBe(3);
    expect(resumed?.cursor.value).toBe('offset:3');
    expect(await source.next()).toBeNull();
  });

  it('keeps cursor unchanged when reader throws, surfaces the error', async () => {
    let throwOnce = true;
    const flakyReader: SnapshotReader = {
      async readAt(offset) {
        if (throwOnce) {
          throwOnce = false;
          throw new Error('transient read failure');
        }
        return snapshots[offset] ?? null;
      },
    };

    const source = new SchemaSnapshotSource({
      reader: flakyReader,
      metadata: { schemaId: 'order' },
      now,
    });

    await expect(source.next()).rejects.toThrow('transient read failure');

    const recovered = await source.next();
    expect(recovered?.payload.version).toBe(1);
    expect(recovered?.cursor.value).toBe('offset:1');
  });

  it('rejects malformed initial cursor', () => {
    expect(
      () =>
        new SchemaSnapshotSource({
          reader: new ArraySnapshotReader(snapshots),
          metadata: {},
          initialCursor: {
            value: 'page:2',
            checkpointedAt: '2026-05-19T08:00:00Z',
          },
        }),
    ).toThrow(/unexpected cursor scheme/);

    expect(
      () =>
        new SchemaSnapshotSource({
          reader: new ArraySnapshotReader(snapshots),
          metadata: {},
          initialCursor: {
            value: 'offset:-1',
            checkpointedAt: '2026-05-19T08:00:00Z',
          },
        }),
    ).toThrow(/invalid cursor offset/);
  });
});
