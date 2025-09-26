import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ChronotopesPartComponent } from './chronotopes-part.component';

describe('ChronotopesPartComponent', () => {
  let component: ChronotopesPartComponent;
  let fixture: ComponentFixture<ChronotopesPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChronotopesPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ChronotopesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
