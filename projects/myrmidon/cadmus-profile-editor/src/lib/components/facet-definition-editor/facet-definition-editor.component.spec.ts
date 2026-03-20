import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacetDefinitionEditorComponent } from './facet-definition-editor.component';

describe('FacetDefinitionEditorComponent', () => {
  let component: FacetDefinitionEditorComponent;
  let fixture: ComponentFixture<FacetDefinitionEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacetDefinitionEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacetDefinitionEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
