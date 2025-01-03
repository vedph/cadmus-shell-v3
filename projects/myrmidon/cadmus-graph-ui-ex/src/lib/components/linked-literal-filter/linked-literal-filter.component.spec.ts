import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkedLiteralFilterComponent } from './linked-literal-filter.component';

describe('LinkedLiteralFilterComponent', () => {
  let component: LinkedLiteralFilterComponent;
  let fixture: ComponentFixture<LinkedLiteralFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [LinkedLiteralFilterComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(LinkedLiteralFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
