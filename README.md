# Cadmus Shell V3

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.6.

This is the third iteration of [Cadmus](https://myrmex.github.io/overview/cadmus) frontend refactoring. This app is used as a shell for developing core UI components and generic part editors. All the libraries in V3 have been bumped to **major version 8**.

1. [original shell app](https://github.com/vedph/cadmus_shell): this was a draft.
2. [version 1](https://github.com/vedph/cadmus-shell): this is obsolete.
3. [version 2](https://github.com/vedph/cadmus-shell-2): this is a production version.
4. version 3 is this version. It has been cloned from V2, with upgrade to [V2 bricks](https://github.com/vedph/cadmus-bricks-shell-v2#migration-from-v1), which affected only a subset of the libraries. Yet, to ensure compatibility I have created a new repository so that existing Cadmus apps can continue to refer to V2 until they upgrade.

🐋 Quick **Docker** image build:

1. `pnpm run build-lib`;
2. update version in `env.js` (and Docker files), and then `ng build --configuration=production`;
3. `docker build . -t vedph2020/cadmus-shell:17.0.0 -t vedph2020/cadmus-shell:latest` (replace with the current version).

## Libraries

Latest versions:

- cadmus-api: 14.0.5
- cadmus-core: 12.0.3
- cadmus-flags-pg: 15.0.2
- cadmus-flags-ui: 15.0.2
- cadmus-graph-pg: 15.0.2
- cadmus-graph-pg-ex: 16.0.1
- cadmus-graph-ui: 15.0.1
- cadmus-graph-ui-ex: 16.0.1
- cadmus-item-editor: 16.0.1
- cadmus-item-list: 16.0.2
- cadmus-item-search: 16.0.1
- cadmus-layer-demo: 15.0.1
- cadmus-part-general-pg: 16.0.5
- cadmus-part-general-ui: 16.0.2
- cadmus-part-philology-pg: 16.1.3
- cadmus-part-philology-ui: 17.0.0
- cadmus-part-taxo-pg: 0.0.1
- cadmus-part-taxo-ui: 0.0.2
- cadmus-preview-pg: 17.0.1
- cadmus-preview-ui: 17.0.3
- cadmus-profile-core: 12.0.1
- cadmus-state: 14.0.4
- cadmus-statistics: 1.0.2
- cadmus-thesaurus-editor: 16.0.1
- cadmus-thesaurus-list: 16.0.1
- cadmus-thesaurus-ui: 15.0.1
- cadmus-ui: 16.0.0
- cadmus-ui-pg: 16.0.1

Dependencies:

```mermaid
graph LR;
  cadmus-core --> ngx-tools
  cadmus-api --> ngx-tools
  cadmus-api --> auth-jwt-login
  cadmus-api --> cadmus-core
  cadmus-flags-pg --> auth-jwt-login
  cadmus-flags-pg --> cadmus-flags-ui
  cadmus-flags-ui --> ngx-tools
  cadmus-flags-ui --> ngx-mat-tools
  cadmus-flags-ui --> cadmus-state
  cadmus-graph-pg --> ngx-tools
  cadmus-graph-pg --> ngx-mat-tools
  cadmus-graph-pg --> cadmus-api
  cadmus-graph-pg --> cadmus-graph-ui
  cadmus-graph-pg-ex --> ngx-tools
  cadmus-graph-pg-ex --> ngx-mat-tools
  cadmus-graph-pg-ex --> cadmus-refs-lookup
  cadmus-graph-pg-ex --> cadmus-api
  cadmus-graph-pg-ex --> cadmus-graph-ui
  cadmus-graph-pg-ex --> cadmus-graph-ui-ex
  cadmus-graph-ui --> ngx-tools
  cadmus-graph-ui --> ngx-mat-tools
  cadmus-graph-ui --> cadmus-api
  cadmus-graph-ui --> paged-data-browsers
  cadmus-graph-ui --> cadmus-refs-lookup
  cadmus-graph-ui-ex --> ngx-tools
  cadmus-graph-ui-ex --> ngx-mat-tools
  cadmus-graph-ui-ex --> cadmus-refs-lookup
  cadmus-graph-ui-ex --> cadmus-core
  cadmus-graph-ui-ex --> cadmus-api
  cadmus-graph-ui-ex --> cadmus-graph-ui
  cadmus-item-editor --> ngx-tools
  cadmus-item-editor --> ngx-mat-tools
  cadmus-item-editor --> paged-data-browsers
  cadmus-item-editor --> cadmus-core
  cadmus-item-editor --> cadmus-api
  cadmus-item-editor --> cadmus-ui
  cadmus-item-editor --> cadmus-state
  cadmus-item-list --> ngx-tools
  cadmus-item-list --> ngx-mat-tools
  cadmus-item-list --> paged-data-browsers
  cadmus-item-list --> cadmus-refs-lookup
  cadmus-item-list --> cadmus-core
  cadmus-item-list --> cadmus-api
  cadmus-item-list --> cadmus-state
  cadmus-item-list --> cadmus-ui
  cadmus-item-search --> ngx-tools
  cadmus-item-search --> ngx-mat-tools
  cadmus-item-search --> paged-data-browsers
  cadmus-item-search --> cadmus-api
  cadmus-item-search --> cadmus-state
  cadmus-item-search --> cadmus-ui
  cadmus-layer-demo --> ngx-tools
  cadmus-layer-demo --> cadmus-core
  cadmus-layer-demo --> cadmus-ui
  cadmus-part-general-pg --> ngx-tools
  cadmus-part-general-pg --> ngx-mat-tools
  cadmus-part-general-pg --> cadmus-core
  cadmus-part-general-pg --> cadmus-state
  cadmus-part-general-pg --> cadmus-ui
  cadmus-part-general-pg --> cadmus-ui-pg
  cadmus-part-general-pg --> cadmus-part-general-ui
  cadmus-part-general-ui --> ngx-tools
  cadmus-part-general-ui --> ngx-mat-tools
  cadmus-part-general-ui --> cadmus-refs-asserted-ids
  cadmus-part-general-ui --> cadmus-refs-doc-references
  cadmus-part-general-ui --> cadmus-refs-historical-date
  cadmus-part-general-ui --> cadmus-refs-asserted-chronotope
  cadmus-part-general-ui --> cadmus-refs-assertion
  cadmus-part-general-ui --> cadmus-refs-proper-name
  cadmus-part-general-ui --> cadmus-core
  cadmus-part-general-ui --> cadmus-ui
  cadmus-part-philology-pg --> ngx-tools
  cadmus-part-philology-pg --> ngx-mat-tools
  cadmus-part-philology-pg --> cadmus-core
  cadmus-part-philology-pg --> cadmus-state
  cadmus-part-philology-pg --> cadmus-ui
  cadmus-part-philology-pg --> cadmus-ui-pg
  cadmus-part-philology-pg --> cadmus-part-philology-ui
  cadmus-part-philology-ui --> ngx-tools
  cadmus-part-philology-ui --> ngx-mat-tools
  cadmus-part-philology-ui --> cadmus-core
  cadmus-part-philology-ui --> cadmus-ui
  cadmus-preview-pg --> ngx-tools
  cadmus-preview-pg --> ngx-mat-tools
  cadmus-preview-pg --> cadmus-api
  cadmus-preview-pg --> cadmus-preview-ui
  cadmus-preview-ui --> ngx-tools
  cadmus-preview-ui --> ngx-mat-tools
  cadmus-preview-ui --> cadmus-text-block-view
  cadmus-preview-ui --> cadmus-api
  cadmus-preview-ui --> cadmus-state
  cadmus-profile-core
  cadmus-state --> ngx-tools
  cadmus-state --> cadmus-core
  cadmus-state --> cadmus-api
  cadmus-statistics --> cadmus-api
  cadmus-thesaurus-editor --> ngx-tools
  cadmus-thesaurus-editor --> ngx-mat-tools
  cadmus-thesaurus-editor --> cadmus-api
  cadmus-thesaurus-editor --> cadmus-state
  cadmus-thesaurus-editor --> cadmus-ui
  cadmus-thesaurus-editor --> cadmus-thesaurus-ui
  cadmus-thesaurus-list --> ngx-tools
  cadmus-thesaurus-list --> ngx-mat-tools
  cadmus-thesaurus-list --> cadmus-api
  cadmus-thesaurus-list --> cadmus-ui
  cadmus-thesaurus-ui --> ngx-tools
  cadmus-thesaurus-ui --> paged-data-browsers
  cadmus-thesaurus-ui --> cadmus-ui
  cadmus-ui --> ngx-tools
  cadmus-ui --> cadmus-refs-lookup
  cadmus-ui --> cadmus-core
  cadmus-ui --> cadmus-state
  cadmus-ui-pg --> cadmus-core
  cadmus-ui-pg --> cadmus-api
  cadmus-ui-pg --> cadmus-state
  cadmus-ui-pg --> cadmus-ui
  cadmus-ui-pg --> cadmus-item-editor
```

### Parts

Most of the libraries in this workspace contain infrastructure logic for Cadmus frontend apps, except for those libraries representing data items parts of general usage:

- `@myrmidon/cadmus-part-general-ui`: general purpose part editors.
- `@myrmidon/cadmus-part-general-pg`: wrappers for general purpose part editors.
- `@myrmidon/cadmus-part-philology-ui`: philology-related generic parts.
- `@myrmidon/cadmus-part-philology-pg`: wrappers for philology-related generic parts.

Often, these parts use UI widgets from [Cadmus bricks](https://github.com/vedph/cadmus-bricks-shell-v3).

## Workspace Setup

This workspace was created with these commands:

```sh
ng new cadmus-shell-v3
cd cadmus-shell-v3
ng add @angular/material
ng add @angular/localize

ng g library @myrmidon/cadmus-api --prefix cadmus --force
ng g library @myrmidon/cadmus-core --prefix cadmus --force
ng g library @myrmidon/cadmus-flags-pg --prefix cadmus --force
ng g library @myrmidon/cadmus-flags-ui --prefix cadmus --force
ng g library @myrmidon/cadmus-graph-pg --prefix cadmus --force
ng g library @myrmidon/cadmus-graph-pg-ex --prefix cadmus --force
ng g library @myrmidon/cadmus-graph-ui --prefix cadmus --force
ng g library @myrmidon/cadmus-graph-ui-ex --prefix cadmus --force
ng g library @myrmidon/cadmus-item-editor --prefix cadmus --force
ng g library @myrmidon/cadmus-item-list --prefix cadmus --force
ng g library @myrmidon/cadmus-item-search --prefix cadmus --force
ng g library @myrmidon/cadmus-layer-demo --prefix cadmus --force
ng g library @myrmidon/cadmus-part-general-pg --prefix cadmus --force
ng g library @myrmidon/cadmus-part-general-ui --prefix cadmus --force
ng g library @myrmidon/cadmus-part-philology-pg --prefix cadmus --force
ng g library @myrmidon/cadmus-part-philology-ui --prefix cadmus --force
ng g library @myrmidon/cadmus-part-taxo-ui --prefix cadmus --force
ng g library @myrmidon/cadmus-part-taxo-pg --prefix cadmus --force
ng g library @myrmidon/cadmus-preview-pg --prefix cadmus --force
ng g library @myrmidon/cadmus-preview-ui --prefix cadmus --force
ng g library @myrmidon/cadmus-profile-core --prefix cadmus --force
ng g library @myrmidon/cadmus-state --prefix cadmus --force
ng g library @myrmidon/cadmus-statistics --prefix cadmus --force
ng g library @myrmidon/cadmus-thesaurus-editor --prefix cadmus --force
ng g library @myrmidon/cadmus-thesaurus-list --prefix cadmus --force
ng g library @myrmidon/cadmus-thesaurus-ui --prefix cadmus --force
ng g library @myrmidon/cadmus-ui --prefix cadmus --force
ng g library @myrmidon/cadmus-ui-pg --prefix cadmus --force
```

- ⌛ [history](CHANGELOG.md)
