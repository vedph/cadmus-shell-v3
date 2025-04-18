import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssertedHistoricalDatesPartComponent } from './asserted-historical-dates-part.component';

describe('AssertedHistoricalDatesPartComponent', () => {
  let component: AssertedHistoricalDatesPartComponent;
  let fixture: ComponentFixture<AssertedHistoricalDatesPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssertedHistoricalDatesPartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssertedHistoricalDatesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
