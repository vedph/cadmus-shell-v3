import { TestBed } from '@angular/core/testing';

import { PartEditorService } from './part-editor.service';

describe('PartEditorService', () => {
  let service: PartEditorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PartEditorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
