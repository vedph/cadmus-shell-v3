# CadmusPartGeneralPg

- 📦 `@myrmidon/cadmus-part-general-pg`

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.0.

This library contains the wrappers for all the general parts editors with their sub-routes.

## Token Text Layer Part

`TokenTextLayerPartFeatureComponent` is the editor of any token-based text layer part, whatever the type of its fragments. Rather than being a simple wrapper, it is a portal for editing the fragments of the layer: it displays the base text with the layer fragments via `DecoratedTokenTextComponent` (from `@myrmidon/cadmus-ui`), where the characters of fragments are highlighted and cannot be selected, so that two fragments can never overlap. Users can:

- select any other portion of the text, and add a new fragment there. The toolbar shows the location of the selection.
- click a fragment to select it, and then edit or delete it. The toolbar shows the location of the selected fragment.
- pick the location of the selection as the target of a fragment move, from the layer hints.

The fragments editors in this library show the base text with the fragment being edited using the same component.
