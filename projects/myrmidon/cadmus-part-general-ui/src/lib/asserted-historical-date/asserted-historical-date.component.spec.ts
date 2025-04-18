import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssertedHistoricalDateComponent } from './asserted-historical-date.component';

describe('AssertedHistoricalDateComponent', () => {
  let component: AssertedHistoricalDateComponent;
  let fixture: ComponentFixture<AssertedHistoricalDateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssertedHistoricalDateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssertedHistoricalDateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
