import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { AppRepository } from '@myrmidon/cadmus-state';
import { renderLabelFromLastColon } from '@myrmidon/cadmus-thesaurus-store';
import {
  PartIdentity,
  FragmentIdentity,
  ThesauriSet,
} from '@myrmidon/cadmus-core';

import { NgxMonacoEditorComponent } from '@jean-merelis/ngx-monaco-editor';
import {
  NgxMonacoEditorFakeComponent,
  provideMockMonacoEditor,
} from '@jean-merelis/ngx-monaco-editor/testing';

import { CommentEditorComponent } from './comment-editor.component';
import { CommentPart, COMMENT_PART_TYPEID } from '../comment-part';
import { CommentFragment } from '../comment-fragment';
import { IndexKeyword } from '../index-keywords-part';

describe('CommentEditorComponent', () => {
  let component: CommentEditorComponent;
  let fixture: ComponentFixture<CommentEditorComponent>;
  let currentUser$: BehaviorSubject<User | null>;
  let getSettingFor: ReturnType<typeof vi.fn>;

  const partIdentity: PartIdentity = {
    itemId: 'item1',
    typeId: COMMENT_PART_TYPEID,
    partId: null,
    roleId: null,
  };

  const fragmentIdentity: FragmentIdentity = {
    itemId: 'item1',
    typeId: 'it.vedph.token-text',
    partId: 'part1',
    roleId: null,
    frTypeId: 'fr.it.vedph.comment',
    frRoleId: null,
    loc: '1.1',
  };

  const ALL_THESAURI: ThesauriSet = {
    'comment-tags': { id: 'comment-tags', entries: [{ id: 'ct1', value: 'CT1' }] },
    'doc-reference-tags': {
      id: 'doc-reference-tags',
      entries: [{ id: 'rt1', value: 'RT1' }],
    },
    'doc-reference-types': {
      id: 'doc-reference-types',
      entries: [{ id: 'rty1', value: 'RTY1' }],
    },
    'comment-categories': {
      id: 'comment-categories',
      entries: [
        { id: 'catA', value: 'Alpha' },
        { id: 'catB', value: 'Beta' },
      ],
    },
    'comment-keyword-languages': {
      id: 'comment-keyword-languages',
      entries: [{ id: 'eng', value: 'English' }],
    },
    'comment-keyword-indexes': {
      id: 'comment-keyword-indexes',
      entries: [{ id: 'idx1', value: 'Idx1' }],
    },
    'comment-keyword-tags': {
      id: 'comment-keyword-tags',
      entries: [{ id: 'kt1', value: 'KT1' }],
    },
    'comment-id-scopes': {
      id: 'comment-id-scopes',
      entries: [{ id: 'sc1', value: 'SC1' }],
    },
    'comment-id-tags': { id: 'comment-id-tags', entries: [{ id: 'it1', value: 'IT1' }] },
    'assertion-tags': { id: 'assertion-tags', entries: [{ id: 'at1', value: 'AT1' }] },
    'asserted-id-features': {
      id: 'asserted-id-features',
      entries: [{ id: 'af1', value: 'AF1' }],
    },
  };

  function setup(settingValue: any = undefined) {
    TestBed.resetTestingModule();
    currentUser$ = new BehaviorSubject<User | null>(null);
    getSettingFor = vi.fn().mockResolvedValue(settingValue);

    TestBed.configureTestingModule({
      imports: [CommentEditorComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        {
          provide: AuthJwtService,
          useValue: { currentUser$, currentUserValue: null },
        },
        {
          provide: AppRepository,
          useValue: {
            getTypeThesaurus: vi.fn(),
            getSettingFor,
          },
        },
        provideMockMonacoEditor({
          initializedEvent: { editor: { focus: vi.fn() } as any, monaco: {} as any },
        }),
        {
          // avoid depending on DomSanitizer's private SafeHtml wrapper shape:
          // return a plainly-inspectable marker string instead
          provide: DomSanitizer,
          useValue: { bypassSecurityTrustHtml: (html: string) => `SAFE(${html})` },
        },
      ],
    })
      .overrideComponent(CommentEditorComponent, {
        remove: { imports: [NgxMonacoEditorComponent] },
        add: { imports: [NgxMonacoEditorFakeComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(CommentEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    setup(undefined);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds a form with the expected controls', () => {
    expect(component.form.get('tag')).toBeTruthy();
    expect(component.form.get('text')).toBeTruthy();
    expect(component.form.get('references')).toBeTruthy();
    expect(component.form.get('ids')).toBeTruthy();
    expect(component.form.get('categories')).toBeTruthy();
    expect(component.form.get('keywords')).toBeTruthy();
    expect(component.text.hasError('required')).toBe(true);
  });

  it('loads lookupProviderOptions via initSettings when identity is set', async () => {
    setup({ lookupProviderOptions: { baseFilter: { limit: 5 } } });
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getSettingFor).toHaveBeenCalledWith(COMMENT_PART_TYPEID, undefined);
    expect(component.lookupProviderOptions()).toEqual({
      baseFilter: { limit: 5 },
    });
  });

  it('populates all thesauri signals when thesauri are present', () => {
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.componentRef.setInput('data', { value: null, thesauri: ALL_THESAURI });
    fixture.detectChanges();

    expect(component.comTagEntries()).toEqual(ALL_THESAURI['comment-tags'].entries);
    expect(component.refTagEntries()).toEqual(
      ALL_THESAURI['doc-reference-tags'].entries,
    );
    expect(component.refTypeEntries()).toEqual(
      ALL_THESAURI['doc-reference-types'].entries,
    );
    expect(component.catEntries()).toEqual(ALL_THESAURI['comment-categories'].entries);
    expect(component.langEntries()).toEqual(
      ALL_THESAURI['comment-keyword-languages'].entries,
    );
    expect(component.idxEntries()).toEqual(
      ALL_THESAURI['comment-keyword-indexes'].entries,
    );
    expect(component.keyTagEntries()).toEqual(
      ALL_THESAURI['comment-keyword-tags'].entries,
    );
    expect(component.idScopeEntries()).toEqual(
      ALL_THESAURI['comment-id-scopes'].entries,
    );
    expect(component.idTagEntries()).toEqual(ALL_THESAURI['comment-id-tags'].entries);
    expect(component.assTagEntries()).toEqual(ALL_THESAURI['assertion-tags'].entries);
    expect(component.featureEntries()).toEqual(
      ALL_THESAURI['asserted-id-features'].entries,
    );
  });

  it('clears all thesauri signals when thesauri are absent', () => {
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    expect(component.comTagEntries()).toBeUndefined();
    expect(component.refTagEntries()).toBeUndefined();
    expect(component.refTypeEntries()).toBeUndefined();
    expect(component.catEntries()).toBeUndefined();
    expect(component.langEntries()).toBeUndefined();
    expect(component.idxEntries()).toBeUndefined();
    expect(component.keyTagEntries()).toBeUndefined();
    expect(component.idScopeEntries()).toBeUndefined();
    expect(component.idTagEntries()).toBeUndefined();
    expect(component.assTagEntries()).toBeUndefined();
    expect(component.featureEntries()).toBeUndefined();
  });

  it('resets the form when data has no value', () => {
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    expect(component.text.value).toBeNull();
    expect(component.keywords.length).toBe(0);
  });

  it('updates the form from a CommentPart, mapping and sorting categories', () => {
    const keywords: IndexKeyword[] = [
      { indexId: 'idx1', tag: 'kt1', language: 'eng', value: 'v1', note: 'n1' },
    ];
    const part: CommentPart = {
      id: 'p1',
      itemId: 'item1',
      typeId: COMMENT_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'c',
      timeModified: new Date(),
      userId: 'u',
      tag: 'ct1',
      text: 'hello',
      references: [{ citation: 'cit1' }],
      links: [{ target: { gid: 'g1', label: 'L1' } }],
      categories: ['catB', 'catA', 'catX'],
      keywords,
    };
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.componentRef.setInput('data', { value: part, thesauri: ALL_THESAURI });
    fixture.detectChanges();

    expect(component.tag.value).toBe('ct1');
    expect(component.text.value).toBe('hello');
    expect(component.references.value).toEqual(part.references);
    expect(component.links.value).toEqual(part.links);
    expect(component.keywords.length).toBe(1);
    expect(component.keywords.at(0).value).toEqual({
      indexId: 'idx1',
      tag: 'kt1',
      language: 'eng',
      value: 'v1',
      note: 'n1',
    });
    // categories: catB -> Beta, catA -> Alpha, catX -> not found (fallback),
    // sorted by display value: Alpha, Beta, catX
    expect(component.categories.value).toEqual([
      { id: 'catA', value: 'Alpha' },
      { id: 'catB', value: 'Beta' },
      { id: 'catX', value: 'catX' },
    ]);
    expect(component.form.pristine).toBe(true);
  });

  it('sets categories to an empty array when the part has none', () => {
    const part: CommentPart = {
      id: 'p1',
      itemId: 'item1',
      typeId: COMMENT_PART_TYPEID,
      timeCreated: new Date(),
      creatorId: 'c',
      timeModified: new Date(),
      userId: 'u',
      text: 'hello',
    };
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.componentRef.setInput('data', { value: part, thesauri: {} });
    fixture.detectChanges();

    expect(component.categories.value).toEqual([]);
  });

  it('getValue builds a CommentPart when the edited value has no location', () => {
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    component.tag.setValue('  ct1  ');
    component.text.setValue('  hello  ');

    const value = (component as any).getValue() as CommentPart;
    expect(value.typeId).toBe(COMMENT_PART_TYPEID);
    expect(value.tag).toBe('ct1');
    expect(value.text).toBe('hello');
    expect((value as any).location).toBeUndefined();
  });

  it('getValue builds a CommentFragment when the edited value has a location', () => {
    const fragment: CommentFragment = { location: '1.1', text: 'old' };
    fixture.componentRef.setInput('identity', fragmentIdentity);
    fixture.componentRef.setInput('data', { value: fragment, thesauri: {} });
    fixture.detectChanges();

    component.text.setValue('new text');

    const value = (component as any).getValue() as CommentFragment;
    expect(value.location).toBe('1.1');
    expect(value.text).toBe('new text');
  });

  it('updateComment sets references/links/categories/keywords to undefined when empty', () => {
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    component.text.setValue('hello');
    // leave references/links/categories/keywords empty

    const value = (component as any).getValue() as CommentPart;
    expect(value.references).toBeUndefined();
    expect(value.links).toBeUndefined();
    expect(value.categories).toBeUndefined();
    expect(value.keywords).toBeUndefined();
  });

  it('updateComment maps categories to their ids', () => {
    fixture.componentRef.setInput('identity', partIdentity);
    fixture.componentRef.setInput('data', { value: null, thesauri: {} });
    fixture.detectChanges();

    component.text.setValue('hello');
    component.categories.setValue([
      { id: 'catA', value: 'Alpha' },
      { id: 'catB', value: 'Beta' },
    ]);

    const value = (component as any).getValue() as CommentPart;
    expect(value.categories).toEqual(['catA', 'catB']);
  });

  it('onReferencesChange updates references and marks form dirty', () => {
    component.onReferencesChange([{ citation: 'c1' }]);
    expect(component.references.value).toEqual([{ citation: 'c1' }]);
    expect(component.references.dirty).toBe(true);
    expect(component.form.dirty).toBe(true);
  });

  it('onIdsChange updates links and marks form dirty', () => {
    const link = { target: { gid: 'g1', label: 'L1' } };
    component.onIdsChange([link]);
    expect(component.links.value).toEqual([link]);
    expect(component.links.dirty).toBe(true);
    expect(component.form.dirty).toBe(true);
  });

  describe('categories management', () => {
    it('adds a new category and sorts by value', () => {
      component.onCategoryChange({ id: 'catB', value: 'Beta' });
      component.onCategoryChange({ id: 'catA', value: 'Alpha' });

      expect(component.categories.value).toEqual([
        { id: 'catA', value: 'Alpha' },
        { id: 'catB', value: 'Beta' },
      ]);
    });

    it('ignores a category already present (by id)', () => {
      component.onCategoryChange({ id: 'catA', value: 'Alpha' });
      component.onCategoryChange({ id: 'catA', value: 'Alpha' });

      expect(component.categories.value).toEqual([{ id: 'catA', value: 'Alpha' }]);
    });

    it('removeCategory removes the entry at the given index', () => {
      component.categories.setValue([
        { id: 'catA', value: 'Alpha' },
        { id: 'catB', value: 'Beta' },
      ]);

      component.removeCategory(0);

      expect(component.categories.value).toEqual([{ id: 'catB', value: 'Beta' }]);
    });
  });

  it('renderLabel delegates to renderLabelFromLastColon', () => {
    const label = 'root:child:leaf';
    expect(component.renderLabel(label)).toBe(renderLabelFromLastColon(label));
  });

  describe('keywords management', () => {
    it('addKeyword pushes a new empty keyword group', () => {
      component.addKeyword();
      expect(component.keywords.length).toBe(1);
      expect(component.keywords.dirty).toBe(true);
    });

    it('addKeyword pushes a keyword group prefilled from the given keyword', () => {
      const kw: IndexKeyword = { language: 'eng', value: 'v1' };
      component.addKeyword(kw);
      expect(component.keywords.at(0).value.language).toBe('eng');
      expect(component.keywords.at(0).value.value).toBe('v1');
    });

    it('removeKeyword removes the group at the given index', () => {
      component.addKeyword({ language: 'eng', value: 'a' });
      component.addKeyword({ language: 'eng', value: 'b' });

      component.removeKeyword(0);

      expect(component.keywords.length).toBe(1);
      expect(component.keywords.at(0).value.value).toBe('b');
    });

    it('moveKeywordUp does nothing for index 0', () => {
      component.addKeyword({ language: 'eng', value: 'a' });
      component.addKeyword({ language: 'eng', value: 'b' });

      component.moveKeywordUp(0);

      expect(component.keywords.at(0).value.value).toBe('a');
      expect(component.keywords.at(1).value.value).toBe('b');
    });

    it('moveKeywordUp swaps with the previous group', () => {
      component.addKeyword({ language: 'eng', value: 'a' });
      component.addKeyword({ language: 'eng', value: 'b' });

      component.moveKeywordUp(1);

      expect(component.keywords.at(0).value.value).toBe('b');
      expect(component.keywords.at(1).value.value).toBe('a');
    });

    it('moveKeywordDown does nothing for the last index', () => {
      component.addKeyword({ language: 'eng', value: 'a' });
      component.addKeyword({ language: 'eng', value: 'b' });

      component.moveKeywordDown(1);

      expect(component.keywords.at(0).value.value).toBe('a');
      expect(component.keywords.at(1).value.value).toBe('b');
    });

    it('moveKeywordDown swaps with the next group', () => {
      component.addKeyword({ language: 'eng', value: 'a' });
      component.addKeyword({ language: 'eng', value: 'b' });

      component.moveKeywordDown(0);

      expect(component.keywords.at(0).value.value).toBe('b');
      expect(component.keywords.at(1).value.value).toBe('a');
    });

    it('getKeywords (via getValue) trims values and returns undefined when empty', () => {
      fixture.componentRef.setInput('identity', partIdentity);
      fixture.componentRef.setInput('data', { value: null, thesauri: {} });
      fixture.detectChanges();
      component.text.setValue('hello');

      let value = (component as any).getValue() as CommentPart;
      expect(value.keywords).toBeUndefined();

      component.addKeyword({
        indexId: '  idx1  ',
        tag: '  kt1  ',
        language: '  eng  ',
        value: '  v1  ',
        note: '  n1  ',
      });

      value = (component as any).getValue() as CommentPart;
      expect(value.keywords).toEqual([
        { indexId: 'idx1', tag: 'kt1', language: 'eng', value: 'v1', note: 'n1' },
      ]);
    });
  });

  it('onEditorInit stores the editor instance without throwing', () => {
    const fakeEditor = {
      focus: vi.fn(),
      addCommand: vi.fn(),
      getSelection: vi.fn(),
      getModel: vi.fn(),
      executeEdits: vi.fn(),
    };
    expect(() =>
      component.onEditorInit({ editor: fakeEditor } as any),
    ).not.toThrow();
    expect(fakeEditor.focus).toHaveBeenCalled();
  });

  it('renders a markdown preview of the text after debounce', async () => {
    component.text.setValue('# Hello');
    // wait out the 50ms debounce with real timers: rxjs's asyncScheduler
    // does not reliably observe fake timers installed after the
    // debounced subscription was already set up in ngOnInit
    await new Promise((resolve) => setTimeout(resolve, 60));
    const html = component.previewHtml() as unknown as string;
    expect(html).toContain('SAFE(');
    expect(html).toContain('Hello');
  });
});
