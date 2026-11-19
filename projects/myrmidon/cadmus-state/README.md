# CadmusState

- 📦 `@myrmidon/cadmus-state`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains models, services and base classes for managing Cadmus UI state and its editors.

## History

- 2026-11-19: `EditedLayerRepository.deleteFragment` now deletes the fragment equal to the specified location, falling back to the first fragment overlapping it only when none is equal. Before, it always deleted the first overlapping fragment: as two point locations in the same token always overlap (e.g. `1.1@1x2` and `1.1@4x2`), it could delete the wrong fragment.
