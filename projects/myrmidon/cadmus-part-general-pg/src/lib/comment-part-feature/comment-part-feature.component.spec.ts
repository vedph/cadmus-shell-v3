import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EditPartFeatureBase, PartEditorService } from '@myrmidon/cadmus-state';
import { ItemService, ThesaurusService } from '@myrmidon/cadmus-api';
import { AuthJwtService } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '@myrmidon/cadmus-item-editor';
import { EditedObject } from '@myrmidon/cadmus-core';

import { NgxMonacoEditorComponent } from '@jean-merelis/ngx-monaco-editor';
import {
  NgxMonacoEditorFakeComponent,
  provideMockMonacoEditor,
} from '@jean-merelis/ngx-monaco-editor/testing';

import { CommentPartFeatureComponent } from './comment-part-feature.component';
import { CommentPart, COMMENT_PART_TYPEID, CommentEditorComponent } from '@myrmidon/cadmus-part-general-ui';
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

const REQ_THESAURI = [
  'comment-tags',
  'doc-reference-tags',
  'doc-reference-types',
  'comment-categories',
  'comment-keyword-languages',
  'comment-keyword-indexes',
  'comment-keyword-tags',
  'comment-id-scopes',
  'comment-id-tags',
  'assertion-tags',
  'asserted-id-features',
];

function makePart(overrides?: Partial<CommentPart>): CommentPart {
  return {
    id: 'part1',
    itemId: 'item1',
    typeId: COMMENT_PART_TYPEID,
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    text: 'hello',
    ...overrides,
  };
}

describe('CommentPartFeatureComponent', () => {
  let component: CommentPartFeatureComponent;
  let fixture: ComponentFixture<CommentPartFeatureComponent>;
  let editorService: ReturnType<typeof mockPartEditorService>;

  async function configure(
    loadResult: EditedObject<CommentPart> | null | undefined = undefined,
    routeOverrides?: { rid?: string },
  ) {
    TestBed.resetTestingModule();
    editorService = mockPartEditorService(loadResult);

    await TestBed.configureTestingModule({
      imports: [CommentPartFeatureComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate: vi.fn() } },
        {
          provide: ActivatedRoute,
          useValue: mockPartRoute({
            typeId: COMMENT_PART_TYPEID,
            ...routeOverrides,
          }),
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
    })
      // CommentEditorComponent embeds a Monaco editor for the comment text;
      // swap in the fake test double so it doesn't try to load the real one.
      .overrideComponent(CommentEditorComponent, {
        remove: { imports: [NgxMonacoEditorComponent] },
        add: { imports: [NgxMonacoEditorFakeComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CommentPartFeatureComponent);
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
    expect(component.identity().typeId).toBe(COMMENT_PART_TYPEID);
  });

  it('should load data on init and request the expected thesauri', async () => {
    await fixture.whenStable();
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      expect.arrayContaining(REQ_THESAURI),
    );
    expect(component.data()?.value).toEqual(makePart());
  });

  it('should suffix requested thesauri IDs with the role ID when present', async () => {
    await configure({ value: makePart(), thesauri: {} }, { rid: 'rl1' });
    await fixture.whenStable();

    expect(component.identity().roleId).toBe('rl1');
    expect(editorService.load).toHaveBeenCalledWith(
      component.identity(),
      REQ_THESAURI.map((id) => `${id}_rl1`),
    );
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
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };
    component.close();
    expect(router.navigate).toHaveBeenCalledWith(['items', 'item1']);
  });
});
