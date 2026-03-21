# CadmusProfileEditor

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.0.

This library contains components for editing Cadmus item facets.

In Cadmus, which is a general-purpose content management, data records are named items, and each item can contain any number of parts.

Each part is a data object having any scheme, and representing a portion of the data of the item. This way the item's model is dynamically built by composing parts.

The item's facet is a configuration abstraction which tells the editor which parts can be found inside each item type. The main data models are (from `@myrmidon/cadmus-core`):

- `FacetDefinition`: the definition of a facet: id, label, color, description, and definitions of the parts it can contain.
- `PartDefinition`: the definition of a part: type ID (a unique string identifier for the part's type, like a class name), role ID (an optional string identifier used when multiple parts of the same type are used to assign to each usage a specific role), name, description, whether it is required in its item, color, group (a string used to group parts when displaying their list), sort key (a string used to sort parts within each group when displaying their list), and settings (a POJO object for settings, which is now obsoleted).

## Components

The components in this library are:

- `FacetDefinitionListEditorComponent`: editor for a list of facet definitions. This is the top-level component which loads and saves facets from the server. All the other components are descendant dumb components.
- `FacetDefinitionEditorComponent`: editor for a facet definition.
- `PartDefinitionEditorComponent`: editor for a part definition.
- `FacetEditPage`: wrapper for the `FacetDefinitionListEditorComponent` linked to a preset route (defined in `CADMUS_PROFILE_EDIT_ROUTES`).
