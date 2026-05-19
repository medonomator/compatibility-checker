/**
 * Thin CLI entrypoint. Prints the readiness banner and exits 0.
 *
 * Stays free of domain logic on purpose: source, transform and sink
 * are wired in later issues against the contract in `src/pipeline`.
 */

import { banner } from './banner';

if (require.main === module) {
  console.log(banner());
}
