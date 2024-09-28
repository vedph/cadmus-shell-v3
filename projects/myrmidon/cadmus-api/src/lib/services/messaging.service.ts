import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * A message payload, with an ID and optional data.
 */
export interface MessagePayload<T> {
  id: string;
  data?: T;
}

/**
 * A simple messaging service, allowing to send messages to subscribers.
 * This is typically used to send messages between components.
 */
@Injectable({
  providedIn: 'root',
})
export class MessagingService {
  private _subject = new Subject<MessagePayload<any>>();

  /**
   * Observable of messages.
   */
  public get messages$() {
    return this._subject.asObservable();
  }

  /**
   * Send a message to subscribers.
   *
   * @param id The message ID.
   * @param data The optional data to send.
   */
  public sendMessage<T>(id: string, data?: T): void {
    this._subject.next({ id, data });
  }
}
