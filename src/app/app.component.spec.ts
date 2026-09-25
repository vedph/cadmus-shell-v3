import { provideRouter, Router } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { BehaviorSubject, of } from 'rxjs';

import { AuthJwtService, User } from '@myrmidon/auth-jwt-login';
import { ItemService } from '@myrmidon/cadmus-api';
import { ItemRefLookupService } from '@myrmidon/cadmus-codicology-ui';
import { Thesaurus } from '@myrmidon/cadmus-core';
import { AppRepository } from '@myrmidon/cadmus-state';
import { EnvService } from '@myrmidon/ngx-tools';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
  const ADMIN = {
    userName: 'zeus',
    email: 'zeus@olympus.org',
    emailConfirmed: true,
    roles: ['admin'],
  } as unknown as User;
  const VISITOR = {
    userName: 'hermes',
    email: 'hermes@olympus.org',
    emailConfirmed: false,
    roles: ['visitor'],
  } as unknown as User;

  const iconButton = (name: string) =>
    screen.queryByRole('button', { name });

  async function setup(options?: {
    user?: User;
    itemBrowsers?: Thesaurus;
  }) {
    const user$ = new BehaviorSubject<User | null>(options?.user ?? null);
    const authService = {
      currentUserValue: options?.user ?? null,
      currentUser$: user$,
      isAuthenticated: vi.fn(() => !!user$.value),
      logout: vi.fn(() => {
        user$.next(null);
        return of(true);
      }),
    };
    const repository = {
      load: vi.fn(),
      itemBrowserThesaurus$: of(options?.itemBrowsers),
    };
    const result = await render(AppComponent, {
      providers: [
        provideRouter([]),
        { provide: 'itemBrowserKeys', useValue: { 'it.vedph.hier': 'hier' } },
        { provide: AuthJwtService, useValue: authService },
        { provide: AppRepository, useValue: repository },
        { provide: EnvService, useValue: { get: () => '1.2.3' } },
        // required by the location converter in the side panel
        { provide: ItemService, useValue: {} },
        {
          provide: ItemRefLookupService,
          useValue: { id: 'item', getName: () => '', lookup: () => of([]) },
        },
      ],
    });
    return {
      ...result,
      authService,
      repository,
      user: userEvent.setup(),
    };
  }

  it('should show the app bar and version', async () => {
    await setup();

    expect(screen.getByRole('link', { name: 'Codicology' })).toHaveAttribute(
      'href',
      '/home',
    );
    expect(
      screen.getByRole('button', { name: 'Formula demo' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/version: 1\.2\.3/)).toBeInTheDocument();
  });

  it('should show only public commands when not logged', async () => {
    const { repository } = await setup();

    expect(iconButton('login')).toBeInTheDocument();
    expect(iconButton('logout')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Items' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Thesauri' })).toBeNull();
    expect(repository.load).not.toHaveBeenCalled();
  });

  it('should show admin commands to an admin', async () => {
    const { repository } = await setup({ user: ADMIN });

    expect(screen.getByRole('link', { name: 'Items' })).toHaveAttribute(
      'href',
      '/items',
    );
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thesauri' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    expect(iconButton('logout')).toBeInTheDocument();
    expect(repository.load).toHaveBeenCalled();
  });

  it('should hide editor and admin commands to a visitor', async () => {
    await setup({ user: VISITOR });

    expect(screen.getByRole('link', { name: 'Items' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thesauri' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Admin' })).toBeNull();
    // unconfirmed email warning
    expect(screen.getByText('feedback')).toBeInTheDocument();
  });

  it('should list item browsers in the items menu', async () => {
    const { user } = await setup({
      user: ADMIN,
      itemBrowsers: {
        id: 'item-browsers',
        entries: [
          { id: 'it.vedph.hier', value: 'Hierarchy' },
          { id: 'other', value: 'Other' },
        ],
      },
    });

    await user.click(screen.getByRole('button', { name: 'Items' }));

    expect(
      await screen.findByRole('menuitem', { name: 'Hierarchy' }),
    ).toHaveAttribute('href', '/item-browser/hier');
    expect(screen.getByRole('menuitem', { name: 'Other' })).toHaveAttribute(
      'href',
      '/item-browser/other',
    );
  });

  it('should logout and go home', async () => {
    const { user, authService, fixture } = await setup({ user: ADMIN });
    const router = fixture.debugElement.injector.get(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await user.click(iconButton('logout')!);

    expect(authService.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/home']);
    await waitFor(() => expect(iconButton('login')).toBeInTheDocument());
  });
});
