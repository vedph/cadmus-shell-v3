import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { TokenTextLayerPartFeatureComponent } from './token-text-layer-part-feature.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  CurrentItemBarComponent,
  CurrentLayerPartBarComponent,
} from '@myrmidon/cadmus-ui-pg';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TILED_TEXT_PART_TYPEID } from '@myrmidon/cadmus-part-general-ui';

describe('TokenTextLayerPartFeatureComponent', () => {
  let component: TokenTextLayerPartFeatureComponent;
  let fixture: ComponentFixture<TokenTextLayerPartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        TokenTextLayerPartFeatureComponent,
      ],
      // https://github.com/angular/components/issues/14668
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [TILED_TEXT_PART_TYPEID]: {
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
      declarations: [CurrentItemBarComponent, CurrentLayerPartBarComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TokenTextLayerPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
