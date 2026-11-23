import { render, screen, waitFor, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import { JsonDiffViewComponent } from './json-diff-view.component';

const LEFT = JSON.stringify({
  title: 'Alpha',
  count: 1,
  unchangedValue: 'same',
});
const RIGHT = JSON.stringify({
  title: 'Beta',
  count: 1,
  unchangedValue: 'same',
  added: true,
});

async function setup(
  inputs: Record<string, unknown> = { left: LEFT, right: RIGHT },
  on: Record<string, (...args: any[]) => void> = {},
) {
  const user = userEvent.setup();
  const view = await render(JsonDiffViewComponent, { inputs, on });
  return { user, ...view };
}

describe('JsonDiffViewComponent', () => {
  it('should show the three tabs', async () => {
    await setup();

    expect(screen.getByRole('tab', { name: 'Visual Diff' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'JSON (Annotated)' })).toBeTruthy();
    expect(
      screen.getByRole('tab', { name: 'JSONPatch (RFC 6902)' }),
    ).toBeTruthy();
  });

  it('should summarize changes', async () => {
    await setup();

    expect(screen.getByRole('status').textContent).toContain(
      '2 changes: 1 added, 1 replaced.',
    );
  });

  it('should report no differences for equal documents', async () => {
    await setup({ left: LEFT, right: LEFT });

    expect(screen.getByRole('status').textContent).toContain(
      'No differences.',
    );
  });

  it('should report nothing to compare when both documents are missing', async () => {
    await setup({ left: null, right: '' });

    expect(screen.getByRole('status').textContent).toContain(
      'No documents to compare.',
    );
  });

  it('should hide the summary when requested', async () => {
    await setup({ left: LEFT, right: RIGHT, hideSummary: true });

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('should report invalid JSON', async () => {
    await setup({ left: '{invalid', right: RIGHT });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Left JSON is invalid');
    expect(screen.queryByText(/Right JSON is invalid/)).toBeNull();
  });

  it('should show the visual diff by default', async () => {
    await setup();

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('title')).toBeTruthy();
    expect(within(panel).getByText('"Alpha"')).toBeTruthy();
    expect(within(panel).getByText('"Beta"')).toBeTruthy();
    expect(within(panel).getByText('added')).toBeTruthy();
  });

  it('should include unchanged values in the visual diff', async () => {
    await setup();

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('unchangedValue')).toBeTruthy();
  });

  it('should toggle showing unchanged values', async () => {
    const showUnchangedChange = vi.fn();
    const { user } = await setup(
      { left: LEFT, right: RIGHT },
      { showUnchanged: showUnchangedChange },
    );

    const toggle = screen.getByRole('switch', { name: /show unchanged/i });
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    await user.click(toggle);

    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(showUnchangedChange).toHaveBeenCalledWith(true);
  });

  it('should honor the initial showUnchanged value', async () => {
    await setup({ left: LEFT, right: RIGHT, showUnchanged: true });

    const toggle = screen.getByRole('switch', { name: /show unchanged/i });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('should show the annotated JSON tab', async () => {
    const { user } = await setup();

    await user.click(screen.getByRole('tab', { name: 'JSON (Annotated)' }));

    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getByText(/modify property/)).toBeTruthy();
    expect(within(panel).getByText(/add property/)).toBeTruthy();
  });

  it('should show the JSON Patch tab', async () => {
    const { user } = await setup();

    await user.click(
      screen.getByRole('tab', { name: 'JSONPatch (RFC 6902)' }),
    );

    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getByText('2 operations')).toBeTruthy();
    expect(panel.textContent).toContain('"op": "replace"');
    expect(panel.textContent).toContain('"path": "/title"');
    expect(panel.textContent).toContain('"op": "add"');
  });

  it('should disable the unchanged toggle outside the visual tab', async () => {
    const { user } = await setup();

    await user.click(
      screen.getByRole('tab', { name: 'JSONPatch (RFC 6902)' }),
    );

    const toggle = screen.getByRole('switch', {
      name: /show unchanged/i,
    }) as HTMLButtonElement;
    await waitFor(() => expect(toggle.disabled).toBe(true));
  });

  it('should emit the selected tab', async () => {
    const selectedTabChange = vi.fn();
    const { user } = await setup(
      { left: LEFT, right: RIGHT },
      { selectedTab: selectedTabChange },
    );

    await user.click(screen.getByRole('tab', { name: 'JSON (Annotated)' }));

    expect(selectedTabChange).toHaveBeenCalledWith(1);
  });

  it('should open the tab set by selectedTab', async () => {
    await setup({ left: LEFT, right: RIGHT, selectedTab: 2 });

    const tab = screen.getByRole('tab', { name: 'JSONPatch (RFC 6902)' });
    expect(tab.getAttribute('aria-selected')).toBe('true');
  });

  it('should update when documents change', async () => {
    const { rerender } = await setup();

    await rerender({
      inputs: { left: LEFT, right: LEFT },
      partialUpdate: true,
    });

    expect(screen.getByRole('status').textContent).toContain(
      'No differences.',
    );
  });
});
