import { TextToFileService } from './text-to-file.service';

describe('TextToFileService', () => {
  let service: TextToFileService;

  beforeEach(() => {
    service = new TextToFileService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('saveToFile', () => {
    it('should create an anchor, click it, and revoke the object URL', () => {
      const createUrlSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:mock-url');
      const revokeUrlSpy = vi
        .spyOn(URL, 'revokeObjectURL')
        .mockImplementation(() => {});
      const clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});

      service.saveToFile('hello world', 'test.txt');

      expect(createUrlSpy).toHaveBeenCalledTimes(1);
      const blobArg = createUrlSpy.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe('text/plain');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock-url');

      createUrlSpy.mockRestore();
      revokeUrlSpy.mockRestore();
      clickSpy.mockRestore();
    });

    it('should use the provided content type', () => {
      const createUrlSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
        () => {}
      );

      service.saveToFile('{}', 'test.json', 'application/json');

      const blobArg = createUrlSpy.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe('application/json');

      vi.restoreAllMocks();
    });

    it('should set the anchor download attribute to the given name', () => {
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
      let downloadName: string | undefined;
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
        function (this: HTMLAnchorElement) {
          downloadName = this.download;
        }
      );

      service.saveToFile('x', 'my-file.txt');

      expect(downloadName).toBe('my-file.txt');

      vi.restoreAllMocks();
    });
  });
});
