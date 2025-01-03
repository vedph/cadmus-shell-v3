import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoricalEventsPartFeatureComponent } from './historical-events-part-feature.component';

describe('HistoricalEventsPartFeatureComponent', () => {
  let component: HistoricalEventsPartFeatureComponent;
  let fixture: ComponentFixture<HistoricalEventsPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [HistoricalEventsPartFeatureComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoricalEventsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
