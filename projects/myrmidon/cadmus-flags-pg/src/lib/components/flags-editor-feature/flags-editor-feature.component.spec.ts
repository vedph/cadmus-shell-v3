import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { AppRepository } from '@myrmidon/cadmus-state';
import { FlagService } from '@myrmidon/cadmus-api';

import { FlagsEditorFeatureComponent } from './flags-editor-feature.component';

describe('FlagsEditorFeatureComponent', () => {
  let component: FlagsEditorFeatureComponent;
  let fixture: ComponentFixture<FlagsEditorFeatureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlagsEditorFeatureComponent],
      providers: [
        // FlagListRepository (providedIn: 'root', not part of
        // cadmus-flags-ui's public API) is created for real; only its own
        // FlagService dependency is mocked.
        { provide: FlagService, useValue: { getFlags: vi.fn().mockReturnValue(of([])) } },
        { provide: AppRepository, useValue: { load: vi.fn(), loadFlags: vi.fn() } },
        { provide: DialogService, useValue: { confirm: vi.fn() } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FlagsEditorFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
