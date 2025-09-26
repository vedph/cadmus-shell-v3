import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { QuotationsFragmentComponent } from './quotations-fragment.component';
import { QuotationEntryComponent } from '../quotation-entry/quotation-entry.component';

xdescribe('QuotationsFragmentComponent', () => {
  let component: QuotationsFragmentComponent;
  let fixture: ComponentFixture<QuotationsFragmentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        QuotationEntryComponent,
        QuotationsFragmentComponent,
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QuotationsFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
