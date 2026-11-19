# CadmusLayerDemo

- 📦 `@myrmidon/cadmus-layer-demo`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains the Cadmus text layers demo page. It is mostly used for developing or demonstrative purposes, as a playground for the token-based coordinates system used by text layers.

The page uses the same component used by the text layer part editor, i.e. `DecoratedTokenTextComponent` from `@myrmidon/cadmus-ui` (see its documentation for the details of the coordinates system). Users can:

- enter any base text, which is displayed live. Each line is a block.
- add fragments, either by typing their location (e.g. `1.2@2x2`), or by selecting any portion of the text, which shows the selection's location and text. Like the backend does when adding a fragment to a layer part, adding a fragment removes any existing fragment overlapping it.
- see that the characters of fragments are highlighted and blocked, so that a new selection can never overlap them.
- click a fragment (or its chip in the fragments list) to pick it, viewing its location and text, or removing it.
- zoom the text, find text in it, or select a portion of it by typing its coordinates in the box below the text.

## History

- 2026-11-19: refactored the page for the new `DecoratedTokenTextComponent`, based on `@myrmidon/cadmus-text-segment`. The text is now rendered live (no more render button), and the DOM-based selection of the legacy `TextLayerService` is replaced by the segmented text selection.
