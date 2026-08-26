import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { DataPage } from '@myrmidon/ngx-tools';
import { GraphService } from '@myrmidon/cadmus-api';
import { ThesaurusService } from '@myrmidon/cadmus-api';
import { ThesauriSet } from '@myrmidon/cadmus-core';
import {
  NodeListRepository,
  GraphTripleListRepository,
} from '@myrmidon/cadmus-graph-ui';

import { GraphEditorFeatureComponent } from './graph-editor-feature.component';

function makeThesauriSet(overrides?: Partial<ThesauriSet>): ThesauriSet {
  return {
    'graph-node-tags': {
      id: 'graph-node-tags',
      entries: [{ id: 'person', value: 'Person' }],
    },
    ...overrides,
  };
}

function makeNodeRepository() {
  return {
    loading$: new BehaviorSubject<boolean | undefined>(undefined),
    page$: new BehaviorSubject<DataPage<any>>({
      pageNumber: 1,
      pageSize: 10,
      pageCount: 0,
      total: 0,
      items: [],
    }),
    filter$: new BehaviorSubject<any>({}),
    linkedNode$: new BehaviorSubject<any>(undefined),
    classNodes$: new BehaviorSubject<any>(undefined),
    reset: vi.fn(),
    setPage: vi.fn(),
    getLinkedNode: vi.fn(),
    getClassNodes: vi.fn().mockReturnValue([]),
    setLinkedNode: vi.fn(),
    setLinkedNodeId: vi.fn(),
    addClassNode: vi.fn(),
    setClassNodeIds: vi.fn(),
    deleteClassNode: vi.fn(),
    setFilter: vi.fn(),
    getFilter: vi.fn().mockReturnValue({}),
  };
}

function makeTripleRepository() {
  return {
    page$: new BehaviorSubject<DataPage<any>>({
      pageNumber: 1,
      pageSize: 20,
      pageCount: 0,
      total: 0,
      items: [],
    }),
    loading$: new BehaviorSubject<boolean | undefined>(undefined),
    filter$: new BehaviorSubject<any>({}),
    subjectNode$: new BehaviorSubject<any>(undefined),
    predicateNode$: new BehaviorSubject<any>(undefined),
    objectNode$: new BehaviorSubject<any>(undefined),
    setPage: vi.fn(),
    reset: vi.fn(),
    setTerm: vi.fn(),
    setTermId: vi.fn(),
    getTerm: vi.fn(),
    setFilter: vi.fn(),
  };
}

describe('GraphEditorFeatureComponent', () => {
  let component: GraphEditorFeatureComponent;
  let fixture: ComponentFixture<GraphEditorFeatureComponent>;
  let thesaurusService: { getThesauriSet: ReturnType<typeof vi.fn> };

  async function configure(
    thesauriResult:
      | { value: ThesauriSet }
      | { error: any } = { value: makeThesauriSet() },
  ) {
    TestBed.resetTestingModule();
    thesaurusService = {
      getThesauriSet:
        'error' in thesauriResult
          ? vi.fn().mockReturnValue(throwError(() => thesauriResult.error))
          : vi.fn().mockReturnValue(of(thesauriResult.value)),
    };

    await TestBed.configureTestingModule({
      imports: [GraphEditorFeatureComponent],
      providers: [
        { provide: ThesaurusService, useValue: thesaurusService },
        { provide: NodeListRepository, useValue: makeNodeRepository() },
        { provide: GraphTripleListRepository, useValue: makeTripleRepository() },
        {
          provide: GraphService,
          useValue: { getNodes: vi.fn().mockReturnValue(of({ items: [] })) },
        },
        { provide: DialogService, useValue: { confirm: vi.fn().mockReturnValue(of(true)) } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GraphEditorFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should request the node and triple tags thesauri on init', () => {
    expect(thesaurusService.getThesauriSet).toHaveBeenCalledWith([
      'graph-node-tags',
      'graph-triple-tags',
    ]);
  });

  it('should populate nodeTagEntries from the resolved graph-node-tags thesaurus', () => {
    expect(component.nodeTagEntries()).toEqual([
      { id: 'person', value: 'Person' },
    ]);
  });

  it('should leave nodeTagEntries undefined when the thesaurus is absent from the response', async () => {
    await configure({ value: makeThesauriSet({ 'graph-node-tags': undefined as any }) });
    expect(component.nodeTagEntries()).toBeUndefined();
  });

  it('should not throw and leave nodeTagEntries undefined when the request errors', async () => {
    await expect(configure({ error: new Error('boom') })).resolves.not.toThrow();
    expect(component.nodeTagEntries()).toBeUndefined();
  });
});
