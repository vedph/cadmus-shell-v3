import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ApparatusEntryComponent } from './apparatus-entry.component';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Clipboard } from '@angular/cdk/clipboard';

// Angular Material standalone components used in imports
import { MatFormField } from '@angular/material/form-field';
import { MatLabel, MatError } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatInput } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
  MatExpansionPanelDescription,
} from '@angular/material/expansion';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';

// Standalone component
import { ThesaurusTreeComponent } from '@myrmidon/cadmus-ui';
import { provideHttpClient } from '@angular/common/http';

class MockClipboard {
  copy = jasmine.createSpy('copy');
}

describe('ApparatusEntryComponent', () => {
  let component: ApparatusEntryComponent;
  let fixture: ComponentFixture<ApparatusEntryComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FormsModule,
        ReactiveFormsModule,
        ApparatusEntryComponent,
        MatFormField,
        MatLabel,
        MatError,
        MatSelect,
        MatOption,
        MatInput,
        MatCheckbox,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatExpansionPanelDescription,
        MatIconButton,
        MatTooltip,
        MatIcon,
        MatButton,
        ThesaurusTreeComponent,
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FormBuilder,
        { provide: Clipboard, useClass: MockClipboard },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ApparatusEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
