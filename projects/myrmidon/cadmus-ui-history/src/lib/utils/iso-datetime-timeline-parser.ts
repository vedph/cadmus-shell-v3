import { TimelineParser, TimelineRange } from '@myrmidon/timeline-view';

export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

const ISO_REGEX =
  /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?)?)?$/;

function pad(n: number, length = 2): string {
  return n.toString().padStart(length, '0');
}

/**
 * Format the specified date as an ISO-like local date and time, i.e.
 * `YYYY-MM-DD HH:mm`, optionally with seconds.
 *
 * @param date The date.
 * @param seconds True to include seconds.
 */
export function formatLocalDateTime(date: Date, seconds = false): string {
  const s =
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-` +
    `${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  return seconds ? `${s}:${pad(date.getSeconds())}` : s;
}

/**
 * Timeline parser for date and time values. Timeline values are the
 * milliseconds since the Unix epoch (`Date.getTime()`), and the text is
 * an ISO 8601-like local date and time, with a granularity: `YYYY` (the
 * whole year), `YYYY-MM` (the whole month), `YYYY-MM-DD` (the whole day),
 * `YYYY-MM-DDTHH:mm` (the whole minute) or `YYYY-MM-DDTHH:mm:ss` (the
 * whole second). The `T` separator can also be a space. Times are local,
 * as they are displayed to users.
 */
export class IsoDateTimeTimelineParser implements TimelineParser {
  public parse(text: string): TimelineRange | null {
    const m = ISO_REGEX.exec(text.trim());
    if (!m) {
      return null;
    }
    const year = Number(m[1]);
    const month = m[2] !== undefined ? Number(m[2]) - 1 : undefined;
    const day = m[3] !== undefined ? Number(m[3]) : undefined;
    const hour = m[4] !== undefined ? Number(m[4]) : undefined;
    const minute = m[5] !== undefined ? Number(m[5]) : undefined;
    const second = m[6] !== undefined ? Number(m[6]) : undefined;

    // validate ranges
    if (
      (month !== undefined && (month < 0 || month > 11)) ||
      (hour !== undefined && hour > 23) ||
      (minute !== undefined && minute > 59) ||
      (second !== undefined && second > 59)
    ) {
      return null;
    }
    if (day !== undefined) {
      const days = new Date(year, month! + 1, 0).getDate();
      if (day < 1 || day > days) {
        return null;
      }
    }

    const start = new Date(
      year,
      month ?? 0,
      day ?? 1,
      hour ?? 0,
      minute ?? 0,
      second ?? 0,
      0,
    );
    // the end is the start of the next unit, minus 1 ms
    let next: Date;
    if (second !== undefined) {
      next = new Date(start.getTime() + 1000);
    } else if (minute !== undefined) {
      next = new Date(start.getTime() + MINUTE_MS);
    } else if (day !== undefined) {
      next = new Date(year, month!, day + 1);
    } else if (month !== undefined) {
      next = new Date(year, month + 1, 1);
    } else {
      next = new Date(year + 1, 0, 1);
    }
    const startValue = start.getTime();
    const endValue = next.getTime() - 1;
    return {
      start: { label: this.format(startValue), value: startValue },
      end: { label: this.format(endValue), value: endValue },
    };
  }

  public format(value: number, step?: number): string {
    const date = new Date(Math.round(value));
    if (step !== undefined && step >= DAY_MS) {
      return formatLocalDateTime(date).substring(0, 10);
    }
    return formatLocalDateTime(date, step !== undefined && step < MINUTE_MS);
  }
}
