import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { render, screen } from '@testing-library/angular';

import { ManageUsersPageComponent } from './manage-users-page.component';

/**
 * Stub for the users list, which requires the users administration API.
 */
@Component({
  selector: 'auth-jwt-user-list',
  template: `<p>users list</p>`,
})
class UserListStubComponent {}

describe('ManageUsersPageComponent', () => {
  it('should show the users list', async () => {
    await render(ManageUsersPageComponent, {
      // replace the real users list with a stub
      componentImports: [MatCardModule, UserListStubComponent],
    });

    expect(screen.getByText('Manage Users')).toBeInTheDocument();
    expect(screen.getByText('users list')).toBeInTheDocument();
  });
});
