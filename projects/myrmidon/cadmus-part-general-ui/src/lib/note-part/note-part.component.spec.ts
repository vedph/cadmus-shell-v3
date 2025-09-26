import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { NgeMarkdownModule } from '@cisstech/nge/markdown';
import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { NotePartComponent } from './note-part.component';

describe('NotePartComponent', () => {
  let component: NotePartComponent;
  let fixture: ComponentFixture<NotePartComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NgeMonacoModule,
        NgeMarkdownModule,
        NotePartComponent,
      ],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotePartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
