import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import { DiffDemoPageComponent } from './diff-demo-page.component';

describe('DiffDemoPageComponent', () => {
  it('should show the diff of the sample documents', async () => {
    await render(DiffDemoPageComponent);

    expect(screen.getByRole('tab', { name: 'Visual Diff' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/changes:/);
  });

  it('should report no documents after clearing', async () => {
    const user = userEvent.setup();
    await render(DiffDemoPageComponent);

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(await screen.findByText('No documents to compare.')).toBeTruthy();
  });
});
