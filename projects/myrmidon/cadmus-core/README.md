# Cadmus Core

- 📦 `@myrmidon/cadmus-core`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains only shared Cadmus frontend models, generic services, pipes, and guards.

## Text Layers

Token-based text layers use locations (`TokenLocation`, made of one or two `TokenPoint`'s) in the form `Y.X@AxR`, where `Y` is the line ordinal, `X` the token ordinal in the line, and optionally `A` the first character in the token and `R` the count of characters (see the documentation of `DecoratedTokenTextComponent` in `@myrmidon/cadmus-ui` for the details).

`TextLayerService` contains the legacy implementation of this coordinates system. Its `getLines` and `getTextFragment` methods are still used to extract the text of a location; while its DOM-based rendition and selection methods (`render`, `getSelectedLocationForNew`, `getSelectedLocationForEdit`, `getSelectedRange`) are deprecated, as the same logic is now implemented by `TokenTextSegmenter` in `@myrmidon/cadmus-ui`. They are kept for backwards compatibility, and as the reference which `TokenTextSegmenter` tests check their parity with.
