import { Component, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

import { RegisterUserPageComponent } from './register-user-page.component';

/**
 * Stub for the registration form, which requires the accounts API.
 * It emits the registered event on click.
 */
@Component({
  selector: 'auth-jwt-registration',
  template: `<button type="button" (click)="registered.emit()">register</button>`,
})
class RegistrationStubComponent {
  public readonly registered = output();
}

describe('RegisterUserPageComponent', () => {
  async function setup() {
    const router = { navigate: vi.fn() };
    const result = await render(RegisterUserPageComponent, {
      // replace the real registration form with a stub
      componentImports: [MatCardModule, MatIconModule, RegistrationStubComponent],
      providers: [{ provide: Router, useValue: router }],
    });
    return { ...result, router, user: userEvent.setup() };
  }

  it('should show the registration form', async () => {
    await setup();

    expect(screen.getByText('Register User')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'register' }),
    ).toBeInTheDocument();
  });

  it('should navigate to users management once registered', async () => {
    const { user, router } = await setup();

    await user.click(screen.getByRole('button', { name: 'register' }));

    expect(router.navigate).toHaveBeenCalledWith(['/manage-users']);
  });
});
