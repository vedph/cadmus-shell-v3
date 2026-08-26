import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, Subject } from 'rxjs';

import { ItemService, PreviewService } from '@myrmidon/cadmus-api';
import { AppRepository } from '@myrmidon/cadmus-state';
import { ThesaurusEntry } from '@myrmidon/cadmus-core';

import { TextPreviewFeatureComponent } from './text-preview-feature.component';

function makeRoute(overrides?: {
  iid?: string;
  pid?: string;
  lid?: string;
}): ActivatedRoute {
  return {
    snapshot: {
      params: {
        iid: overrides?.iid ?? 'item1',
        pid: overrides?.pid ?? 'part1',
      },
      queryParams: overrides?.lid ? { lid: overrides.lid } : {},
    },
  } as unknown as ActivatedRoute;
}

describe('TextPreviewFeatureComponent', () => {
  let component: TextPreviewFeatureComponent;
  let fixture: ComponentFixture<TextPreviewFeatureComponent>;
  let typeThesaurus$: Subject<{ entries: ThesaurusEntry[] } | undefined>;
  let appRepository: {
    typeThesaurus$: Subject<{ entries: ThesaurusEntry[] } | undefined>;
    load: ReturnType<typeof vi.fn>;
    getTypeThesaurus: ReturnType<typeof vi.fn>;
    getPartColor: ReturnType<typeof vi.fn>;
  };

  async function configure(overrides?: { iid?: string; pid?: string; lid?: string }) {
    TestBed.resetTestingModule();
    typeThesaurus$ = new Subject();
    appRepository = {
      typeThesaurus$,
      load: vi.fn().mockResolvedValue(undefined),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getPartColor: vi.fn().mockReturnValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [TextPreviewFeatureComponent],
      providers: [
        { provide: ActivatedRoute, useValue: makeRoute(overrides) },
        {
          provide: ItemService,
          useValue: {
            getItem: vi.fn().mockReturnValue(of(null)),
            getItemLayerInfo: vi.fn().mockReturnValue(of([])),
          },
        },
        {
          provide: PreviewService,
          useValue: {
            renderPart: vi.fn().mockReturnValue(of({ result: '' })),
            getTextSegments: vi.fn().mockReturnValue(of([])),
          },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TextPreviewFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build the preview source from the route params', () => {
    expect(component.source).toEqual({
      itemId: 'item1',
      partId: 'part1',
      layerId: undefined,
    });
  });

  it('should include the layer id query param when present', async () => {
    await configure({ lid: 'fr.it.vedph.comment' });
    expect(component.source?.layerId).toBe('fr.it.vedph.comment');
  });

  it('should call AppRepository.load() to ensure app data is loaded', () => {
    expect(appRepository.load).toHaveBeenCalled();
  });

  it('should populate typeEntries from a typeThesaurus$ emission', () => {
    typeThesaurus$.next({ entries: [{ id: 'note', value: 'Note' }] });
    expect(component.typeEntries()).toEqual([{ id: 'note', value: 'Note' }]);
  });

  it('should populate typeEntries from getTypeThesaurus() once load() resolves', async () => {
    // control exactly when load() resolves, so getTypeThesaurus() (read
    // only inside load()'s .then()) is guaranteed to run AFTER the mock
    // return value below is set, regardless of surrounding microtask timing.
    TestBed.resetTestingModule();
    typeThesaurus$ = new Subject();
    let resolveLoad!: () => void;
    appRepository = {
      typeThesaurus$,
      load: vi.fn().mockReturnValue(new Promise<void>((r) => (resolveLoad = r))),
      getTypeThesaurus: vi.fn().mockReturnValue(undefined),
      getPartColor: vi.fn().mockReturnValue(undefined),
    };
    await TestBed.configureTestingModule({
      imports: [TextPreviewFeatureComponent],
      providers: [
        { provide: ActivatedRoute, useValue: makeRoute() },
        {
          provide: ItemService,
          useValue: {
            getItem: vi.fn().mockReturnValue(of(null)),
            getItemLayerInfo: vi.fn().mockReturnValue(of([])),
          },
        },
        {
          provide: PreviewService,
          useValue: {
            renderPart: vi.fn().mockReturnValue(of({ result: '' })),
            getTextSegments: vi.fn().mockReturnValue(of([])),
          },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
        { provide: AppRepository, useValue: appRepository },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TextPreviewFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    appRepository.getTypeThesaurus.mockReturnValue({
      id: 'model-types',
      entries: [{ id: 'note', value: 'Note' }],
    });
    resolveLoad();
    await Promise.resolve();

    expect(component.typeEntries()).toEqual([{ id: 'note', value: 'Note' }]);
  });
});
