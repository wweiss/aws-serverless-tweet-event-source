import { AppConfig } from './AppConfig';

describe('AppConfig', () => {
  const config = AppConfig.instance;

  it('can provide a bearer token', async () => {
    const token = await config.getBearerToken();
    expect(token).toBeDefined();
  });
});
