import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PinLinksFragmentFeatureComponent } from './pin-links-fragment-feature.component';

describe('PinLinksFragmentFeatureComponent', () => {
  let component: PinLinksFragmentFeatureComponent;
  let fixture: ComponentFixture<PinLinksFragmentFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PinLinksFragmentFeatureComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PinLinksFragmentFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
