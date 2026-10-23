/**
 * ÆTHERFORGE isolated code-runner image contract.
 * Google Distroless replaces Minimus, whose registry shut down 2026-10-22.
 * Keep command argument ordering compatible with images that already define
 * node/python as their OCI ENTRYPOINT. Never run arbitrary code on the host.
 */
export const SANDBOX_IMAGES = Object.freeze({
  node: 'gcr.io/distroless/nodejs22-debian13:nonroot',
  python: 'gcr.io/distroless/python3-debian13:nonroot'
});
export const SANDBOX_POLICY = Object.freeze({
  network: 'none',
  readOnly: true,
  user: '65534:65534',
  memory: '128m',
  cpus: '0.5',
  pids: '32',
  tmpfs: '/tmp:rw,nosuid,noexec,size=16m,mode=1777'
});
export function sandboxDockerArgs(language, command) {
  if (!Object.hasOwn(SANDBOX_IMAGES, language) || !Array.isArray(command) || command.length < 2
      || command.some(part => typeof part !== 'string' || !part.length)) {
    throw new TypeError('Invalid sandbox command');
  }
  const binary = language === 'node' ? 'node' : 'python';
  // The distroless image has an OCI ENTRYPOINT that already invokes binary.
  // Do not pass a duplicate 'node'/'python' argument as the script pathname.
  if (command[0] !== binary) throw new TypeError('Unexpected runtime entrypoint');
  return ['run', '--rm', '--interactive', '--pull=never',
    '--network=none', '--read-only', '--pids-limit=32', '--memory=128m',
    '--cpus=0.5', '--user=65534:65534', '--cap-drop=ALL',
    '--security-opt=no-new-privileges', '--tmpfs', SANDBOX_POLICY.tmpfs,
    '--workdir=/tmp', SANDBOX_IMAGES[language], ...command.slice(1)];
}
