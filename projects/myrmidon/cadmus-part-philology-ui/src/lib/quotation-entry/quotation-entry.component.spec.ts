import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { QuotationEntryComponent } from './quotation-entry.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

describe('QuotationEntryComponent', () => {
  let component: QuotationEntryComponent;
  let fixture: ComponentFixture<QuotationEntryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        QuotationEntryComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(QuotationEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
