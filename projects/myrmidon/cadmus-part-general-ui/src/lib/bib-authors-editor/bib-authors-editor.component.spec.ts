import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BibAuthorsEditorComponent } from './bib-authors-editor.component';

describe('BibAuthorsEditorComponent', () => {
  let component: BibAuthorsEditorComponent;
  let fixture: ComponentFixture<BibAuthorsEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibAuthorsEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BibAuthorsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
