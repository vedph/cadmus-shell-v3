import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ApparatusFragmentComponent } from './apparatus-fragment.component';
import { ApparatusEntryComponent } from '../apparatus-entry/apparatus-entry.component';

describe('ApparatusFragmentComponent', () => {
  let component: ApparatusFragmentComponent;
  let fixture: ComponentFixture<ApparatusFragmentComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        ApparatusEntryComponent,
        ApparatusFragmentComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApparatusFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
