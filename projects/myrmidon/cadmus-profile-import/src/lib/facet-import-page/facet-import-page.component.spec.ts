import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FacetImportPageComponent } from './facet-import-page.component';
import { EnvService } from '@myrmidon/ngx-tools';
import { UploadService } from '@myrmidon/cadmus-api';

describe('FacetImportPageComponent', () => {
  let component: FacetImportPageComponent;
  let fixture: ComponentFixture<FacetImportPageComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FacetImportPageComponent],
      providers: [
        { provide: EnvService, useValue: { get: vi.fn().mockReturnValue('') } },
        { provide: UploadService, useValue: { uploadFile: vi.fn() } },
      ],
    });
    fixture = TestBed.createComponent(FacetImportPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
