import { buildCloudRunSmokePlan } from '../../src/deployment/cloud-run.js';

describe('Cloud Run smoke URL safety', () => {
  test.each(['https://user@example.com', 'https://user:password@example.com'])(
    'rejects embedded URL credentials: %s',
    (serviceUrl) => {
      expect(() => buildCloudRunSmokePlan({ serviceUrl, token: 'app-token' })).toThrow(
        'serviceUrl must not include embedded credentials',
      );
    },
  );
});
