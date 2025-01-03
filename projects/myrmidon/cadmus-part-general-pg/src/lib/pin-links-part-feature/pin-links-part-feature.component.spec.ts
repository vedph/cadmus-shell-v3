import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PinLinksPartFeatureComponent } from './pin-links-part-feature.component';

describe('PinLinksPartFeatureComponent', () => {
  let component: PinLinksPartFeatureComponent;
  let fixture: ComponentFixture<PinLinksPartFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PinLinksPartFeatureComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PinLinksPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
