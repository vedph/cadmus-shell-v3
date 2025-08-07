import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FlagsPartFeatureComponent } from './flags-part-feature.component';

describe('FlagsPartFeatureComponent', () => {
  let component: FlagsPartFeatureComponent;
  let fixture: ComponentFixture<FlagsPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagsPartFeatureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FlagsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
