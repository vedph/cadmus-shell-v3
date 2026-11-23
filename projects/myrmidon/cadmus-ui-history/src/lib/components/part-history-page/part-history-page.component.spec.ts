import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of } from 'rxjs';

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
import { CADMUS_EDITOR_READONLY } from '@myrmidon/cadmus-ui';

import { HistoryEntry } from '../../models';
import { ModelHistoryViewComponent } from '../model-history-view/model-history-view.component';
import {
  isEditPartFeature,
  isLayerPartRole,
  PartHistoryPageComponent,
} from './part-history-page.component';
import {
  HISTORY_FEATURE_KEY,
  HISTORY_FEATURE_LOADER_KEY,
} from '../../history-route-keys';
import { HISTORY_READONLY_MESSAGE } from '../../services/history-part-editor.service';

function makePart(overrides?: Partial<Part>): Part {
  return {
    id: 'p1',
    itemId: 'i1',
    typeId: 'it.vedph.note',
    timeCreated: new Date(0),
    creatorId: 'hera',
    timeModified: new Date(0),
    userId: 'zeus',
    ...overrides,
  };
}

function makeEntry(id: string, text: string): HistoryEntry<Part> {
  return {
    info: {
      id,
      referenceId: 'p1',
      status: 1,
      timeModified: new Date(0),
      userId: 'zeus',
      timeCreated: new Date(0),
      creatorId: 'hera',
    },
    data: makePart({ text } as Partial<Part>),
  };
}

// a standard part editor wrapper, as found in the parts libraries
@Component({
  selector: 'test-note-feature',
  template: `<span class="feature-text">{{ text() }}</span
    ><span class="feature-readonly">{{ readonly }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TestNoteFeatureComponent extends EditPartFeatureBase {
  public readonly readonly = inject(CADMUS_EDITOR_READONLY, { optional: true });
  public readonly service = inject(PartEditorService);

  constructor() {
    super(
      inject(Router),
      inject(ActivatedRoute),
      inject(MatSnackBar),
      inject(ItemService),
      inject(ThesaurusService),
      inject(PartEditorService),
    );
  }

  public text(): string {
    return (this.data()?.value as unknown as { text?: string })?.text || '';
  }
}

// a non-standard wrapper (e.g. a layer part editor)
@Component({ selector: 'test-other-feature', template: '' })
class TestOtherFeatureComponent {}

// stub of the history view, rendering the editor template for an entry
@Component({
  selector: 'cadmus-model-history-view',
  template: `@if (editorTemplate(); as t) {
    <ng-container
      *ngTemplateOutlet="t; context: { $implicit: entry(), entry: entry() }"
    />
  }`,
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HistoryViewStubComponent {
  public readonly adapter = input<unknown>();
  public readonly editorTemplate = input<TemplateRef<unknown> | undefined>();
  public readonly canRestore = input<boolean>(false);
  public readonly label = input<string>();
  public readonly entry = signal<HistoryEntry<Part>>(makeEntry('h1', 'v1'));
}

describe('PartHistoryPageComponent', () => {
  let fixture: ComponentFixture<PartHistoryPageComponent>;
  let component: PartHistoryPageComponent;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let itemService: { getPart: ReturnType<typeof vi.fn> };
  let libraryRouteService: { buildPartEditorRoute: ReturnType<typeof vi.fn> };

  async function create(
    data: Record<string, unknown>,
    rid?: string,
  ): Promise<void> {
    router = { navigate: vi.fn() };
    itemService = { getPart: vi.fn().mockReturnValue(of(makePart())) };
    libraryRouteService = {
      buildPartEditorRoute: vi.fn().mockReturnValue({
        route: '/items/i1/general/it.vedph.note/p1',
        rid,
      }),
    };
    TestBed.configureTestingModule({
      imports: [PartHistoryPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              params: { iid: 'i1', pid: 'p1' },
              queryParams: rid ? { rid } : {},
              routeConfig: { path: 'it.vedph.note/:pid/history' },
              data,
            },
          },
        },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: ItemService, useValue: itemService },
        { provide: HistoryService, useValue: {} },
        {
          provide: ThesaurusService,
          useValue: {
            getScopedId: (id: string) => id,
            getThesauriSet: () => of({}),
          },
        },
        {
          provide: AppRepository,
          useValue: {
            load: vi.fn().mockResolvedValue(undefined),
            getTypeThesaurus: () => undefined,
          },
        },
        { provide: LibraryRouteService, useValue: libraryRouteService },
        {
          provide: UserLevelService,
          useValue: { getCurrentUserLevel: () => 3 },
        },
        {
          provide: AuthJwtService,
          useValue: { currentUser$: new BehaviorSubject(null) },
        },
      ],
    });
    TestBed.overrideComponent(PartHistoryPageComponent, {
      remove: { imports: [ModelHistoryViewComponent] },
      add: { imports: [HistoryViewStubComponent] },
    });
    fixture = TestBed.createComponent(PartHistoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function el(selector: string): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(selector);
  }

  it('isEditPartFeature should detect standard wrappers', () => {
    expect(isEditPartFeature(TestNoteFeatureComponent)).toBe(true);
    expect(isEditPartFeature(TestOtherFeatureComponent)).toBe(false);
    expect(isEditPartFeature(undefined)).toBe(false);
  });

  it('isLayerPartRole should detect layer roles', () => {
    expect(isLayerPartRole('fr.it.vedph.comment')).toBe(true);
    expect(isLayerPartRole('base-text')).toBe(false);
    expect(isLayerPartRole(undefined)).toBe(false);
  });

  it('should parse the identity from the route', async () => {
    await create({ [HISTORY_FEATURE_KEY]: TestNoteFeatureComponent }, 'r1');
    expect(component.itemId).toBe('i1');
    expect(component.partId).toBe('p1');
    expect(component.typeId).toBe('it.vedph.note');
    expect(component.roleId).toBe('r1');
    expect(component.adapter.partId).toBe('p1');
    // with no type thesaurus, the name is built from type and role IDs
    expect(component.partName()).toBe('it.vedph.note r1');
  });

  it('should render the wrapper read-only with the version data', async () => {
    await create({ [HISTORY_FEATURE_KEY]: TestNoteFeatureComponent });

    expect(component.hasEditor()).toBe(true);
    expect(el('.feature-text')?.textContent).toBe('v1');
    expect(el('.feature-readonly')?.textContent).toBe('true');
    // the current part is never loaded by the wrapper
    expect(itemService.getPart).not.toHaveBeenCalled();
    expect(el('.history-notice')).toBeNull();
  });

  it('should recreate the wrapper for another version', async () => {
    await create({ [HISTORY_FEATURE_KEY]: TestNoteFeatureComponent });
    const stub = fixture.debugElement.query(
      (d) => d.componentInstance instanceof HistoryViewStubComponent,
    ).componentInstance as HistoryViewStubComponent;

    stub.entry.set(makeEntry('h2', 'v2'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el('.feature-text')?.textContent).toBe('v2');
  });

  it('should give wrappers a service which refuses to save', async () => {
    await create({ [HISTORY_FEATURE_KEY]: TestNoteFeatureComponent });
    const injector = component.getEditorInjector(makeEntry('h1', 'v1'));

    // the same injector for the same entry
    expect(component.getEditorInjector(makeEntry('h1', 'v1'))).toBe(injector);
    expect(injector.get(CADMUS_EDITOR_READONLY)).toBe(true);
    await expect(
      injector.get(PartEditorService).save(makePart()),
    ).rejects.toEqual(expect.objectContaining({ message: HISTORY_READONLY_MESSAGE }));
  });

  it('should resolve a lazy wrapper', async () => {
    await create({
      [HISTORY_FEATURE_LOADER_KEY]: () =>
        Promise.resolve(TestNoteFeatureComponent),
    });
    expect(component.feature()).toBe(TestNoteFeatureComponent);
    expect(component.hasEditor()).toBe(true);
  });

  it('should have no editor for non-standard wrappers', async () => {
    await create({ [HISTORY_FEATURE_KEY]: TestOtherFeatureComponent });
    expect(component.hasEditor()).toBe(false);
    expect(el('.history-notice')).toBeTruthy();
    expect(el('test-other-feature')).toBeNull();
  });

  it('should have no editor for layer parts', async () => {
    await create(
      { [HISTORY_FEATURE_KEY]: TestNoteFeatureComponent },
      'fr.it.vedph.comment',
    );
    expect(component.hasEditor()).toBe(false);
    expect(el('.feature-text')).toBeNull();
  });

  it('close should navigate to the item', async () => {
    await create({ [HISTORY_FEATURE_KEY]: TestNoteFeatureComponent });
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['/items', 'i1']);
  });

  it('edit should navigate to the part editor', async () => {
    await create({ [HISTORY_FEATURE_KEY]: TestNoteFeatureComponent }, 'r1');
    component.edit();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/items/i1/general/it.vedph.note/p1'],
      { queryParams: { rid: 'r1' } },
    );
  });
});
