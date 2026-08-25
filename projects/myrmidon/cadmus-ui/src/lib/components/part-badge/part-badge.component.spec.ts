import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  PartBadgeComponent,
  PartBadgeType,
  getPartIdName,
} from './part-badge.component';
import { FacetService } from '@myrmidon/cadmus-api';
import { FacetDefinition, PartTypeIds, Thesaurus } from '@myrmidon/cadmus-core';

describe('getPartIdName', () => {
  it('should return the raw typeId when there is no thesaurus and noFallback is false', () => {
    expect(getPartIdName('it.vedph.note')).toBe('it.vedph.note');
  });

  it('should return "typeId roleId" when there is no thesaurus, a role is given, and noFallback is false', () => {
    expect(getPartIdName('it.vedph.note', 'scholarly')).toBe(
      'it.vedph.note scholarly'
    );
  });

  it('should return undefined when there is no thesaurus and noFallback is true', () => {
    expect(getPartIdName('it.vedph.note', undefined, undefined, true)).toBeUndefined();
  });

  it('should prefer the "typeId:roleId" entry when present', () => {
    const thesaurus: Thesaurus = {
      id: 'model-types@en',
      entries: [
        { id: 'it.vedph.note', value: 'Note' },
        { id: 'it.vedph.note:scholarly', value: 'Scholarly Note' },
      ],
    };
    expect(getPartIdName('it.vedph.note', 'scholarly', thesaurus)).toBe(
      'Scholarly Note'
    );
  });

  it('should fall back to the plain typeId entry when no role-suffixed entry matches', () => {
    const thesaurus: Thesaurus = {
      id: 'model-types@en',
      entries: [{ id: 'it.vedph.note', value: 'Note' }],
    };
    expect(getPartIdName('it.vedph.note', 'scholarly', thesaurus)).toBe(
      'Note'
    );
  });

  it('should return the raw typeId when the thesaurus has no matching entry', () => {
    const thesaurus: Thesaurus = { id: 'model-types@en', entries: [] };
    expect(getPartIdName('it.vedph.note', undefined, thesaurus)).toBe(
      'it.vedph.note'
    );
  });
});

function makeFacet(): FacetDefinition {
  return {
    id: 'facet1',
    label: 'Facet',
    colorKey: 'ff0000',
    description: '',
    partDefinitions: [
      { typeId: 'it.vedph.note', name: 'Note', colorKey: '00ff00' },
      {
        typeId: 'it.vedph.token-text:scholarly',
        name: 'Scholarly text',
        colorKey: '0000ff',
      },
    ],
  };
}

describe('PartBadgeComponent', () => {
  let component: PartBadgeComponent;
  let fixture: ComponentFixture<PartBadgeComponent>;
  let facetService: { getPartColor: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    facetService = {
      getPartColor: vi.fn().mockReturnValue('#00ff00'),
    };
    await TestBed.configureTestingModule({
      imports: [PartBadgeComponent],
      providers: [{ provide: FacetService, useValue: facetService }],
    }).compileComponents();

    fixture = TestBed.createComponent(PartBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with a default badgeType of partAndRole', () => {
    expect(component).toBeTruthy();
    expect(component.badgeType()).toBe(PartBadgeType.partAndRole);
  });

  it('should return undefined names and transparent color when there are no partTypeIds', () => {
    expect(component.typeName()).toBeUndefined();
    expect(component.roleName()).toBeUndefined();
    expect(component.color()).toBe('transparent');
  });

  it('should compute typeName and roleName from partTypeIds and the type thesaurus', () => {
    const thesaurus: Thesaurus = {
      id: 'model-types@en',
      entries: [{ id: 'it.vedph.note', value: 'Note' }],
    };
    fixture.componentRef.setInput('partTypeIds', {
      typeId: 'it.vedph.note',
      roleId: undefined,
    } as PartTypeIds);
    fixture.componentRef.setInput('typeThesaurus', thesaurus);
    fixture.detectChanges();

    expect(component.typeName()).toBe('Note');
  });

  it('should resolve roleName by stripping the fragment-role suffix as a fallback', () => {
    const thesaurus: Thesaurus = {
      id: 'model-types@en',
      entries: [{ id: 'fr.it.vedph.comment', value: 'Comment' }],
    };
    fixture.componentRef.setInput('partTypeIds', {
      typeId: 'x',
      roleId: 'fr.it.vedph.comment:scholarly',
    } as PartTypeIds);
    fixture.componentRef.setInput('typeThesaurus', thesaurus);
    fixture.detectChanges();

    expect(component.roleName()).toBe('Comment');
  });

  it('should return the raw roleId as roleName when there is no thesaurus', () => {
    fixture.componentRef.setInput('partTypeIds', {
      typeId: 'x',
      roleId: 'scholarly',
    } as PartTypeIds);
    fixture.detectChanges();
    expect(component.roleName()).toBe('scholarly');
  });

  it('should return transparent color when there is no facet definition', () => {
    fixture.componentRef.setInput('partTypeIds', {
      typeId: 'it.vedph.note',
    } as PartTypeIds);
    fixture.detectChanges();
    expect(component.color()).toBe('transparent');
    expect(facetService.getPartColor).not.toHaveBeenCalled();
  });

  it('should delegate color resolution to FacetService when a facet is given', () => {
    fixture.componentRef.setInput('partTypeIds', {
      typeId: 'it.vedph.note',
      roleId: 'scholarly',
    } as PartTypeIds);
    fixture.componentRef.setInput('facetDefinition', makeFacet());
    fixture.detectChanges();

    expect(component.color()).toBe('#00ff00');
    expect(facetService.getPartColor).toHaveBeenCalledWith(
      'it.vedph.note',
      'scholarly',
      makeFacet()
    );
  });

  describe('partDefinition', () => {
    it('should return undefined when there are no partTypeIds or no facet', () => {
      expect(component.partDefinition()).toBeUndefined();
    });

    it('should match the exact "typeId:roleId" definition first', () => {
      fixture.componentRef.setInput('partTypeIds', {
        typeId: 'it.vedph.token-text',
        roleId: 'scholarly',
      } as PartTypeIds);
      fixture.componentRef.setInput('facetDefinition', makeFacet());
      fixture.detectChanges();

      expect(component.partDefinition()?.name).toBe('Scholarly text');
    });

    it('should fall back to a plain typeId match', () => {
      fixture.componentRef.setInput('partTypeIds', {
        typeId: 'it.vedph.note',
        roleId: 'unmatched',
      } as PartTypeIds);
      fixture.componentRef.setInput('facetDefinition', makeFacet());
      fixture.detectChanges();

      expect(component.partDefinition()?.name).toBe('Note');
    });
  });
});
