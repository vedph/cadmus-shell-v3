import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MspOperationComponent } from './msp-operation.component';

describe('MspOperationComponent', () => {
  let component: MspOperationComponent;
  let fixture: ComponentFixture<MspOperationComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MspOperationComponent,
      ],
      // https://github.com/angular/components/issues/14668
      providers: [
        {
          useValue: () => new Promise(() => {}),
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MspOperationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
