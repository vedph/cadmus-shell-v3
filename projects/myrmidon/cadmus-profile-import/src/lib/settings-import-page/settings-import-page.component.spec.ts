import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SettingsImportPageComponent } from './settings-import-page.component';
import { EnvService } from '@myrmidon/ngx-tools';
import { UploadService } from '@myrmidon/cadmus-api';

describe('SettingsImportPageComponent', () => {
  let component: SettingsImportPageComponent;
  let fixture: ComponentFixture<SettingsImportPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsImportPageComponent],
      providers: [
        { provide: EnvService, useValue: { get: vi.fn().mockReturnValue('') } },
        { provide: UploadService, useValue: { uploadFile: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(SettingsImportPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
