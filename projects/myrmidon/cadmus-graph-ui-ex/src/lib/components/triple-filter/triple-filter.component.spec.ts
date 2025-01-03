import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripleFilterComponent } from './triple-filter.component';

describe('TripleFilterComponent', () => {
  let component: TripleFilterComponent;
  let fixture: ComponentFixture<TripleFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [TripleFilterComponent]
})
    .compileComponents();

    fixture = TestBed.createComponent(TripleFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
