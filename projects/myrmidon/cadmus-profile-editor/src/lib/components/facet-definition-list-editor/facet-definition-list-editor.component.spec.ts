import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacetDefinitionListEditorComponent } from './facet-definition-list-editor.component';

describe('FacetListEditorComponent', () => {
  let component: FacetDefinitionListEditorComponent;
  let fixture: ComponentFixture<FacetDefinitionListEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacetDefinitionListEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacetDefinitionListEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
