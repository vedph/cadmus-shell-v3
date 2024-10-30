import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DistrictLocationPartFeatureComponent } from './district-location-part-feature.component';

describe('DistrictLocationPartFeatureComponent', () => {
  let component: DistrictLocationPartFeatureComponent;
  let fixture: ComponentFixture<DistrictLocationPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistrictLocationPartFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DistrictLocationPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
