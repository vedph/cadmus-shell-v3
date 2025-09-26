import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AssertedHistoricalDatesPartComponent } from './asserted-historical-dates-part.component';

describe('AssertedHistoricalDatesPartComponent', () => {
  let component: AssertedHistoricalDatesPartComponent;
  let fixture: ComponentFixture<AssertedHistoricalDatesPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssertedHistoricalDatesPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AssertedHistoricalDatesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
