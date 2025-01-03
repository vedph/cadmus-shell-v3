import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { ApparatusEntryComponent } from './apparatus-entry.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ApparatusEntryComponent', () => {
  let component: ApparatusEntryComponent;
  let fixture: ComponentFixture<ApparatusEntryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        ApparatusEntryComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApparatusEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
