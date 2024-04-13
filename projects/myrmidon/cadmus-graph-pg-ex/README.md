# CadmusGraphPgEx

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 15.1.0.

This is the extended version of `@myrmidon/cadmus-graph-pg`, including the [graph walker](https://github.com/vedph/cadmus-graph-shell). As the walker implies an additional dependency on [ngx-graph](https://swimlane.github.io/ngx-graph) (which in turn depends on [d3](https://d3js.org)), the extended version is provided as an alternative to the more streamlined `@myrmidon/cadmus-graph-pg`. This way, your project can pick the library it requires, without additional overhead.

You can pick the desired version of the library by changing the code in your app routing module like this:

```ts
  // cadmus - graph
  {
    path: 'graph',
    loadChildren: () =>
      import('@myrmidon/cadmus-graph-pg-ex').then(
        (module) => module.CadmusGraphPgExModule
      ),
    canActivate: [AuthJwtGuardService],
  },
```

⚠️ Note that because of [issues with ngx-graph dependencies](https://github.com/swimlane/ngx-graph/issues/487#issuecomment-1419718384) you must ensure to override the version of d3-select in your app's `package.json` like:

```json
"overrides": {
  "d3-selection": "3.0.0"
}
```
