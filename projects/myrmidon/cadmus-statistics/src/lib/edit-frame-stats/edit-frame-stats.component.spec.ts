import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditFrameStatsComponent } from './edit-frame-stats.component';

describe('EditFrameStatsComponent', () => {
  let component: EditFrameStatsComponent;
  let fixture: ComponentFixture<EditFrameStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditFrameStatsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditFrameStatsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
