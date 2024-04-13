import { Injectable } from '@angular/core';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Generic upload service.
 */
@Injectable({
  providedIn: 'root',
})
export class UploadService {
  constructor(private http: HttpClient) {}

  /**
   * Upload the specified file to the specified URL.
   * @param file The file to upload.
   * @param url The upload URL.
   * @param options The options. For instance, you can pass { reportProgress: true}
   * to get upload progress events.
   * @returns Observable.
   */
  uploadFile(file: File, url: string, options?: any): Observable<any> {
    const fd = new FormData();
    fd.append('file', file, file.name);

    const uploadRequest = new HttpRequest('POST', url, fd, {
      reportProgress: true,
      ...options,
    });

    return this.http.request(uploadRequest);
  }
}
