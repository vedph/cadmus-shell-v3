import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacetEditPageComponent } from './facet-edit-page.component';

describe('FacetEditPageComponent', () => {
  let component: FacetEditPageComponent;
  let fixture: ComponentFixture<FacetEditPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacetEditPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FacetEditPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
