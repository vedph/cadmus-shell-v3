import { render, screen } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';

import { JsonDiffAnnotatedComponent } from './json-diff-annotated.component';
import { JsonDiffService } from '../../services/json-diff.service';

function buildHtml(left: unknown, right: unknown): string {
  const service = new JsonDiffService();
  return service.toAnnotatedHtml(service.diff(left, right), left);
}

describe('JsonDiffAnnotatedComponent', () => {
  it('should render the annotated delta', async () => {
    const html = buildHtml({ a: 1 }, { a: 2, b: 'x' });

    await render(JsonDiffAnnotatedComponent, { inputs: { html } });

    expect(screen.getByText(/modify property/)).toBeTruthy();
    expect(screen.getByText(/add property/)).toBeTruthy();
  });

  it('should show the empty message without delta', async () => {
    await render(JsonDiffAnnotatedComponent, { inputs: { html: '' } });

    expect(screen.getByText('No differences.')).toBeTruthy();
  });

  it('should show a custom empty message', async () => {
    await render(JsonDiffAnnotatedComponent, {
      inputs: { html: '', emptyMessage: 'Nothing changed' },
    });

    expect(screen.getByText('Nothing changed')).toBeTruthy();
  });
});
