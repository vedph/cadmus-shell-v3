import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BibAuthorEditorComponent } from './bib-author-editor.component';

describe('BibAuthorEditorComponent', () => {
  let component: BibAuthorEditorComponent;
  let fixture: ComponentFixture<BibAuthorEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibAuthorEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BibAuthorEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
