import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpEventType } from '@angular/common/http';
import { Subject } from 'rxjs';

import { FacetImportComponent } from './facet-import.component';
import { EnvService } from '@myrmidon/ngx-tools';
import { UploadService } from '@myrmidon/cadmus-api';

function makeFile(name: string): File {
  return new File(['content'], name);
}

describe('FacetImportComponent', () => {
  let component: FacetImportComponent;
  let fixture: ComponentFixture<FacetImportComponent>;
  let uploadService: { uploadFile: ReturnType<typeof vi.fn> };
  let upload$: Subject<any>;

  beforeEach(() => {
    upload$ = new Subject();
    uploadService = { uploadFile: vi.fn().mockReturnValue(upload$) };

    TestBed.configureTestingModule({
      imports: [FacetImportComponent],
      providers: [
        {
          provide: EnvService,
          useValue: { get: vi.fn().mockReturnValue('http://api/') },
        },
        { provide: UploadService, useValue: uploadService },
      ],
    });
    fixture = TestBed.createComponent(FacetImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with default form values', () => {
    expect(component).toBeTruthy();
    expect(component.form.mode().value()).toBe('R');
    expect(component.form.dryRun().value()).toBe(false);
  });

  describe('file validator', () => {
    it('should reject a file with a disallowed extension', () => {
      component.form.file().value.set(makeFile('data.txt'));
      expect(component.form.file().getError('invalidExtension')).toBeTruthy();
    });

    it('should accept an allowed extension', () => {
      component.form.file().value.set(makeFile('data.json'));
      expect(component.form.file().valid()).toBe(true);
    });

    it('should require a file', () => {
      expect(component.form.file().getError('required')).toBeTruthy();
    });
  });

  describe('onFileSelected', () => {
    it('should set the file control from the input event', () => {
      const file = makeFile('data.json');
      const event = { target: { files: [file] } } as unknown as Event;
      component.onFileSelected(event);
      expect(component.form.file().value()).toBe(file);
    });

    it('should do nothing when no file was selected', () => {
      const event = { target: { files: [] } } as unknown as Event;
      component.onFileSelected(event);
      expect(component.form.file().value()).toBeNull();
    });
  });

  describe('upload', () => {
    it('should not upload when the form is invalid', () => {
      component.upload();
      expect(uploadService.uploadFile).not.toHaveBeenCalled();
    });

    it('should emit uploadStart and call uploadFile with the built URL', () => {
      component.form.file().value.set(makeFile('data.json'));
      component.form.mode().value.set('S');
      component.form.dryRun().value.set(true);
      const startSpy = vi.fn();
      component.uploadStart.subscribe(startSpy);

      component.upload();

      expect(startSpy).toHaveBeenCalled();
      expect(component.uploading()).toBe(true);
      expect(component.wasDryRun()).toBe(true);
      expect(uploadService.uploadFile).toHaveBeenCalledWith(
        component.form.file().value(),
        'http://api/facets/import?mode=S&dryRun=true',
        { reportProgress: true }
      );
    });

    it('should omit query params that are at their default value', () => {
      component.form.file().value.set(makeFile('data.json'));
      component.upload();
      expect(uploadService.uploadFile).toHaveBeenCalledWith(
        component.form.file().value(),
        'http://api/facets/import',
        { reportProgress: true }
      );
    });

    it('should update progress on UploadProgress events', () => {
      component.form.file().value.set(makeFile('data.json'));
      component.upload();

      upload$.next({
        type: HttpEventType.UploadProgress,
        loaded: 50,
        total: 200,
      });

      expect(component.uploadProgress()).toBe(25);
    });

    it('should set the result and emit uploadEnd(true) on a Response event', () => {
      component.form.file().value.set(makeFile('data.json'));
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

    // regression test: upload() used to subscribe with the single-argument
    // (next-only) observer form, so a failed request left uploading() stuck
    // true forever with no error feedback; see FacetImportComponent.upload().
    it('should reset state and emit uploadEnd(false) on error', () => {
      component.form.file().value.set(makeFile('data.json'));
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
      component.form.file().value.set(makeFile('data.json'));
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

  describe('reloadApp', () => {
    it('should set window.location.href to root', () => {
      const originalLocation = window.location;
      // jsdom's window.location cannot be assigned to directly; replace it
      delete (window as any).location;
      (window as any).location = { href: 'http://old/' };

      component.reloadApp();

      expect(window.location.href).toBe('/');

      (window as any).location = originalLocation;
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
      expect(fixture.nativeElement.textContent).toContain('file required');

      component.form.file().value.set(makeFile('data.txt'));
      fixture.detectChanges();
      expect(button.disabled).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('invalid file type');

      component.form.file().value.set(makeFile('data.json'));
      fixture.detectChanges();
      expect(button.disabled).toBe(false);
      button.click();
      expect(uploadService.uploadFile).toHaveBeenCalled();
    });
  });
});
