import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { ItemService, PreviewService } from '@myrmidon/cadmus-api';

import { PartPreviewFeatureComponent } from './part-preview-feature.component';

function makeRoute(overrides?: { iid?: string; pid?: string }): ActivatedRoute {
  return {
    snapshot: {
      params: {
        iid: overrides?.iid ?? 'item1',
        pid: overrides?.pid ?? 'part1',
      },
    },
  } as unknown as ActivatedRoute;
}

describe('PartPreviewFeatureComponent', () => {
  let component: PartPreviewFeatureComponent;
  let fixture: ComponentFixture<PartPreviewFeatureComponent>;

  async function configure(overrides?: { iid?: string; pid?: string }) {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [PartPreviewFeatureComponent],
      providers: [
        { provide: ActivatedRoute, useValue: makeRoute(overrides) },
        { provide: ItemService, useValue: { getItem: vi.fn().mockReturnValue(of(null)) } },
        {
          provide: PreviewService,
          useValue: { renderPart: vi.fn().mockReturnValue(of({ result: '' })) },
        },
        { provide: MatSnackBar, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PartPreviewFeatureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await configure();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build the preview source from the route params', () => {
    expect(component.source()).toEqual({ itemId: 'item1', partId: 'part1' });
  });

  it('should reflect different route params', async () => {
    await configure({ iid: 'item9', pid: 'part9' });
    expect(component.source()).toEqual({ itemId: 'item9', partId: 'part9' });
  });
});
