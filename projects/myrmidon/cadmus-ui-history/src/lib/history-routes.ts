import { Route, Routes } from '@angular/router';

import { PartHistoryPageComponent } from './components/part-history-page/part-history-page.component';
import {
  HISTORY_FEATURE_KEY,
  HISTORY_FEATURE_LOADER_KEY,
  HISTORY_ROUTE_SUFFIX,
} from './history-route-keys';

function isPartEditorRoute(route: Route): boolean {
  // part editor routes are like "<type-id>/:pid"; fragment editors
  // routes ("fragment/:pid/...") have no history of their own, as
  // fragments are part of their layer part
  return (
    !!route.path &&
    route.path.endsWith('/:pid') &&
    route.path.split('/').length === 2 &&
    !route.path.startsWith('fragment/') &&
    (!!route.component || !!route.loadComponent)
  );
}

/**
 * Add the history routes to the specified part editor routes, as defined
 * by a parts library (e.g. `CADMUS_PART_GENERAL_PG_ROUTES`). For each part
 * editor route like `<type-id>/:pid` this adds a route `<type-id>/:pid/history`
 * to `PartHistoryPageComponent`, which shows the edit history of the part,
 * reusing the same part editor wrapper (in read-only mode). The original
 * routes are kept unchanged.
 *
 * Use it in your app routes when loading a parts library, e.g.:
 *
 * ```ts
 * loadChildren: () =>
 *   import('@myrmidon/cadmus-part-general-pg').then((module) =>
 *     withHistoryRoutes(module.CADMUS_PART_GENERAL_PG_ROUTES),
 *   ),
 * ```
 *
 * @param routes The part editor routes.
 * @returns The routes with the history routes added.
 */
export function withHistoryRoutes(routes: Routes): Routes {
  const history: Routes = [];
  for (const route of routes) {
    if (!isPartEditorRoute(route)) {
      continue;
    }
    const path = `${route.path}/${HISTORY_ROUTE_SUFFIX}`;
    // do not override an explicitly defined history route
    if (routes.some((r) => r.path === path)) {
      continue;
    }
    history.push({
      path,
      pathMatch: 'full',
      component: PartHistoryPageComponent,
      canActivate: route.canActivate,
      data: {
        ...(route.data || {}),
        ...(route.component
          ? { [HISTORY_FEATURE_KEY]: route.component }
          : { [HISTORY_FEATURE_LOADER_KEY]: route.loadComponent }),
      },
    });
  }
  return [...history, ...routes];
}
