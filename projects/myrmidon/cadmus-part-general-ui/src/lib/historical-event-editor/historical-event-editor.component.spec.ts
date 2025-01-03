import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoricalEventEditorComponent } from './historical-event-editor.component';

describe('HistoricalEventEditorComponent', () => {
  let component: HistoricalEventEditorComponent;
  let fixture: ComponentFixture<HistoricalEventEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [HistoricalEventEditorComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoricalEventEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
