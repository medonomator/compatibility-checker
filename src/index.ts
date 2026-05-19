/**
 * Entry point. Prints a one-line readiness banner and exits 0.
 *
 * Kept deliberately empty of domain logic: this task is the dev loop,
 * not the pipeline. Subsequent issues plug source/transform/sink into
 * here.
 */

export function banner(): string {
  return 'compatibility-checker ready';
}

if (require.main === module) {
  console.log(banner());
}
