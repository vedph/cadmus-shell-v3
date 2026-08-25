import { firstValueFrom, of } from 'rxjs';

import { UserRefLookupService, UserWithRoles } from './user-ref-lookup.service';
import { UserService } from '@myrmidon/cadmus-api';

function makeUser(userName: string): UserWithRoles {
  return {
    user: {
      id: '1',
      firstName: 'A',
      lastName: 'B',
      userName,
      email: `${userName}@x.com`,
    },
    roles: [],
  };
}

function createService(): {
  service: UserRefLookupService;
  userService: { getUsers: ReturnType<typeof vi.fn>; getUser: ReturnType<typeof vi.fn> };
} {
  const userService = {
    getUsers: vi.fn(),
    getUser: vi.fn(),
  };
  const service = new UserRefLookupService(
    userService as unknown as UserService
  );
  return { service, userService };
}

describe('UserRefLookupService', () => {
  it('should be created with id "user"', () => {
    const { service } = createService();
    expect(service).toBeTruthy();
    expect(service.id).toBe('user');
  });

  describe('lookup', () => {
    it('should map the filter text/limit to getUsers and return the page items', async () => {
      const { service, userService } = createService();
      const items = [makeUser('bob'), makeUser('alice')];
      userService.getUsers.mockReturnValue(of({ items, total: 2 }));

      const result = await firstValueFrom(
        service.lookup({ text: 'b', limit: 5 })
      );

      expect(result).toEqual(items);
      expect(userService.getUsers).toHaveBeenCalledWith({ name: 'b' }, 1, 5);
    });
  });

  describe('getById', () => {
    it('should return the user mapped from getUser', async () => {
      const { service, userService } = createService();
      const user = makeUser('bob');
      userService.getUser.mockReturnValue(of(user));

      const result = await firstValueFrom(service.getById('bob'));

      expect(result).toEqual(user);
      expect(userService.getUser).toHaveBeenCalledWith('bob');
    });

    it('should propagate undefined when the user is not found', async () => {
      const { service, userService } = createService();
      userService.getUser.mockReturnValue(of(undefined));

      const result = await firstValueFrom(service.getById('missing'));

      expect(result).toBeUndefined();
    });
  });

  describe('getName', () => {
    it('should return the user name', () => {
      const { service } = createService();
      expect(service.getName(makeUser('bob'))).toBe('bob');
    });
  });
});
