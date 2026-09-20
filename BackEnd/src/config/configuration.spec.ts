import configuration from './configuration';

describe('configuration.database.synchronize', () => {
  const original = process.env.DB_SYNCHRONIZE;

  afterEach(() => {
    if (original === undefined) delete process.env.DB_SYNCHRONIZE;
    else process.env.DB_SYNCHRONIZE = original;
  });

  it('is off when DB_SYNCHRONIZE is not set (schema changes go through migrations)', () => {
    delete process.env.DB_SYNCHRONIZE;
    expect(configuration().database.synchronize).toBe(false);
  });

  it('is on only when DB_SYNCHRONIZE is explicitly "true"', () => {
    process.env.DB_SYNCHRONIZE = 'true';
    expect(configuration().database.synchronize).toBe(true);
  });

  it('uses the public schema unless DB_SCHEMA names another one', () => {
    delete process.env.DB_SCHEMA;
    expect(configuration().database.schema).toBe('public');
    process.env.DB_SCHEMA = 'vendor_test';
    expect(configuration().database.schema).toBe('vendor_test');
    delete process.env.DB_SCHEMA;
  });

  it('treats any other value as off', () => {
    process.env.DB_SYNCHRONIZE = 'false';
    expect(configuration().database.synchronize).toBe(false);
    process.env.DB_SYNCHRONIZE = 'yes';
    expect(configuration().database.synchronize).toBe(false);
  });
});
