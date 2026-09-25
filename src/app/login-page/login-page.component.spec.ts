import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, throwError } from 'rxjs';

import { AuthJwtService } from '@myrmidon/auth-jwt-login';

import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  async function setup(loginSucceeds = true) {
    const authService = {
      login: vi.fn(() =>
        loginSucceeds
          ? of({ userName: 'zeus' })
          : throwError(() => new Error('unauthorized')),
      ),
    };
    const snackbar = { open: vi.fn() };
    const result = await render(LoginPageComponent, {
      providers: [
        provideRouter([]),
        { provide: AuthJwtService, useValue: authService },
      ],
      configureTestBed: (tb) =>
        tb.overrideProvider(MatSnackBar, { useValue: snackbar }),
    });
    const router = result.fixture.debugElement.injector.get(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    return {
      ...result,
      authService,
      router,
      snackbar,
      user: userEvent.setup(),
    };
  }

  async function login(user: ReturnType<typeof userEvent.setup>) {
    await user.type(screen.getByRole('textbox', { name: /name/ }), 'zeus');
    await user.type(screen.getByLabelText(/password/, { selector: 'input' }), 'P4ss!word');
    await user.click(screen.getByRole('button', { name: /login/ }));
  }

  it('should show the login form', async () => {
    await setup();

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /name/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/ })).toBeDisabled();
  });

  it('should login and navigate to items', async () => {
    const { user, authService, router } = await setup();

    await login(user);

    expect(authService.login).toHaveBeenCalledWith('zeus', 'P4ss!word');
    expect(router.navigate).toHaveBeenCalledWith(['/items']);
  });

  it('should show an error when login fails', async () => {
    const { user, router, snackbar } = await setup(false);

    await login(user);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(snackbar.open).toHaveBeenCalledWith(
      'Login failed',
      'Dismiss',
      expect.anything(),
    );
    expect(await screen.findByText('Login failed')).toBeInTheDocument();
  });

  it('should navigate to reset password when forgotten', async () => {
    const { user, router } = await setup();

    await user.click(screen.getByText(/forgot password/i));

    expect(router.navigate).toHaveBeenCalledWith(['/reset-password']);
  });
});
