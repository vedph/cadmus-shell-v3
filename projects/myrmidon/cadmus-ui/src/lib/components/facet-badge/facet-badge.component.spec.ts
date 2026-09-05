import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorService } from '@myrmidon/ngx-tools';
import { FacetDefinition } from '@myrmidon/cadmus-core';

import { FacetBadgeComponent, FacetBadgeData } from './facet-badge.component';

function makeFacet(overrides?: Partial<FacetDefinition>): FacetDefinition {
  return {
    id: 'facet1',
    label: 'Facet One',
    colorKey: 'ff0000',
    description: '',
    partDefinitions: [
      { typeId: 'it.vedph.note', name: 'Note', isRequired: true },
      { typeId: 'it.vedph.token-text', name: 'Text' },
    ],
    ...overrides,
  };
}

describe('FacetBadgeComponent', () => {
  let component: FacetBadgeComponent;
  let fixture: ComponentFixture<FacetBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacetBadgeComponent],
      providers: [ColorService],
    }).compileComponents();

    fixture = TestBed.createComponent(FacetBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should use facetId as label and transparent color when no definitions match', () => {
    fixture.componentRef.setInput('data', {
      definitions: [],
      facetId: 'unknown',
    } as FacetBadgeData);
    fixture.detectChanges();
    expect(component.label()).toBe('unknown');
    expect(component.color()).toBe('transparent');
  });

  it('should resolve label and color from the matching facet', () => {
    fixture.componentRef.setInput('data', {
      definitions: [makeFacet()],
      facetId: 'facet1',
    } as FacetBadgeData);
    fixture.detectChanges();
    expect(component.label()).toBe('Facet One');
    expect(component.color()).toBe('#ff0000');
  });

  it('should compute a contrasting text color', () => {
    fixture.componentRef.setInput('data', {
      definitions: [makeFacet({ colorKey: '000000' })],
      facetId: 'facet1',
    } as FacetBadgeData);
    fixture.detectChanges();
    expect(component.contrastColor()).toBe('white');
  });

  it('should build a tooltip listing part names, marking required ones', () => {
    fixture.componentRef.setInput('data', {
      definitions: [makeFacet()],
      facetId: 'facet1',
    } as FacetBadgeData);
    fixture.detectChanges();
    expect(component.tip()).toBe('Note*, Text');
  });

  it('should return undefined tip when there are no definitions at all', () => {
    fixture.componentRef.setInput('data', {
      definitions: [],
    } as unknown as FacetBadgeData);
    fixture.detectChanges();
    expect(component.tip()).toBeUndefined();
  });

  it('should fall back the tip to facetId when the facet is not found', () => {
    fixture.componentRef.setInput('data', {
      definitions: [makeFacet()],
      facetId: 'missing',
    } as FacetBadgeData);
    fixture.detectChanges();
    expect(component.tip()).toBe('missing');
  });
});
