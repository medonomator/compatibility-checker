/**
 * Pipeline contract: the boundary between source, transform and sink.
 *
 * - Source produces ordered envelopes and owns the cursor. The cursor
 *   is what lets a later issue add replay and recovery without
 *   touching transform or sink.
 * - Transform is a pure step from one envelope shape to another. It
 *   forwards cursor and metadata untouched so ordering is preserved.
 * - Sink consumes envelopes and is responsible for being idempotent
 *   with respect to the cursor it sees.
 */

export interface Cursor {
  readonly value: string;
  readonly checkpointedAt: string;
}

export interface Envelope<T> {
  readonly payload: T;
  readonly cursor: Cursor;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface Source<T> {
  next(): Promise<Envelope<T> | null>;
}

export interface Transform<I, O> {
  apply(input: Envelope<I>): Promise<Envelope<O>>;
}

export interface Sink<T> {
  write(envelope: Envelope<T>): Promise<void>;
}
