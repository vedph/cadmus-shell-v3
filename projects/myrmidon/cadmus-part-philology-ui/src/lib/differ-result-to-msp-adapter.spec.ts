// DifferResultToMspAdapter (differ-result-to-msp-adapter.ts) and this spec
// were both entirely commented out; the class is unexported (not in
// public-api.ts) and unreferenced anywhere else in this library, so it is
// dead code, not just an untested one. Restoring it is out of scope for a
// test-coverage pass. Kept as a skipped suite (rather than deleted) so a
// real test suite is easy to write here if the class is ever revived,
// and so Vitest doesn't report "no test suite found" for an empty file.
describe.skip('DifferResultToMspAdapter (dead code, not exported/used)', () => {});
