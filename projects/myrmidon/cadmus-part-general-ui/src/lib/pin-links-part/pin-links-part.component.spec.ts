import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PinLinksPartComponent } from './pin-links-part.component';

describe('PinLinksPartComponent', () => {
  let component: PinLinksPartComponent;
  let fixture: ComponentFixture<PinLinksPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PinLinksPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PinLinksPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
