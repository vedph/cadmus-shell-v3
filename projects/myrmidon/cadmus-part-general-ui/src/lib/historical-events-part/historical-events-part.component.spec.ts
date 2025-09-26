import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { HistoricalEventsPartComponent } from './historical-events-part.component';

describe('HistoricalEventsPartComponent', () => {
  let component: HistoricalEventsPartComponent;
  let fixture: ComponentFixture<HistoricalEventsPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricalEventsPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoricalEventsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
