/* Hardened Google Distroless sandboxes; their ENTRYPOINT is the language runtime. No host execution. */
export const MINIMUS_IMAGES = Object.freeze({
  node: 'gcr.io/distroless/nodejs22-debian13:nonroot',
  python: 'gcr.io/distroless/python3-debian13:nonroot'
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
  if (command[0] !== (language === 'node' ? 'node' : 'python')) throw new TypeError('Unexpected language entrypoint');
  return ['run', '--rm', '--interactive', '--pull=never', '--network=none', '--read-only',
    '--pids-limit=32', '--memory=128m', '--cpus=0.5', '--user=65534:65534',
    '--cap-drop=ALL', '--security-opt=no-new-privileges',
    '--tmpfs', MINIMUS_POLICY.tmpfs, '--workdir=/tmp', MINIMUS_IMAGES[language], ...command.slice(1)];
}
