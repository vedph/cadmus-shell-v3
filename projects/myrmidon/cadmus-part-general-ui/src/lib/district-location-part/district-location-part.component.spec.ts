import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DistrictLocationPartComponent } from './district-location-part.component';

describe('DistrictLocationPartComponent', () => {
  let component: DistrictLocationPartComponent;
  let fixture: ComponentFixture<DistrictLocationPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistrictLocationPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(DistrictLocationPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
