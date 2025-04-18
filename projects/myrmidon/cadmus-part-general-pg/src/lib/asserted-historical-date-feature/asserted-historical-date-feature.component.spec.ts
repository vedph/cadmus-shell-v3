import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssertedHistoricalDateFeatureComponent } from './asserted-historical-date-feature.component';

describe('AssertedHistoricalDateFeatureComponent', () => {
  let component: AssertedHistoricalDateFeatureComponent;
  let fixture: ComponentFixture<AssertedHistoricalDateFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssertedHistoricalDateFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssertedHistoricalDateFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
