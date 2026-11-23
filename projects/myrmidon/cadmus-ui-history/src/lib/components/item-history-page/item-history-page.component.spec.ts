import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
  TemplateRef,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import {
  HistoryService,
  ItemService,
  MessagingService,
  UserLevelService,
} from '@myrmidon/cadmus-api';
import { FlagDefinition, Item } from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';
import { MESSAGE_ITEM_LIST_REPOSITORY_RESET } from '@myrmidon/cadmus-item-list';
import { ItemMetadataEditorComponent } from '@myrmidon/cadmus-item-editor';

import { HistoryEntry } from '../../models';
import { ModelHistoryViewComponent } from '../model-history-view/model-history-view.component';
import {
  getAdminFlagsMask,
  ItemHistoryPageComponent,
} from './item-history-page.component';

function makeItem(): Item {
  return {
    id: 'i1',
    title: 'Old title',
    description: 'Desc',
    facetId: 'f1',
    groupId: '',
    sortKey: 'sk',
    flags: 1,
    timeCreated: new Date(0),
    creatorId: 'hera',
    timeModified: new Date(0),
    userId: 'zeus',
  };
}

function makeFlag(id: number, isAdmin = false): FlagDefinition {
  return { id, label: `f${id}`, description: '', colorKey: 'ff0000', isAdmin };
}

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
  public readonly entry = signal<HistoryEntry<Item>>({
    info: {
      id: 'h1',
      referenceId: 'i1',
      status: 1,
      timeModified: new Date(0),
      userId: 'zeus',
      timeCreated: new Date(0),
      creatorId: 'hera',
    },
    data: makeItem(),
  });
}

describe('getAdminFlagsMask', () => {
  const flags = [makeFlag(1), makeFlag(2, true), makeFlag(8, true)];

  it('should be 0 for admins', () => {
    expect(getAdminFlagsMask(flags, 4)).toBe(0);
  });

  it('should include the admin flags for non-admins', () => {
    expect(getAdminFlagsMask(flags, 3)).toBe(2 | 8);
    expect(getAdminFlagsMask([], 3)).toBe(0);
  });
});

describe('ItemHistoryPageComponent', () => {
  let fixture: ComponentFixture<ItemHistoryPageComponent>;
  let component: ItemHistoryPageComponent;
  let router: { navigate: ReturnType<typeof vi.fn> };
  let messaging: { sendMessage: ReturnType<typeof vi.fn> };
  let userLevel: number;

  async function create(): Promise<void> {
    router = { navigate: vi.fn() };
    messaging = { sendMessage: vi.fn() };
    TestBed.configureTestingModule({
      imports: [ItemHistoryPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: 'i1' } } },
        },
        { provide: Router, useValue: router },
        { provide: HistoryService, useValue: {} },
        { provide: ItemService, useValue: {} },
        { provide: MessagingService, useValue: messaging },
        {
          provide: UserLevelService,
          useValue: { getCurrentUserLevel: () => userLevel },
        },
        {
          provide: AuthJwtService,
          useValue: { currentUser$: new BehaviorSubject(null) },
        },
        {
          provide: AppRepository,
          useValue: {
            load: vi.fn().mockResolvedValue(undefined),
            facets$: new BehaviorSubject([]),
            flags$: new BehaviorSubject([makeFlag(1), makeFlag(2, true)]),
          },
        },
      ],
    });
    TestBed.overrideComponent(ItemHistoryPageComponent, {
      remove: { imports: [ModelHistoryViewComponent] },
      add: { imports: [HistoryViewStubComponent] },
    });
    fixture = TestBed.createComponent(ItemHistoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    userLevel = 3;
  });

  it('should create the adapter for the routed item', async () => {
    await create();
    expect(component.itemId).toBe('i1');
    expect(component.adapter.itemId).toBe('i1');
  });

  it('should keep the admin flags of non-admins when restoring', async () => {
    await create();
    const restored = component.adapter.getRestoredItem(
      { ...makeItem(), flags: 1 },
      { ...makeItem(), flags: 2 },
    );
    expect(restored.flags).toBe(1 | 2);
  });

  it('should render the version in a read-only metadata editor', async () => {
    await create();
    const editor = fixture.debugElement.query(
      (d) => d.componentInstance instanceof ItemMetadataEditorComponent,
    ).componentInstance as ItemMetadataEditorComponent;
    expect(editor.readonly()).toBe(true);
    expect(editor.item()?.title).toBe('Old title');
    expect(editor.metadata().disabled()).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'cadmus-item-metadata-editor button',
      ),
    ).toBeNull();
  });

  it('should reset the items list after a restore', async () => {
    await create();
    component.onRestored();
    expect(messaging.sendMessage).toHaveBeenCalledWith(
      MESSAGE_ITEM_LIST_REPOSITORY_RESET,
    );
  });

  it('should navigate to the item editor and to the list', async () => {
    await create();
    component.edit();
    expect(router.navigate).toHaveBeenCalledWith(['/items', 'i1']);
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['/items']);
  });
});
