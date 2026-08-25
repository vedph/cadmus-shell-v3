import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { CurrentLayerPartBarComponent } from './current-layer-part-bar.component';
import { FacetService } from '@myrmidon/cadmus-api';
import { AppRepository, EditedLayerRepository } from '@myrmidon/cadmus-state';
import { EditedItemRepository } from '../state/edited-item.repository';
import { FacetDefinition, TextLayerPart, Thesaurus } from '@myrmidon/cadmus-core';

function makeLayerPart(overrides?: Partial<TextLayerPart>): TextLayerPart {
  return {
    id: 'p1',
    itemId: 'item1',
    typeId: 'it.vedph.token-text-layer',
    roleId: 'fr.it.vedph.comment',
    timeCreated: new Date(0),
    creatorId: 'u',
    timeModified: new Date(0),
    userId: 'u',
    fragments: [],
    ...overrides,
  };
}

describe('CurrentLayerPartBarComponent', () => {
  let component: CurrentLayerPartBarComponent;
  let fixture: ComponentFixture<CurrentLayerPartBarComponent>;
  let part$: BehaviorSubject<TextLayerPart | undefined>;
  let facet$: BehaviorSubject<FacetDefinition | undefined>;
  let appRepository: { getTypeThesaurus: ReturnType<typeof vi.fn> };
  let editedItemRepository: { facet$: BehaviorSubject<FacetDefinition | undefined>; getFacet: ReturnType<typeof vi.fn> };
  let facetService: { getPartColor: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    part$ = new BehaviorSubject<TextLayerPart | undefined>(undefined);
    facet$ = new BehaviorSubject<FacetDefinition | undefined>(undefined);
    appRepository = { getTypeThesaurus: vi.fn().mockReturnValue(undefined) };
    editedItemRepository = {
      facet$,
      getFacet: vi.fn().mockReturnValue(undefined),
    };
    facetService = { getPartColor: vi.fn().mockReturnValue('#00ff00') };

    await TestBed.configureTestingModule({
      imports: [CurrentLayerPartBarComponent],
      providers: [
        { provide: AppRepository, useValue: appRepository },
        { provide: EditedItemRepository, useValue: editedItemRepository },
        { provide: EditedLayerRepository, useValue: { part$ } },
        { provide: FacetService, useValue: facetService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CurrentLayerPartBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with undefined signals when there is no part', () => {
    expect(component).toBeTruthy();
    expect(component.typeId()).toBeUndefined();
    expect(component.roleId()).toBeUndefined();
    expect(component.color()).toBeUndefined();
  });

  it('should fall back to the raw typeId/roleId when there is no thesaurus', () => {
    part$.next(makeLayerPart());
    expect(component.typeId()).toBe('it.vedph.token-text-layer');
    expect(component.roleId()).toBe('fr.it.vedph.comment');
  });

  it('should resolve typeId from the types thesaurus, stripping any :suffix', () => {
    const thesaurus: Thesaurus = {
      id: 'model-types@en',
      entries: [{ id: 'it.vedph.token-text-layer', value: 'Token text layer' }],
    };
    appRepository.getTypeThesaurus.mockReturnValue(thesaurus);
    part$.next(makeLayerPart({ typeId: 'it.vedph.token-text-layer:extra' }));
    expect(component.typeId()).toBe('Token text layer');
  });

  it('should resolve a fragment roleId via the thesaurus, but leave non-fr roles as-is', () => {
    const thesaurus: Thesaurus = {
      id: 'model-types@en',
      entries: [{ id: 'fr.it.vedph.comment', value: 'Comment' }],
    };
    appRepository.getTypeThesaurus.mockReturnValue(thesaurus);
    part$.next(makeLayerPart({ roleId: 'fr.it.vedph.comment' }));
    expect(component.roleId()).toBe('Comment');

    part$.next(makeLayerPart({ roleId: 'plain-role' }));
    expect(component.roleId()).toBe('plain-role');
  });

  it('should compute the color from the facet service using the current facet', () => {
    const facet: FacetDefinition = {
      id: 'facet1',
      label: 'Facet',
      colorKey: 'ff0000',
      description: '',
      partDefinitions: [],
    };
    editedItemRepository.getFacet.mockReturnValue(facet);
    part$.next(makeLayerPart());

    expect(component.color()).toBe('#00ff00');
    expect(facetService.getPartColor).toHaveBeenCalledWith(
      'it.vedph.token-text-layer',
      'fr.it.vedph.comment',
      facet
    );
  });
});
