import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalStatesPartFeatureComponent } from './physical-states-part-feature.component';

describe('PhysicalStatesPartFeatureComponent', () => {
  let component: PhysicalStatesPartFeatureComponent;
  let fixture: ComponentFixture<PhysicalStatesPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalStatesPartFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalStatesPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
