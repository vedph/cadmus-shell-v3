import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalMeasurementsPartFeatureComponent } from './physical-measurements-part-feature.component';

describe('PhysicalMeasurementsPartFeatureComponent', () => {
  let component: PhysicalMeasurementsPartFeatureComponent;
  let fixture: ComponentFixture<PhysicalMeasurementsPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalMeasurementsPartFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalMeasurementsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
