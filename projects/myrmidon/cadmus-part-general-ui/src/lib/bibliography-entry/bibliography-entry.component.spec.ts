import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { BibliographyEntryComponent } from './bibliography-entry.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BibAuthorsEditorComponent } from '../bib-authors-editor/bib-authors-editor.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('BibliographyEntryComponent', () => {
  let component: BibliographyEntryComponent;
  let fixture: ComponentFixture<BibliographyEntryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        NoopAnimationsModule,
        BibAuthorsEditorComponent,
        BibliographyEntryComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BibliographyEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
