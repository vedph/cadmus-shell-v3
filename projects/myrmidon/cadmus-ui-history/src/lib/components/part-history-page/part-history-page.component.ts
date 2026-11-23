import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Injector,
  OnInit,
  signal,
  Type,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardAvatar,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  HistoryService,
  ItemService,
  ThesaurusService,
  UserLevelService,
} from '@myrmidon/cadmus-api';
import { LibraryRouteService, Part } from '@myrmidon/cadmus-core';
import {
  AppRepository,
  EditPartFeatureBase,
  PartEditorService,
} from '@myrmidon/cadmus-state';
import { CADMUS_EDITOR_READONLY, getPartIdName } from '@myrmidon/cadmus-ui';

import { HistoryEntry } from '../../models';
import { PartHistoryAdapter } from '../../services/history-adapters';
import { createHistoryPartEditorService } from '../../services/history-part-editor.service';
import { ModelHistoryViewComponent } from '../model-history-view/model-history-view.component';
import {
  HISTORY_FEATURE_KEY,
  HISTORY_FEATURE_LOADER_KEY,
} from '../../history-route-keys';

/**
 * True if the specified component type is a standard part editor wrapper,
 * i.e. derived from `EditPartFeatureBase`, which loads its data with
 * `PartEditorService`. Only these wrappers can be reused in history.
 */
export function isEditPartFeature(type: Type<unknown> | undefined): boolean {
  return !!type && type.prototype instanceof EditPartFeatureBase;
}

/**
 * True if the specified part role ID is that of a layer part.
 */
export function isLayerPartRole(roleId?: string | null): boolean {
  return !!roleId && roleId.startsWith('fr.');
}

/**
 * Page showing the edit history of a part. Its route is the part editor
 * route with a final `/history`, as added by `withHistoryRoutes`. The
 * route data provide the part editor wrapper (feature) component, which
 * is reused (unchanged) in read-only mode to display each version:
 * its `PartEditorService` is replaced by one loading the version from
 * history and refusing to save, and the `CADMUS_EDITOR_READONLY` token
 * forces its editor into read-only mode.
 *
 * Layer parts, and parts whose wrapper is not derived from
 * `EditPartFeatureBase`, have no editor view: their versions can be
 * inspected in the code view only.
 */
@Component({
  selector: 'cadmus-part-history-page',
  templateUrl: './part-history-page.component.html',
  styleUrls: ['./part-history-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgComponentOutlet,
    MatButton,
    MatCard,
    MatCardAvatar,
    MatCardContent,
    MatCardHeader,
    MatCardSubtitle,
    MatCardTitle,
    MatIcon,
    ModelHistoryViewComponent,
  ],
})
export class PartHistoryPageComponent implements OnInit {
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _injector = inject(Injector);
  private readonly _thesaurusService = inject(ThesaurusService);
  private readonly _appRepository = inject(AppRepository);
  private readonly _libraryRouteService = inject(LibraryRouteService);
  private readonly _userLevelService = inject(UserLevelService);
  private readonly _injectors = new Map<string, Injector>();

  public readonly itemId: string;
  public readonly partId: string;
  public readonly typeId: string;
  public readonly roleId?: string;

  /**
   * The history data adapter.
   */
  public readonly adapter: PartHistoryAdapter;

  /**
   * The part editor wrapper (feature) component.
   */
  public readonly feature = signal<Type<unknown> | undefined>(undefined);

  /**
   * True when the part versions can be displayed in the editor.
   */
  public readonly hasEditor = computed<boolean>(
    () => !isLayerPartRole(this.roleId) && isEditPartFeature(this.feature()),
  );

  /**
   * The human-friendly name of the part's type.
   */
  public readonly partName = signal<string>('');

  /**
   * The current user level.
   */
  public readonly userLevel: () => number;

  constructor() {
    const snapshot = this._route.snapshot;
    this.itemId = snapshot.params['iid'];
    this.partId = snapshot.params['pid'];
    const path = snapshot.routeConfig?.path || '';
    this.typeId = path.substring(0, path.indexOf('/'));
    const rid = snapshot.queryParams['rid'];
    this.roleId = rid && rid !== 'default' ? rid : undefined;

    this.adapter = new PartHistoryAdapter(
      this.partId,
      inject(HistoryService),
      inject(ItemService),
    );

    const user = toSignal(inject(AuthJwtService).currentUser$, {
      initialValue: null,
    });
    this.userLevel = computed(() => {
      user();
      return this._userLevelService.getCurrentUserLevel();
    });
  }

  public async ngOnInit(): Promise<void> {
    // app data for the part type name
    try {
      await this._appRepository.load();
    } catch (error) {
      console.error(error);
    }
    this.partName.set(
      getPartIdName(
        this.typeId,
        this.roleId,
        this._appRepository.getTypeThesaurus(),
      ) || this.typeId,
    );

    // resolve the feature component
    const data = this._route.snapshot.data;
    if (data[HISTORY_FEATURE_KEY]) {
      this.feature.set(data[HISTORY_FEATURE_KEY] as Type<unknown>);
    } else if (data[HISTORY_FEATURE_LOADER_KEY]) {
      try {
        const loaded = await (
          data[HISTORY_FEATURE_LOADER_KEY] as () => Promise<
            Type<unknown> | { default: Type<unknown> }
          >
        )();
        this.feature.set(
          'default' in (loaded as object)
            ? (loaded as { default: Type<unknown> }).default
            : (loaded as Type<unknown>),
        );
      } catch (error) {
        console.error('Unable to load the part editor', error);
      }
    }
  }

  /**
   * Get the injector for the editor of the specified history entry. This
   * replaces the part editor service with one loading the entry's data
   * and refusing to save, and forces the editor into read-only mode.
   *
   * @param entry The history entry.
   */
  public getEditorInjector(entry: HistoryEntry<Part>): Injector {
    let injector = this._injectors.get(entry.info.id);
    if (!injector) {
      injector = Injector.create({
        providers: [
          {
            provide: PartEditorService,
            useValue: createHistoryPartEditorService(
              entry.data,
              this._thesaurusService,
            ),
          },
          { provide: CADMUS_EDITOR_READONLY, useValue: true },
        ],
        parent: this._injector,
      });
      this._injectors.set(entry.info.id, injector);
    }
    return injector;
  }

  /**
   * Close the history and go back to the part's item.
   */
  public close(): void {
    this._router.navigate(['/items', this.itemId]);
  }

  /**
   * Open the part's editor.
   */
  public edit(): void {
    const route = this._libraryRouteService.buildPartEditorRoute(
      this.itemId,
      this.partId,
      this.typeId,
      this.roleId,
    );
    this._router.navigate(
      [route.route],
      route.rid ? { queryParams: { rid: route.rid } } : {},
    );
  }
}
