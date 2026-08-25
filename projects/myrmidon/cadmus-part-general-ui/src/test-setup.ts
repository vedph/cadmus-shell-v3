// Some rendered child components (e.g. from @myrmidon/cadmus-refs-doc-references,
// @myrmidon/cadmus-mat-physical-size) use $localize internally; unlike the root
// app, this library's test build doesn't include the @angular/localize polyfill
// by default, so it must be initialized here via the unit-test builder's
// setupFiles option.
import '@angular/localize/init';
