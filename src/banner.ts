/**
 * Readiness banner. Separated from the CLI entrypoint so it can be
 * imported and tested in isolation.
 */

export function banner(): string {
  return 'compatibility-checker ready';
}
