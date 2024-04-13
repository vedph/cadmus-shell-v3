import {
  async,
  ComponentFixture,
  TestBed,
  waitForAsync,
} from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';

import { CommentFragmentFeatureComponent } from './comment-fragment-feature.component';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  CommentFragmentComponent,
  CHRONOLOGY_FRAGMENT_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import { ActivatedRoute } from '@angular/router';
import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { NgeMarkdownModule } from '@cisstech/nge/markdown';

describe('CommentFragmentFeatureComponent', () => {
  let component: CommentFragmentFeatureComponent;
  let fixture: ComponentFixture<CommentFragmentFeatureComponent>;

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
        CadmusCoreModule,
        CadmusUiModule,
      ],
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [CHRONOLOGY_FRAGMENT_TYPEID]: {
              part: 'general',
            },
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              params: {
                iid: '',
                pid: '',
                loc: '',
              },
              url: [{}, {}],
              queryParams: {},
            },
          },
        },
      ],
      declarations: [
        CurrentItemBarComponent,
        CommentFragmentComponent,
        CommentFragmentFeatureComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommentFragmentFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
