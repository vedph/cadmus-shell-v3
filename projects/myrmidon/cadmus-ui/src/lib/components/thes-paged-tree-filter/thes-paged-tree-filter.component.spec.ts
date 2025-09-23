import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThesPagedTreeFilterComponent } from './thes-paged-tree-filter.component';

describe('ThesPagedTreeFilterComponent', () => {
  let component: ThesPagedTreeFilterComponent;
  let fixture: ComponentFixture<ThesPagedTreeFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThesPagedTreeFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThesPagedTreeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
