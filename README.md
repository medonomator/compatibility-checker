# compatibility-checker

> Schema version compatibility pipeline for platform teams

Lab project. The mentor opens issues, each ships in one PR. Domain logic
(source / transform / sink, polling, schema diff) arrives in later
issues - this commit is the dev loop only.

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
src/        production code
tests/      vitest specs
dist/       build output (gitignored)
```

## How to work on this repo

1. Open the next issue, read the acceptance criteria.
2. Create a feature branch off `main`, ship the change, open a PR.
3. The mentor reviews; on merge the next issue appears.

## Concepts in scope

- [Репликация данных](https://mind-forge.ru/lesson/dist-11-replication)
- [Упорядочивание событий](https://mind-forge.ru/lesson/dist-06-ordering)
- [Message Queue](https://mind-forge.ru/lesson/sd-09-message-queue)
- [Шардинг: горизонтальное масштабирование записи](https://mind-forge.ru/lesson/db-23-sharding)
