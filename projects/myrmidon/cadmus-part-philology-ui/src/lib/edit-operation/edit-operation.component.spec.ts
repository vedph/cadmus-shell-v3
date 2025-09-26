import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { EditOperationComponent } from './edit-operation.component';

// a minimal host component for testing, embedding the component to test
// so that we can pass it its required inputs
@Component({
  standalone: true,
  template: `<cadmus-edit-operation inputText="abcde" />`,
  imports: [EditOperationComponent],
})
class TestHostComponent {}

describe('EditOperationComponent (Host Component Test)', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    hostFixture.detectChanges();
  });

  it('should create the EditOperationComponent', () => {
    const childDebug = hostFixture.debugElement.query(
      By.directive(EditOperationComponent)
    );
    expect(childDebug).toBeTruthy();
  });
});
