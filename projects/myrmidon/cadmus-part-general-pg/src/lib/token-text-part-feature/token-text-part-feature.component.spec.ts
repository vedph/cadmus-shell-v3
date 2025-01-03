import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { TokenTextPartFeatureComponent } from './token-text-part-feature.component';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import {
  TokenTextPartComponent,
  TILED_TEXT_PART_TYPEID,
} from '@myrmidon/cadmus-part-general-ui';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

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
        NgeMonacoModule,
        TokenTextPartFeatureComponent,
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
      declarations: [CurrentItemBarComponent, TokenTextPartComponent],
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
