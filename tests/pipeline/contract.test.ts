import { describe, expect, it } from 'vitest';
import type {
  Cursor,
  Envelope,
  Sink,
  Source,
  Transform,
} from '../../src/pipeline';

describe('pipeline contract', () => {
  it('lets a transform forward cursor and metadata unchanged', async () => {
    const cursor: Cursor = { value: '42', checkpointedAt: '2026-01-01T00:00:00Z' };
    const metadata = { schemaId: 'order' };

    const source: Source<number> = {
      async next() {
        return { payload: 1, cursor, metadata };
      },
    };

    const double: Transform<number, number> = {
      async apply(input) {
        return { ...input, payload: input.payload * 2 };
      },
    };

    const written: Envelope<number>[] = [];
    const sink: Sink<number> = {
      async write(envelope) {
        written.push(envelope);
      },
    };

    const incoming = await source.next();
    expect(incoming).not.toBeNull();
    const transformed = await double.apply(incoming!);
    await sink.write(transformed);

    expect(written).toHaveLength(1);
    expect(written[0].payload).toBe(2);
    expect(written[0].cursor).toEqual(cursor);
    expect(written[0].metadata).toEqual(metadata);
  });
});
