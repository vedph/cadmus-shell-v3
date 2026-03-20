import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacetListEditorComponent } from './facet-list-editor.component';

describe('FacetListEditorComponent', () => {
  let component: FacetListEditorComponent;
  let fixture: ComponentFixture<FacetListEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacetListEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacetListEditorComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
