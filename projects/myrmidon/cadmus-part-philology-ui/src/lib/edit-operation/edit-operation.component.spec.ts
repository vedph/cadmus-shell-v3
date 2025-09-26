import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOperationComponent } from './edit-operation.component';

describe('EditOperationComponent', () => {
  let component: EditOperationComponent;
  let fixture: ComponentFixture<EditOperationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditOperationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EditOperationComponent);
    component = fixture.componentInstance;
    // provide required input
    // component.inputText.set('abcde');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
