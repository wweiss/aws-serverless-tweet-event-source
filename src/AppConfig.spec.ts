import * as test from 'tape';
import { AppConfig } from './AppConfig';

test('AppConfig Unit Tests', assert => {
  assert.plan(1);

  const config = AppConfig.instance;
  config.bearerToken.subscribe(
    token => {
      assert.ok('returns a bearer token.');
    },
    err => assert.fail(`Recieved error while getting bearer token: ${JSON.stringify(err, null, 2)}`),
  );
});
