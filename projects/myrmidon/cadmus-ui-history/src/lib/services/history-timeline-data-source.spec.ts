import { firstValueFrom, of } from 'rxjs';

import { EditStatus } from '@myrmidon/cadmus-core';

import { HistoryDataAdapter, HistoryEntryInfo } from '../models';
import {
  getEditStatusName,
  HISTORY_STATUS_COLORS,
  HistoryTimelineDataSource,
} from './history-timeline-data-source';

function makeInfo(
  id: string,
  time: string,
  status = EditStatus.updated,
): HistoryEntryInfo {
  return {
    id,
    referenceId: 'ref',
    status,
    timeModified: new Date(time),
    userId: 'zeus',
    timeCreated: new Date('2026-01-01T00:00:00Z'),
    creatorId: 'hera',
  };
}

function makeAdapter(entries: HistoryEntryInfo[]) {
  return {
    kind: 'part',
    getEntries: vi.fn().mockReturnValue(of(entries)),
  } as unknown as HistoryDataAdapter<unknown> & {
    getEntries: ReturnType<typeof vi.fn>;
  };
}

describe('HistoryTimelineDataSource', () => {
  const range = {
    start: { label: 'a', value: new Date('2026-11-01T00:00:00Z').getTime() },
    end: { label: 'b', value: new Date('2026-11-08T00:00:00Z').getTime() },
  };

  it('should request the entries in the range as dates', async () => {
    const adapter = makeAdapter([]);
    const source = new HistoryTimelineDataSource(adapter);

    await firstValueFrom(source.getPoints(range));

    expect(adapter.getEntries).toHaveBeenCalledWith(
      new Date('2026-11-01T00:00:00Z'),
      new Date('2026-11-08T00:00:00Z'),
    );
  });

  it('should map entries to points with time values and stable numeric IDs', async () => {
    const adapter = makeAdapter([
      makeInfo('g1', '2026-11-02T10:00:00Z', EditStatus.created),
      makeInfo('g2', '2026-11-03T10:00:00Z'),
    ]);
    const source = new HistoryTimelineDataSource(adapter);

    const points = await firstValueFrom(source.getPoints(range));

    expect(points.length).toBe(2);
    expect(points[0].value).toBe(new Date('2026-11-02T10:00:00Z').getTime());
    expect(points[0].label).toContain('zeus');
    expect(points[0].tip).toContain('created by zeus');
    expect(points[0].color).toBe(HISTORY_STATUS_COLORS[EditStatus.created]);
    expect(points[0].shape).toBe('oval');
    expect(points[1].color).toBeUndefined();
    expect(points[1].shape).toBe('rectangle');
    // IDs are unique and stable
    expect(points[0].id).not.toBe(points[1].id);
    expect(source.getPointId('g1')).toBe(points[0].id);
    const again = await firstValueFrom(source.getPoints(range));
    expect(again.map((p) => p.id)).toEqual(points.map((p) => p.id));
  });

  it('should resolve the entry of a point', async () => {
    const info = makeInfo('g1', '2026-11-02T10:00:00Z');
    const source = new HistoryTimelineDataSource(makeAdapter([info]));
    const [point] = await firstValueFrom(source.getPoints(range));

    expect(source.getEntry(point)).toBe(info);
    expect(source.getEntry({ label: 'x', value: 0, id: 999 })).toBeUndefined();
    expect(source.getEntry({ label: 'x', value: 0 })).toBeUndefined();
  });

  it('should exclude deleted entries unless requested', async () => {
    const entries = [
      makeInfo('g1', '2026-11-02T10:00:00Z'),
      makeInfo('g2', '2026-11-03T10:00:00Z', EditStatus.deleted),
    ];
    expect(
      (
        await firstValueFrom(
          new HistoryTimelineDataSource(makeAdapter(entries)).getPoints(range),
        )
      ).length,
    ).toBe(1);
    expect(
      (
        await firstValueFrom(
          new HistoryTimelineDataSource(makeAdapter(entries), true).getPoints(
            range,
          ),
        )
      ).length,
    ).toBe(2);
  });

  it('toPoint should register the entry', () => {
    const source = new HistoryTimelineDataSource(makeAdapter([]));
    const info = makeInfo('g9', '2026-11-02T10:00:00Z');
    const point = source.toPoint(info);
    expect(source.getEntry(point)).toBe(info);
  });

  it('getEditStatusName should name statuses', () => {
    expect(getEditStatusName(EditStatus.created)).toBe('created');
    expect(getEditStatusName(EditStatus.updated)).toBe('updated');
    expect(getEditStatusName(EditStatus.deleted)).toBe('deleted');
  });
});
