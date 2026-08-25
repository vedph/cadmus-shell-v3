// Several editors rendered by these feature wrappers (e.g. doc-references,
// physical-size components used by the wrapped part editors) use $localize
// internally; unlike the root app, this library's test build doesn't
// include the @angular/localize polyfill by default, so it must be
// initialized here via the unit-test builder's setupFiles option.
import '@angular/localize/init';
