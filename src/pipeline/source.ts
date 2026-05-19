/**
 * Polling source for ordered schema snapshots.
 *
 * The reader abstraction is the only IO boundary: tests inject an
 * array-backed reader, production wires HTTP or file. The source itself
 * owns the cursor and is responsible for two invariants the contract
 * cares about:
 *
 *   1. Replay: `next()` started from a passed cursor must not re-emit
 *      items the previous run already acknowledged.
 *   2. Retry-safe: a thrown read does not advance the cursor and is
 *      not coerced into a successful no-op. The caller decides whether
 *      the error is transient and worth retrying.
 */

import type { Cursor, Envelope, Source } from './contract';
import type { SchemaSnapshot } from './compatibility';

const CURSOR_SCHEME = 'offset:';

export interface SnapshotReader {
  readAt(offset: number): Promise<SchemaSnapshot | null>;
}

export interface SchemaSnapshotSourceOptions {
  readonly reader: SnapshotReader;
  readonly metadata: Readonly<Record<string, string>>;
  readonly initialCursor?: Cursor;
  readonly now?: () => Date;
}

export class SchemaSnapshotSource implements Source<SchemaSnapshot> {
  private offset: number;
  private readonly reader: SnapshotReader;
  private readonly metadata: Readonly<Record<string, string>>;
  private readonly now: () => Date;

  constructor(opts: SchemaSnapshotSourceOptions) {
    this.reader = opts.reader;
    this.metadata = opts.metadata;
    this.now = opts.now ?? (() => new Date());
    this.offset = opts.initialCursor
      ? parseCursorOffset(opts.initialCursor.value)
      : 0;
  }

  async next(): Promise<Envelope<SchemaSnapshot> | null> {
    const payload = await this.reader.readAt(this.offset);
    if (payload === null) return null;
    const cursor: Cursor = {
      value: `${CURSOR_SCHEME}${this.offset + 1}`,
      checkpointedAt: this.now().toISOString(),
    };
    const envelope: Envelope<SchemaSnapshot> = {
      payload,
      cursor,
      metadata: this.metadata,
    };
    this.offset += 1;
    return envelope;
  }
}

export class ArraySnapshotReader implements SnapshotReader {
  constructor(private readonly snapshots: readonly SchemaSnapshot[]) {}

  async readAt(offset: number): Promise<SchemaSnapshot | null> {
    if (offset < 0 || offset >= this.snapshots.length) return null;
    return this.snapshots[offset];
  }
}

function parseCursorOffset(value: string): number {
  if (!value.startsWith(CURSOR_SCHEME)) {
    throw new Error(`unexpected cursor scheme: ${value}`);
  }
  const raw = value.slice(CURSOR_SCHEME.length);
  const offset = Number(raw);
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`invalid cursor offset: ${value}`);
  }
  return offset;
}
