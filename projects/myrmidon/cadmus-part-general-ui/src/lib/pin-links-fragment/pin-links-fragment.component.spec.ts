import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PinLinksFragmentComponent } from './pin-links-fragment.component';

describe('PinLinksFragmentComponent', () => {
  let component: PinLinksFragmentComponent;
  let fixture: ComponentFixture<PinLinksFragmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PinLinksFragmentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PinLinksFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
