import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextSegmentsViewComponent } from './text-segments-view.component';

describe('TextSpanRowsViewComponent', () => {
  let component: TextSegmentsViewComponent;
  let fixture: ComponentFixture<TextSegmentsViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextSegmentsViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextSegmentsViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
