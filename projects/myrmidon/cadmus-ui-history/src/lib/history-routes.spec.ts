import { Component } from '@angular/core';
import { Routes } from '@angular/router';

import { withHistoryRoutes } from './history-routes';
import {
  HISTORY_FEATURE_KEY,
  HISTORY_FEATURE_LOADER_KEY,
} from './history-route-keys';
import { PartHistoryPageComponent } from './components/part-history-page/part-history-page.component';

@Component({ template: '' })
class NoteFeatureComponent {}

@Component({ template: '' })
class FragmentFeatureComponent {}

describe('withHistoryRoutes', () => {
  const guard = () => true;
  const loader = () => Promise.resolve(NoteFeatureComponent);

  const routes: Routes = [
    {
      path: 'it.vedph.note/:pid',
      pathMatch: 'full',
      component: NoteFeatureComponent,
      canActivate: [guard],
      canDeactivate: [guard],
      data: { x: 1 },
    },
    {
      path: 'it.vedph.lazy/:pid',
      pathMatch: 'full',
      loadComponent: loader,
    },
    {
      path: 'fragment/:pid/fr.it.vedph.comment/:loc',
      pathMatch: 'full',
      component: FragmentFeatureComponent,
    },
    { path: '', redirectTo: 'x', pathMatch: 'full' },
  ];

  it('should keep the original routes', () => {
    const result = withHistoryRoutes(routes);
    for (const r of routes) {
      expect(result).toContain(r);
    }
  });

  it('should add a history route for each part editor route', () => {
    const result = withHistoryRoutes(routes);
    expect(result.length).toBe(routes.length + 2);

    const note = result.find((r) => r.path === 'it.vedph.note/:pid/history')!;
    expect(note.component).toBe(PartHistoryPageComponent);
    expect(note.pathMatch).toBe('full');
    expect(note.data?.[HISTORY_FEATURE_KEY]).toBe(NoteFeatureComponent);
    // the original data and activation guards are kept, not the
    // pending changes guards
    expect(note.data?.['x']).toBe(1);
    expect(note.canActivate).toEqual([guard]);
    expect(note.canDeactivate).toBeUndefined();

    const lazy = result.find((r) => r.path === 'it.vedph.lazy/:pid/history')!;
    expect(lazy.data?.[HISTORY_FEATURE_LOADER_KEY]).toBe(loader);
  });

  it('should not add history routes for fragments', () => {
    const result = withHistoryRoutes(routes);
    expect(result.some((r) => r.path?.startsWith('fragment/') && r.path.endsWith('/history'))).toBe(false);
  });

  it('should not override an existing history route', () => {
    const custom = {
      path: 'it.vedph.note/:pid/history',
      component: FragmentFeatureComponent,
    };
    const result = withHistoryRoutes([routes[0], custom]);
    expect(result.length).toBe(2);
    expect(result).toContain(custom);
  });
});
