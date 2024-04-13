import { async, ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { TokenTextPartFeatureComponent } from './token-text-part-feature.component';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  TokenTextPartComponent,
  TILED_TEXT_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';

import { RouterTestingModule } from '@angular/router/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CadmusCoreModule } from '@myrmidon/cadmus-core';

describe('TokenTextPartFeatureComponent', () => {
  let component: TokenTextPartFeatureComponent;
  let fixture: ComponentFixture<TokenTextPartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        RouterTestingModule,
        NgeMonacoModule,
        CadmusCoreModule,
        CadmusUiModule,
      ],
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [TILED_TEXT_PART_TYPEID]: {
              part: 'general',
            },
          },
        },
      ],
      declarations: [
        CurrentItemBarComponent,
        TokenTextPartComponent,
        TokenTextPartFeatureComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TokenTextPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
