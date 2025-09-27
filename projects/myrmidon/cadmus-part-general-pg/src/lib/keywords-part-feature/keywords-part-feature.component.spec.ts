import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { KeywordsPartFeatureComponent } from './keywords-part-feature.component';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  KeywordsPartComponent,
  KEYWORDS_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

describe('KeywordsPartFeatureComponent', () => {
  let component: KeywordsPartFeatureComponent;
  let fixture: ComponentFixture<KeywordsPartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        KeywordsPartFeatureComponent,
      ],
      // https://github.com/angular/components/issues/14668
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [KEYWORDS_PART_TYPEID]: {
              part: 'general',
            },
          },
        },
        {
          provide: MatDialog,
          useValue: {
            open: (_: any) => {},
            closeAll: (): void => undefined,
          },
        },
        {
          provide: MatDialogRef,
          useValue: {
            close: (dialogResult: any) => {},
            afterClosed: () => {},
          },
        },
      ],
      declarations: [CurrentItemBarComponent, KeywordsPartComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(KeywordsPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
