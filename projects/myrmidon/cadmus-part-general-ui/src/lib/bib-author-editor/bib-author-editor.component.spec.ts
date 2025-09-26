import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BibAuthorEditorComponent } from './bib-author-editor.component';

describe('BibAuthorEditorComponent', () => {
  let component: BibAuthorEditorComponent;
  let fixture: ComponentFixture<BibAuthorEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BibAuthorEditorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BibAuthorEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
