/** @deprecated Historical Minimus module name preserved for existing imports.
 * The Minimus registry closed on 2026-10-22; these are Google Distroless images.
 * Migrate imports to sandbox-runtime-policy.mjs.
 */
export {
  SANDBOX_IMAGES as MINIMUS_IMAGES,
  SANDBOX_POLICY as MINIMUS_POLICY,
  sandboxDockerArgs
} from './sandbox-runtime-policy.mjs';
