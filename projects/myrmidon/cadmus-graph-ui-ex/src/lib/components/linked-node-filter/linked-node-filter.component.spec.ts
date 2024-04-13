import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkedNodeFilterComponent } from './linked-node-filter.component';

describe('LinkedNodeFilterComponent', () => {
  let component: LinkedNodeFilterComponent;
  let fixture: ComponentFixture<LinkedNodeFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LinkedNodeFilterComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinkedNodeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
