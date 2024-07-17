import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalMeasurementsPartComponent } from './physical-measurements-part.component';

describe('PhysicalMeasurementsPartComponent', () => {
  let component: PhysicalMeasurementsPartComponent;
  let fixture: ComponentFixture<PhysicalMeasurementsPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalMeasurementsPartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhysicalMeasurementsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
