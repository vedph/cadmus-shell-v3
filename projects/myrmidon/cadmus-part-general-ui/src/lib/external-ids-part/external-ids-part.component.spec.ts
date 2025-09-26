import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ExternalIdsPartComponent } from './external-ids-part.component';

describe('ExternalIdsPartComponent', () => {
  let component: ExternalIdsPartComponent;
  let fixture: ComponentFixture<ExternalIdsPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExternalIdsPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ExternalIdsPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
