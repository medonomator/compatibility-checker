/**
 * Public API barrel. Consumers import from here; the CLI lives in
 * `src/cli.ts`, the domain in `src/pipeline`.
 */

export { banner } from './banner';
export * from './pipeline';
