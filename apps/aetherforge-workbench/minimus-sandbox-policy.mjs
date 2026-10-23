/* Hardened, pinned major-version sandboxes. Never install or execute code on the host. */
export const MINIMUS_IMAGES = Object.freeze({
  node: 'reg.mini.dev/node:22',
  python: 'reg.mini.dev/python:3.13'
});
export const MINIMUS_POLICY = Object.freeze({
  network: 'none',
  readOnly: true,
  user: '65534:65534',
  memory: '128m',
  cpus: '0.5',
  pids: '32',
  tmpfs: '/tmp:rw,nosuid,noexec,size=16m,mode=1777'
});
export function sandboxDockerArgs(language, command) {
  if (!Object.hasOwn(MINIMUS_IMAGES, language) || !Array.isArray(command) || !command.length ||
      command.some(item => typeof item !== 'string' || !item)) throw new TypeError('Invalid sandbox command');
  return ['run', '--rm', '--interactive', '--pull=never', '--network=none', '--read-only',
    '--pids-limit=32', '--memory=128m', '--cpus=0.5', '--user=65534:65534',
    '--cap-drop=ALL', '--security-opt=no-new-privileges',
    '--tmpfs', MINIMUS_POLICY.tmpfs, '--workdir=/tmp', MINIMUS_IMAGES[language], ...command];
}
