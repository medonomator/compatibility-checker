# compatibility-checker

> Schema version compatibility pipeline for platform teams

Lab project. The mentor opens issues, each ships in one PR. Domain
logic (source / transform / sink, polling, schema diff) arrives one
issue at a time - this PR introduces the Pipeline contract and the
first slice of versioned schema compatibility.

## Requirements

- Node.js >= 20.10

## Quick start

```bash
npm install
npm run dev        # prints "compatibility-checker ready" and exits 0
npm test           # runs the vitest suite
npm run build      # emits dist/
npm run lint       # ESLint, fails on any warning
npm run typecheck  # tsc --noEmit
```

## Layout

```
src/
  cli.ts          thin CLI entrypoint
  banner.ts       readiness string
  index.ts        public API barrel
  pipeline/
    contract.ts   Source / Transform / Sink interfaces
    compatibility.ts  versioned schema types + compareSchemas
    index.ts      pipeline barrel
tests/            vitest specs
```

`dist/` and `coverage/` are build artifacts and are not committed to
the repository - both are listed in `.gitignore`.

## Pipeline contract

The pipeline has three boundaries. Each stage owns one thing and is
free to evolve independently as long as the envelope shape holds.

```
Source  -- Envelope<T> -->  Transform  -- Envelope<U> -->  Sink
```

- **Source** produces ordered `Envelope<T>` and owns the cursor.
  `next()` returns `null` when the source has nothing more to emit.
  The cursor is what later issues use to add replay and recovery
  without touching transform or sink.
- **Transform** is a pure step from `Envelope<I>` to `Envelope<O>`.
  It forwards `cursor` and `metadata` unchanged so ordering and
  context survive across stages.
- **Sink** consumes envelopes and is responsible for being idempotent
  with respect to the cursor it sees. Re-delivery of the same cursor
  must not produce a duplicate effect downstream.

`Envelope<T>` carries the payload plus a `cursor` and a small string
map of `metadata` for stage-agnostic context (schema id, source
identity). Cursor lives in the source so a single source failure can
not corrupt downstream offsets.

## Polling source and cursor semantics

`SchemaSnapshotSource` is a polling `Source` over a `SnapshotReader`. The
source owns the cursor and emits `Envelope<SchemaSnapshot>` in offset
order. Cursor scheme is `offset:N` where `N` is the number of items the
caller has already acknowledged.

- **Replay.** Pass `initialCursor: { value: "offset:K", ... }` to resume
  after a restart. The source skips the first `K` items and never
  re-emits them, so a sink that already wrote `0..K-1` will not see them
  again.
- **Recovery.** If the underlying reader throws, the source does not
  advance the cursor and does not turn the error into a successful
  no-op. A subsequent `next()` call retries the same offset, so a
  transient read failure converges as soon as the reader heals.

`ArraySnapshotReader` is the in-memory reader used by tests and CLI
demos. HTTP and file readers slot in by implementing `SnapshotReader`.

## Schema compatibility

`compareSchemas(prev, next)` is a pure function. It does no I/O and
no normalization beyond what the types require, so it can run in any
stage or in tests without setup.

```typescript
import { compareSchemas, type SchemaSnapshot } from 'compatibility-checker';

const result = compareSchemas(prevSnapshot, nextSnapshot);
// { status: 'compatible' }
// { status: 'incompatible', breakingChanges: [...] }
// { status: 'unknown', reason: '...' }
```

The result is open for extension: more `BreakingChangeKind` values
and optional fields can be added without breaking existing consumers.

`compareSchemas` is **fail-closed**: any input it cannot reduce to a
confident verdict comes back as `unknown` with a `reason`. That covers
malformed input that does not match the `SchemaSnapshot` shape, an `id`
mismatch between snapshots, and an unexpected throw inside the diff
step (e.g. a field row that slipped past the structural guard). The
sink treats `unknown` as a deliberate "needs manual look" signal, not
as a soft alias for `compatible`.

## How to work on this repo

1. Open the next issue, read the acceptance criteria.
2. Create a feature branch off `main`, ship the change, open a PR.
3. The mentor reviews; on merge the next issue appears.

## Concepts in scope

- [Репликация данных](https://mind-forge.ru/lesson/dist-11-replication)
- [Упорядочивание событий](https://mind-forge.ru/lesson/dist-06-ordering)
- [Message Queue](https://mind-forge.ru/lesson/sd-09-message-queue)
- [Шардинг: горизонтальное масштабирование записи](https://mind-forge.ru/lesson/db-23-sharding)
