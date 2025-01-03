import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PinLinksPartComponent } from './pin-links-part.component';

describe('PinLinksPartComponent', () => {
  let component: PinLinksPartComponent;
  let fixture: ComponentFixture<PinLinksPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [PinLinksPartComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(PinLinksPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
