import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BibliographyEntryComponent } from './bibliography-entry.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BibAuthorsEditorComponent } from '../bib-authors-editor/bib-authors-editor.component';

describe('BibliographyEntryComponent', () => {
  let component: BibliographyEntryComponent;
  let fixture: ComponentFixture<BibliographyEntryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        BibAuthorsEditorComponent,
        BibliographyEntryComponent,
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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
