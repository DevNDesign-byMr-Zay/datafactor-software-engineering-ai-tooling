import { jest } from '@jest/globals';

import { executeCloudRunSmokePlan } from '../../src/deployment/cloud-run.js';

describe('manual Cloud Run smoke plan URL safety', () => {
  test.each([
    ['not-a-url', 'valid absolute URL'],
    ['ftp://service.example.com/health', 'http or https'],
    ['https://user:pass@service.example.com/health', 'embedded credentials'],
  ])('rejects unsafe request URL %s before transport', async (url, message) => {
    const fetchImpl = jest.fn();

    await expect(executeCloudRunSmokePlan([{ method: 'GET', url }], { fetchImpl })).rejects.toThrow(
      message,
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
