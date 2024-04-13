import { TestBed } from '@angular/core/testing';

import { FragmentEditorService } from './fragment-editor.service';

describe('FragmentEditorService', () => {
  let service: FragmentEditorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FragmentEditorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
