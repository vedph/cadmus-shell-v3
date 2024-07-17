import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DecoratedCountsPartFeatureComponent } from './decorated-counts-part-feature.component';

describe('DecoratedCountsPartFeatureComponent', () => {
  let component: DecoratedCountsPartFeatureComponent;
  let fixture: ComponentFixture<DecoratedCountsPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecoratedCountsPartFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DecoratedCountsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
