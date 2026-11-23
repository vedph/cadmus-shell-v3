import { Clipboard } from '@angular/cdk/clipboard';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { JsonPatchViewComponent } from './json-patch-view.component';
import { JsonPatchOperation } from '../../models';

const OPS: JsonPatchOperation[] = [
  { op: 'replace', path: '/title', value: 'Beta' },
  { op: 'remove', path: '/old' },
];

async function setup(operations: JsonPatchOperation[] = OPS) {
  const copy = vi.fn(() => true);
  const user = userEvent.setup();
  const view = await render(JsonPatchViewComponent, {
    inputs: { operations },
    providers: [{ provide: Clipboard, useValue: { copy } }],
  });
  return { user, copy, ...view };
}

describe('JsonPatchViewComponent', () => {
  it('should show the operations count and JSON', async () => {
    await setup();

    expect(screen.getByText('2 operations')).toBeTruthy();
    expect(screen.getByText(/"path": "\/title"/)).toBeTruthy();
    expect(screen.getByText(/"op": "remove"/)).toBeTruthy();
  });

  it('should use the singular for a single operation', async () => {
    await setup([OPS[0]]);

    expect(screen.getByText('1 operation')).toBeTruthy();
  });

  it('should show the empty message without operations', async () => {
    await setup([]);

    expect(screen.getByText('No differences.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /copy/i })).toBeNull();
  });

  it('should copy operations to the clipboard', async () => {
    const { user, copy } = await setup();

    await user.click(screen.getByRole('button', { name: /copy/i }));

    expect(copy).toHaveBeenCalledWith(JSON.stringify(OPS, null, 2));
    expect(screen.getByRole('button', { name: /copied/i })).toBeTruthy();
  });

  it('should reset the copied state when operations change', async () => {
    const { user, rerender } = await setup();
    await user.click(screen.getByRole('button', { name: /copy/i }));

    await rerender({ inputs: { operations: [OPS[1]] }, partialUpdate: true });

    expect(screen.getByRole('button', { name: /^.*copy$/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /copied/i })).toBeNull();
  });
});
