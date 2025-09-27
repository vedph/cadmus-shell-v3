import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  OrthographyFragmentComponent,
  MspOperationComponent,
  ORTHOGRAPHY_FRAGMENT_TYPEID,
} from '@myrmidon/cadmus-part-philology-ui';
import { CurrentItemBarComponent } from '@myrmidon/cadmus-ui-pg';
import { MatDialog, MatDialogRef } from '@angular/material/dialog'
;
import { OrthographyFragmentFeatureComponent } from './orthography-fragment-feature.component';

describe('OrthographyFragmentFeatureComponent', () => {
  let component: OrthographyFragmentFeatureComponent;
  let fixture: ComponentFixture<OrthographyFragmentFeatureComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        OrthographyFragmentFeatureComponent,
      ],
      providers: [
        {
          provide: 'partEditorKeys',
          useValue: {
            [ORTHOGRAPHY_FRAGMENT_TYPEID]: {
              part: 'philology',
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
      declarations: [
        CurrentItemBarComponent,
        MspOperationComponent,
        OrthographyFragmentComponent,
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OrthographyFragmentFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
