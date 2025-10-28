import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditOperationSetComponent } from './edit-operation-set.component';

describe('EditOperationSetComponent', () => {
  let component: EditOperationSetComponent;
  let fixture: ComponentFixture<EditOperationSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditOperationSetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditOperationSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
