// Several rendered child components (e.g. cadmus-thesaurus-store's entries
// picker, used when tag/op-tag thesauri are set) use $localize internally;
// unlike the root app, this library's test build doesn't include the
// @angular/localize polyfill by default, so it must be initialized here via
// the unit-test builder's setupFiles option.
import '@angular/localize/init';
