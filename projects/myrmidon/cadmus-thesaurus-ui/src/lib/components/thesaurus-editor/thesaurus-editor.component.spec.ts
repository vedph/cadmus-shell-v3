import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThesaurusEditorComponent } from './thesaurus-editor.component';

describe('ThesaurusEditorComponent', () => {
  let component: ThesaurusEditorComponent;
  let fixture: ComponentFixture<ThesaurusEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [ThesaurusEditorComponent]
})
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ThesaurusEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
