import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrthographyFragmentComponent } from './orthography-fragment.component';
import { MspOperationComponent } from '../msp-operation/msp-operation.component';

describe('OrthographyFragmentComponent', () => {
  let component: OrthographyFragmentComponent;
  let fixture: ComponentFixture<OrthographyFragmentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MspOperationComponent,
        OrthographyFragmentComponent,
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrthographyFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
