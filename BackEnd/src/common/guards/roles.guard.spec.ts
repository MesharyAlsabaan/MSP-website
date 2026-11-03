import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

function ctx(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(ctx({ role: Role.Editor }))).toBe(true);
  });

  it('allows SuperAdmin for any required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ContentManager]);
    expect(guard.canActivate(ctx({ role: Role.SuperAdmin }))).toBe(true);
  });

  it('allows a user whose role is in the required set', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.Editor, Role.ContentManager]);
    expect(guard.canActivate(ctx({ role: Role.Editor }))).toBe(true);
  });

  it('forbids a user lacking the required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ContentManager]);
    expect(() => guard.canActivate(ctx({ role: Role.Editor }))).toThrow(
      ForbiddenException,
    );
  });

  it('forbids when there is no authenticated user', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.Editor]);
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });
});
