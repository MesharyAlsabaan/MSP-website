import { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

const ctx = {} as ExecutionContext;
const handlerOf = (value: unknown): CallHandler => ({ handle: () => of(value) });

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps a plain payload in { data }', async () => {
    const out = await firstValueFrom(
      interceptor.intercept(ctx, handlerOf({ id: '1' })),
    );
    expect(out).toEqual({ data: { id: '1' } });
  });

  it('wraps null payloads as { data: null }', async () => {
    const out = await firstValueFrom(
      interceptor.intercept(ctx, handlerOf(undefined)),
    );
    expect(out).toEqual({ data: null });
  });

  it('passes a paginated envelope through untouched', async () => {
    const paginated = { data: [1, 2], total: 2, page: 1, pageSize: 12 };
    const out = await firstValueFrom(
      interceptor.intercept(ctx, handlerOf(paginated)),
    );
    expect(out).toBe(paginated);
  });
});
