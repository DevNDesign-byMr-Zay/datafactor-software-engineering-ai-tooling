import { readFile } from 'node:fs/promises';

import { describe, expect, test } from '@jest/globals';

describe('dependency refresh keeps hash-verified Python versions synchronized', () => {
  test('updates the artifact hash lock when dependency versions are refreshed', async () => {
    const workflow = await readFile(
      new URL('../../.github/workflows/refresh-lockfiles.yml', import.meta.url),
      'utf8',
    );
    expect(workflow).toContain('python -m venv "$RUNNER_TEMP/python-lock-venv"');
    expect(workflow).toContain('"$RUNNER_TEMP/python-lock-venv/bin/python" -m pip freeze');
    expect(workflow).toContain('uv pip compile --no-deps --generate-hashes');
    expect(workflow).toContain('requirements.lock.txt --output-file requirements.hashed.txt');
    expect(workflow).toContain('python scripts/verify_python_lock.py');
    expect(workflow).toContain('--require-hashes -r requirements.hashed.txt');
    expect(workflow).toContain(
      'git add package-lock.json requirements.lock.txt requirements.txt requirements.hashed.txt',
    );
    expect(workflow).toContain(
      'git diff --quiet -- package-lock.json requirements.lock.txt requirements.txt requirements.hashed.txt',
    );
  });
});
