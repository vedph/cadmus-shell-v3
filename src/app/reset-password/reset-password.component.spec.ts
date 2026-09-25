import { MatSnackBar } from '@angular/material/snack-bar';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, throwError } from 'rxjs';

import { AuthJwtAccountService } from '@myrmidon/auth-jwt-admin';

import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  async function setup(succeeds = true) {
    const accountService = {
      resetPassword: vi.fn(() =>
        succeeds ? of(undefined) : throwError(() => new Error('boom')),
      ),
    };
    const snackbar = { open: vi.fn() };
    const result = await render(ResetPasswordComponent, {
      providers: [
        { provide: AuthJwtAccountService, useValue: accountService },
      ],
      configureTestBed: (tb) =>
        tb.overrideProvider(MatSnackBar, { useValue: snackbar }),
    });
    return {
      ...result,
      accountService,
      snackbar,
      user: userEvent.setup(),
    };
  }

  const emailInput = () => screen.getByPlaceholderText('email');
  const resetButton = () =>
    screen.getByRole('button', { name: /reset password/i });

  it('should disable reset until a valid email is entered', async () => {
    const { user } = await setup();
    expect(resetButton()).toBeDisabled();

    await user.type(emailInput(), 'not-an-email');
    await user.tab();

    expect(screen.getByText(/invalid email address/)).toBeInTheDocument();
    expect(resetButton()).toBeDisabled();

    await user.clear(emailInput());
    await user.type(emailInput(), 'zeus@olympus.org');

    expect(resetButton()).toBeEnabled();
  });

  it('should require the email', async () => {
    const { user } = await setup();

    await user.type(emailInput(), 'x');
    await user.clear(emailInput());
    await user.tab();

    expect(screen.getByText(/email address required/)).toBeInTheDocument();
  });

  it('should request a password reset with the reset button', async () => {
    const { user, accountService } = await setup();

    await user.type(emailInput(), 'zeus@olympus.org');
    await user.click(resetButton());

    expect(accountService.resetPassword).toHaveBeenCalledWith(
      'zeus@olympus.org',
    );
  });

  it('should request a password reset on enter', async () => {
    const { user, accountService, snackbar } = await setup();

    await user.type(emailInput(), 'zeus@olympus.org{Enter}');

    expect(accountService.resetPassword).toHaveBeenCalledWith(
      'zeus@olympus.org',
    );
    expect(snackbar.open).toHaveBeenCalledWith(
      'Message sent to zeus@olympus.org',
      'OK',
    );
  });

  it('should report reset errors', async () => {
    const { user, snackbar } = await setup(false);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await user.type(emailInput(), 'zeus@olympus.org{Enter}');

    expect(snackbar.open).toHaveBeenCalledWith(
      'Error sending message to zeus@olympus.org',
      'OK',
    );
    consoleError.mockRestore();
  });

  it('should not request a reset without email', async () => {
    const { user, accountService } = await setup();

    await user.type(emailInput(), '{Enter}');

    expect(accountService.resetPassword).not.toHaveBeenCalled();
  });
});
