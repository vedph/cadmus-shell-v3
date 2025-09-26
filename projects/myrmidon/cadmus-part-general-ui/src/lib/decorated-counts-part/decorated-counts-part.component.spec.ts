import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DecoratedCountsPartComponent } from './decorated-counts-part.component';

describe('DecoratedCountsPartComponent', () => {
  let component: DecoratedCountsPartComponent;
  let fixture: ComponentFixture<DecoratedCountsPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecoratedCountsPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DecoratedCountsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
