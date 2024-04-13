import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChronotopesPartFeatureComponent } from './chronotopes-part-feature.component';

describe('ChronotopesPartFeatureComponent', () => {
  let component: ChronotopesPartFeatureComponent;
  let fixture: ComponentFixture<ChronotopesPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChronotopesPartFeatureComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChronotopesPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
