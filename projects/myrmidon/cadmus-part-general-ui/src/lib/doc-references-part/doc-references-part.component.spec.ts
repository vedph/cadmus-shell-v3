import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DocReferencesPartComponent } from './doc-references-part.component';

describe('DocReferencesPartComponent', () => {
  let component: DocReferencesPartComponent;
  let fixture: ComponentFixture<DocReferencesPartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocReferencesPartComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocReferencesPartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
