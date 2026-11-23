import { render, screen } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';

import { JsonDiffVisualComponent } from './json-diff-visual.component';
import { JsonDiffService } from '../../services/json-diff.service';

function buildHtml(left: unknown, right: unknown): string {
  const service = new JsonDiffService();
  return service.toVisualHtml(service.diff(left, right), left);
}

describe('JsonDiffVisualComponent', () => {
  it('should render the visual diff', async () => {
    const html = buildHtml(
      { name: 'Alpha', same: 1 },
      { name: 'Beta', same: 1, extra: [1, 2] },
    );

    await render(JsonDiffVisualComponent, { inputs: { html } });

    expect(screen.getByText('name')).toBeTruthy();
    expect(screen.getByText('"Alpha"')).toBeTruthy();
    expect(screen.getByText('"Beta"')).toBeTruthy();
    expect(screen.getByText('extra')).toBeTruthy();
    expect(screen.getByText('same')).toBeTruthy();
  });

  it('should not interpret markup in compared values', async () => {
    const html = buildHtml({ v: 'a' }, { v: '<button>evil</button>' });

    await render(JsonDiffVisualComponent, { inputs: { html } });

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('"<button>evil</button>"')).toBeTruthy();
  });

  it('should update the rendered diff when html changes', async () => {
    const { rerender } = await render(JsonDiffVisualComponent, {
      inputs: { html: buildHtml({ a: 1 }, { a: 2 }) },
    });
    expect(screen.getByText('a')).toBeTruthy();

    await rerender({
      inputs: { html: buildHtml({ z: 1 }, { z: 3 }) },
      partialUpdate: true,
    });

    expect(await screen.findByText('z')).toBeTruthy();
    expect(screen.queryByText('a')).toBeNull();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('should keep the content when toggling unchanged values', async () => {
    const { rerender } = await render(JsonDiffVisualComponent, {
      inputs: { html: buildHtml({ a: 1, b: 2 }, { a: 2, b: 2 }) },
    });

    await rerender({ inputs: { showUnchanged: true }, partialUpdate: true });

    expect(screen.getByText('a')).toBeTruthy();
    expect(screen.getByText('b')).toBeTruthy();
  });
});
