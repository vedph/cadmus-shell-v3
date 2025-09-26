import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { PhysicalStatesPartComponent } from './physical-states-part.component';

describe('PhysicalStatesPartComponent', () => {
  let component: PhysicalStatesPartComponent;
  let fixture: ComponentFixture<PhysicalStatesPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalStatesPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(PhysicalStatesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
