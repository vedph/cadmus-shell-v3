import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { DialogService } from '@myrmidon/ngx-mat-tools';
import { FacetService } from '@myrmidon/cadmus-api';

import { FacetEditPageComponent } from './facet-edit-page.component';
import { FacetDefinitionValidatorService } from '../../services/facet-definition-validator.service';

describe('FacetEditPageComponent', () => {
  let component: FacetEditPageComponent;
  let fixture: ComponentFixture<FacetEditPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacetEditPageComponent],
      providers: [
        {
          provide: FacetService,
          useValue: {
            getFacets: vi.fn().mockReturnValue(of([])),
            getFacetModelSettings: vi.fn().mockReturnValue(of({ parts: {} })),
            addFacet: vi.fn().mockReturnValue(of({})),
          },
        },
        {
          provide: FacetDefinitionValidatorService,
          useValue: { validate: vi.fn().mockReturnValue(of({})) },
        },
        { provide: DialogService, useValue: { confirm: vi.fn().mockReturnValue(of(true)) } },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FacetEditPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('canDeactivate / onDirtyChange', () => {
    it('should allow deactivation when not dirty', () => {
      expect(component.canDeactivate()).toBe(true);
    });

    it('should block deactivation once dirty', () => {
      component.onDirtyChange(true);
      expect(component.canDeactivate()).toBe(false);
    });

    it('should allow deactivation again once dirty is cleared', () => {
      component.onDirtyChange(true);
      component.onDirtyChange(false);
      expect(component.canDeactivate()).toBe(true);
    });
  });
});
