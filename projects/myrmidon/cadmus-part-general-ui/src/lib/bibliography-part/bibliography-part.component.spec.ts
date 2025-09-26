import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BibliographyPartComponent } from './bibliography-part.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BibliographyEntryComponent } from '../bibliography-entry/bibliography-entry.component';
import { BibAuthorsEditorComponent } from '../bib-authors-editor/bib-authors-editor.component';

describe('BibliographyPartComponent', () => {
  let component: BibliographyPartComponent;
  let fixture: ComponentFixture<BibliographyPartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        BibAuthorsEditorComponent,
        BibliographyEntryComponent,
        BibliographyPartComponent,
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BibliographyPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
