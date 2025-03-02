import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextSpansViewComponent } from './text-spans-view.component';

describe('TextSpanRowsViewComponent', () => {
  let component: TextSpansViewComponent;
  let fixture: ComponentFixture<TextSpansViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextSpansViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextSpansViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
