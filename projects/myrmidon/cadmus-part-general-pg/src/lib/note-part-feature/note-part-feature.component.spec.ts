import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  NgxMonacoEditorComponent,
} from '@jean-merelis/ngx-monaco-editor';
import {
  NgxMonacoEditorFakeComponent,
  provideMockMonacoEditor,
} from '@jean-merelis/ngx-monaco-editor/testing';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedObject } from '@myrmidon/cadmus-core';

import { NotePartFeatureComponent } from './note-part-feature.component';
import {
  NotePart,
  NotePartComponent,
  NOTE_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
import {
  mockAppRepository,
  mockAuthJwtService,
  mockEditedItemRepository,
  mockItemService,
  mockPartEditorService,
  mockPartRoute,
  mockSnackBar,
  mockThesaurusService,
} from '../testing/testing.mocks';

function makePart(overrides?: Partial<NotePart>): NotePart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: NOTE_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    text: 'hello',
    ...overrides,
  };
}

describe('NotePartFeatureComponent', () => {
  let component: NotePartFeatureComponent;
  let fixture: ComponentFixture<NotePartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;
  let router: { navigate: ReturnType<typeof vi.fn> };

  async function configure(
    loadResult: EditedObject<NotePart> | null | undefined = undefined,
    routeOverrides?: Parameters<typeof mockPartRoute>[0],
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NotePartFeatureComponent],
      providers: [
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({ typeId: NOTE_PART_TYPEID, ...routeOverrides }),
        },
        { provide: MatSnackBar, useValue: mockSnackBar() },
        { provide: ItemService, useValue: mockItemService() },
        { provide: ThesaurusService, useValue: mockThesaurusService() },
        { provide: PartEditorService, useValue: editorService },
        { provide: AuthJwtService, useValue: mockAuthJwtService() },
        { provide: AppRepository, useValue: mockAppRepository() },
        { provide: EditedItemRepository, useValue: mockEditedItemRepository() },
        provideMockMonacoEditor({
          initializedEvent: { editor: { focus: vi.fn() } as any, monaco: {} as any },
        }),
      ],
      // swap the real Monaco editor component (loaded by the wrapped
      // NotePartComponent) for the library's fake one so tests don't need to
      // load the actual Monaco editor bundle
    })
      .overrideComponent(NotePartComponent, {
        remove: { imports: [NgxMonacoEditorComponent] },
        add: { imports: [NgxMonacoEditorFakeComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(NotePartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure({ value: makePart(), thesauri: {} });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set identity from the route', () => {
    expect(component.identity().itemId).toBe('item1');
    expect(component.identity().partId).toBe('part1');
    expect(component.identity().typeId).toBe(NOTE_PART_TYPEID);
  });

  it('should load data on init and request the note-tags thesaurus (unsuffixed, no role)', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'note-tags',
    ]);
    expect(component.data()?.value).toEqual(makePart());
  });

  it('should suffix the note-tags thesaurus id with the role id when roleIdInThesauri is set and a role is present', async () => {
    await configure({ value: makePart(), thesauri: {} }, { rid: 'sample' });
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(component.identity(), [
      'note-tags_sample',
    ]);
  });

  it('should update dirty via onDirtyChange', () => {
    expect(component.dirty()).toBe(false);
    component.onDirtyChange(true);
    expect(component.dirty()).toBe(true);
  });

  it('canDeactivate should be true unless dirty', () => {
    expect(component.canDeactivate()).toBe(true);
    component.onDirtyChange(true);
    expect(component.canDeactivate()).toBe(false);
  });

  it('save should delegate to the editor service', async () => {
    const part = makePart({ text: 'updated' });
    component.save(part);
    await Promise.resolve();
    expect(editorService.save).toHaveBeenCalledWith(part);
  });

  it('close should navigate back to the item', () => {
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
