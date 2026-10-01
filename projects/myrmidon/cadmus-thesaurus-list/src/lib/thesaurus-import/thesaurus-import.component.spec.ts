import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpEventType } from '@angular/common/http';
import { Subject } from 'rxjs';

import { ThesaurusImportComponent } from './thesaurus-import.component';
import { EnvService } from '@myrmidon/ngx-tools';
import { UploadService } from '@myrmidon/cadmus-api';

function makeFile(name: string): File {
  return new File(['content'], name);
}

describe('ThesaurusImportComponent', () => {
  let component: ThesaurusImportComponent;
  let fixture: ComponentFixture<ThesaurusImportComponent>;
  let uploadService: { uploadFile: ReturnType<typeof vi.fn> };
  let upload$: Subject<any>;

  beforeEach(() => {
    upload$ = new Subject();
    uploadService = { uploadFile: vi.fn().mockReturnValue(upload$) };

    TestBed.configureTestingModule({
      imports: [ThesaurusImportComponent],
      providers: [
        { provide: EnvService, useValue: { get: vi.fn().mockReturnValue('http://api/') } },
        { provide: UploadService, useValue: uploadService },
      ],
    });
    fixture = TestBed.createComponent(ThesaurusImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with default form values', () => {
    expect(component).toBeTruthy();
    expect(component.form.mode().value()).toBe('R');
    expect(component.form.excelSheet().value()).toBe(1);
    expect(component.form.dryRun().value()).toBe(false);
  });

  describe('file validator', () => {
    it('should reject a file with a disallowed extension', () => {
      component.form.file().value.set(makeFile('data.txt'));
      expect(component.form.file().getError('invalidExtension')).toBeTruthy();
    });

    it('should accept an allowed extension', () => {
      component.form.file().value.set(makeFile('data.csv'));
      expect(component.form.file().valid()).toBe(true);
    });

    it('should require a file', () => {
      expect(component.form.file().getError('required')).toBeTruthy();
    });
  });

  describe('onFileSelected', () => {
    it('should set the file control from the input event', () => {
      const file = makeFile('data.json');
      component.onFileSelected({ target: { files: [file] } });
      expect(component.form.file().value()).toBe(file);
    });
  });

  describe('upload', () => {
    it('should not upload when the form is invalid', () => {
      component.upload();
      expect(uploadService.uploadFile).not.toHaveBeenCalled();
    });

    it('should emit uploadStart and call uploadFile with the built URL', () => {
      component.form.file().value.set(makeFile('data.csv'));
      component.form.mode().value.set('M');
      component.form.excelSheet().value.set(2);
      component.form.dryRun().value.set(true);
      const startSpy = vi.fn();
      component.uploadStart.subscribe(startSpy);

      component.upload();

      expect(startSpy).toHaveBeenCalled();
      expect(component.uploading()).toBe(true);
      expect(uploadService.uploadFile).toHaveBeenCalledWith(
        component.form.file().value(),
        'http://api/thesauri/import?mode=M&excelSheet=2&dryRun=true',
        { reportProgress: true }
      );
    });

    it('should omit query params that are at their default value', () => {
      component.form.file().value.set(makeFile('data.csv'));
      component.upload();
      expect(uploadService.uploadFile).toHaveBeenCalledWith(
        component.form.file().value(),
        'http://api/thesauri/import',
        { reportProgress: true }
      );
    });

    it('should update progress on UploadProgress events', () => {
      component.form.file().value.set(makeFile('data.csv'));
      component.upload();

      upload$.next({ type: HttpEventType.UploadProgress, loaded: 50, total: 200 });

      expect(component.uploadProgress()).toBe(25);
    });

    it('should set the result and emit uploadEnd(true) on a Response event', () => {
      component.form.file().value.set(makeFile('data.csv'));
      const endSpy = vi.fn();
      component.uploadEnd.subscribe(endSpy);
      component.upload();

      upload$.next({
        type: HttpEventType.Response,
        body: { importedIds: ['a', 'b'] },
      });

      expect(component.uploading()).toBe(false);
      expect(component.result()).toEqual({ importedIds: ['a', 'b'] });
      expect(endSpy).toHaveBeenCalledWith(true);
    });

    it('should reset state and emit uploadEnd(false) on error', () => {
      component.form.file().value.set(makeFile('data.csv'));
      const endSpy = vi.fn();
      component.uploadEnd.subscribe(endSpy);
      component.upload();

      upload$.error(new Error('boom'));

      expect(component.uploading()).toBe(false);
      expect(component.uploadProgress()).toBe(0);
      expect(endSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('onCancel', () => {
    it('should unsubscribe, reset state and emit uploadEnd(false)', () => {
      component.form.file().value.set(makeFile('data.csv'));
      component.upload();
      const endSpy = vi.fn();
      component.uploadEnd.subscribe(endSpy);

      component.onCancel();

      expect(component.uploading()).toBe(false);
      expect(component.uploadProgress()).toBe(0);
      expect(endSpy).toHaveBeenCalledWith(false);

      // further progress events must be ignored since we unsubscribed
      upload$.next({ type: HttpEventType.UploadProgress, loaded: 1, total: 2 });
      expect(component.uploadProgress()).toBe(0);
    });
  });

  describe('template', () => {
    it('renders no <form>; upload is a type=button click, enabled once valid', () => {
      expect(fixture.nativeElement.querySelector('form')).toBeNull();
      const button: HTMLButtonElement = Array.from<HTMLButtonElement>(
        fixture.nativeElement.querySelectorAll('button')
      ).find((b) => b.textContent?.includes('upload'))!;
      expect(button.type).toBe('button');
      expect(button.disabled).toBe(true);

      component.form.file().value.set(makeFile('data.json'));
      fixture.detectChanges();
      expect(button.disabled).toBe(false);
      button.click();
      expect(uploadService.uploadFile).toHaveBeenCalled();
    });

    it('renders min=1 on the Excel inputs, and uploads on Enter in them', () => {
      component.form.file().value.set(makeFile('data.xlsx'));
      fixture.detectChanges();
      const inputs: HTMLInputElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('input[type="number"]')
      );
      expect(inputs.length).toBe(3);
      expect(inputs.every((i) => i.min === '1')).toBe(true);

      inputs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(uploadService.uploadFile).toHaveBeenCalledTimes(1);
    });

    it('keeps the field mapped when the file dialog is cancelled', () => {
      component.onFileSelected({ target: { files: [] } });
      expect(component.form.file().value()).toBeNull();
      component.form.file().value.set(makeFile('data.json'));
      expect(component.form.file().value()?.name).toBe('data.json');
    });
  });
});
