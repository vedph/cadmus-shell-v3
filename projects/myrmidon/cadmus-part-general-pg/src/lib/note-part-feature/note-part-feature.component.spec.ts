import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HAMMER_LOADER } from '@angular/platform-browser';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  NotePartComponent,
  NOTE_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgeMarkdownModule } from '@cisstech/nge/markdown';

import { NotePartFeatureComponent } from './note-part-feature.component';

describe('NotePartFeatureComponent', () => {
  let component: NotePartFeatureComponent;
  let fixture: ComponentFixture<NotePartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        RouterTestingModule,
        NgeMonacoModule,
        NgeMarkdownModule,
        NotePartFeatureComponent,
      ],
      // https://github.com/angular/components/issues/14668
      providers: [
        {
          provide: HAMMER_LOADER,
          useValue: () => new Promise(() => {}),
        },
        {
          provide: 'partEditorKeys',
          useValue: {
            [NOTE_PART_TYPEID]: {
              part: 'general',
            },
          },
        },
      ],
      declarations: [CurrentItemBarComponent, NotePartComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(NotePartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
