import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { TiledTextLayerPartFeatureComponent } from './tiled-text-layer-part-feature.component';
import { CadmusUiPgModule } from '@myrmidon/cadmus-ui-pg';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { CadmusUiModule } from '@myrmidon/cadmus-ui';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CadmusCoreModule } from '@myrmidon/cadmus-core';
import {
  TILED_TEXT_PART_TYPEID,
  TextTileComponent,
} from '@myrmidon/cadmus-part-general-ui';

describe('TiledTextLayerPartFeatureComponent', () => {
  let component: TiledTextLayerPartFeatureComponent;
  let fixture: ComponentFixture<TiledTextLayerPartFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        RouterTestingModule,
        CadmusCoreModule,
        CadmusUiModule,
        CadmusUiPgModule,
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
      declarations: [TextTileComponent, TiledTextLayerPartFeatureComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TiledTextLayerPartFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
