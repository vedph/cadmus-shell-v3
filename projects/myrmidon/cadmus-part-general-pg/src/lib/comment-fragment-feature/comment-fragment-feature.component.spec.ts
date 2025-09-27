import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CommentFragmentFeatureComponent } from './comment-fragment-feature.component';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  CommentFragmentComponent,
  CHRONOLOGY_FRAGMENT_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
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
        NgeMonacoModule,
        NgeMarkdownModule,
        CommentFragmentComponent,
        CommentFragmentFeatureComponent,
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
      declarations: [CurrentItemBarComponent],
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
