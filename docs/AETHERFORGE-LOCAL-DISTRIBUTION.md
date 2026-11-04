# ÆtherForge local distribution

The maintained Commercial and Companion applications have separate browser entry points and loopback services. Source packages require no npm install, global packages, administrator privileges or automatic dependency downloads. Node.js 22+ is needed only for local services and the integrity verifier. Docker remains an optional prerequisite for explicitly approved container execution in Commercial; it is never started by the HTML entry point.

## Build from the intended clean checkout

```sh
node tools/package-aetherforge-commercial.mjs --output /outside/repository/commercial
node apps/aetherforge-workbench/package-workbench.mjs --output /outside/repository/companion
```

Each command creates a staging directory, a sibling `.zip` archive and its `.zip.sha256` checksum. ZIP entries use a stable order and a fixed timestamp. Identical package bytes produce the same archive digest. `SOURCE-SHA256.json` records schema version, entry points, runtime requirements, file count, relative paths, byte lengths and SHA-256 for every payload file. The manifest excludes itself; the external ZIP checksum covers it. The checksum establishes byte integrity when compared with a trusted published value; it is not a signature or proof of authorship.

Build output must be outside and must not contain the checkout. Commercial requires an empty output directory. Companion permits rebuilding a prior, unmodified package to attach a verified screenshot; it refuses arbitrary nonempty output. Runtime folders, dotfiles, local projects/assets, credential filenames, logs, dependencies and upstream mirrors are excluded. Symlinks in included source are rejected. Build release candidates from a clean checkout; filtering is not a secret scanner.

## Extracted directory structure

| Path                                                 | Purpose                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `index.html`                                         | Automatically opens the browser-compatible application                                     |
| `AETHERFORGE.cmd`                                    | Commercial Windows launcher (Commercial package)                                           |
| `START-COMPANION.cmd`                                | Companion Windows launcher (Commercial package)                                            |
| `START-AETHERFORGE.cmd`                              | Companion Windows launcher (Companion package)                                             |
| `START-HERE.md` / `LOCAL-DISTRIBUTION.md`            | First-run and verification instructions                                                    |
| `package.json`                                       | Enables Node ES modules; no installation step                                              |
| `SOURCE-SHA256.json`                                 | Machine-readable payload inventory                                                         |
| `verify-distribution.mjs` / `distribution-files.mjs` | Dependency-free integrity verifier                                                         |
| `apps/aetherforge-commercial/`                       | Commercial UI, assets, and local adapter when included                                     |
| `apps/aetherforge-workbench/`                        | Original Companion UI, assets, and local adapter                                           |
| `apps/aetherforge-corpus/`                           | Complete offline reference collection and its original ZIP                                 |
| `src/`                                               | Maintained library imported by the local adapters                                          |
| `runtime/node.exe`                                   | Optional user-supplied portable Windows runtime; never bundled or downloaded automatically |

## Windows first run without an installer

Extract the entire archive to a user-writable directory. Use an existing Node.js 22+ on PATH, or obtain an approved Windows Node.js binary ZIP and copy its `node.exe` to `runtime/node.exe`. The launcher checks that location first, then PATH. Respect organization restrictions on executing downloaded binaries; the package cannot bypass them. No personal paths or credentials are required.

Open `index.html` for browser mode, or double-click the appropriate `.cmd` file for server mode. The launcher validates Node's major version, reuses a healthy maintained adapter on the application's default port when present, otherwise starts a server console, waits for health, then opens the default browser. Readiness means only that local maintained adapter responded, not that GitHub CI, Docker, cloud credentials or an AI provider are ready. Close the server console to stop a newly started service. Launcher errors remain visible in its command window.

The Windows launchers use the documented default ports: Commercial 4546 and Companion 4545. For a custom port, start the server explicitly in PowerShell:

```powershell
$env:AETHERFORGE_PORT = '4556'
node .\apps\aetherforge-commercial\server.mjs
```

Then open `http://127.0.0.1:4556/`. No Windows service registration is performed. A normal HTML file cannot spawn services, install packages, elevate privileges or execute background programs.

## Browser mode and readiness

The root HTML opens the application automatically. The adapter badge displays a cyan readiness animation while checking, then an explicit connected or offline state. Reduced-motion mode keeps a static indicator. Companion uses classic browser scripts for file-compatible navigation; its canonical Evidence Center module loads only through the local adapter. Offline Companion supports module reference, deterministic guide, appearance settings, navigation, artwork and temporary image previews. Maintained workflows and receipt verification remain server requirements.

Commercial already includes classic offline scripts, browser-local editable projects, the complete reference collection, and Brush/Sustainability reference calculations labeled `offline-compatible-calculator`, `hardwareVerified: false` and `externallyVerified: false`. Imported code is never executed automatically. Server persistence, maintained receipt checking and optional Docker execution require their explicit runtime prerequisites. Browser storage can be unavailable or evicted; export important projects and backups. Direct-file browser permissions vary, particularly around sandboxed frames. No external operation is reported as successful merely because the UI opened.

## Verify download and clean extraction

Before launching, compare the archive checksum in PowerShell (replace the path with your package):

```powershell
Get-FileHash .\commercial.zip -Algorithm SHA256
Get-Content .\commercial.zip.sha256
Expand-Archive .\commercial.zip -DestinationPath .\clean-extraction
Set-Location .\clean-extraction
node .\verify-distribution.mjs
node .\apps\aetherforge-commercial\server.mjs
```

The verifier must report every payload file matches, with no missing, modified or unexpected entries. Run this before first launch; the runtime can create local state that is intentionally absent from the source inventory. In another PowerShell window:

```powershell
Invoke-RestMethod http://127.0.0.1:4546/api/health
Invoke-RestMethod http://127.0.0.1:4546/api/workbench/summary
```

Expect `adapter: ready`, `source: maintained-library`, and a nonempty module catalog. Open `http://127.0.0.1:4546/`, navigate to Workflow Studio and run a Brush calculation. Shut down the console after acceptance. For Companion substitute port 4545 and `apps/aetherforge-workbench/server.mjs`. On Linux/macOS, `unzip package.zip -d clean-extraction` and the same Node commands exercise extraction and adapter startup.

Reproducible distribution regression checks from the checkout:

```sh
node --test tools/distribution-files.test.mjs tools/package-aetherforge-commercial.test.mjs apps/aetherforge-workbench/package-workbench.test.mjs
```

The tests independently extract the generated ZIP, check integrity, start the actual packaged adapters and exercise health, UI assets and workflow calculation. The Windows CI smoke test additionally copies the approved Node executable into a package path with spaces and removes global Node from PATH before starting the adapter. Native `.cmd` execution still requires Windows; source inspection and Linux adapter tests cannot establish it. `apps/aetherforge-workbench/windows-launcher-smoke.ps1` is the existing native Windows acceptance entry point.

## iOS boundary

This ZIP is not an installable iOS application. No signed IPA is supplied. Building one requires a maintained native wrapper, an Apple build/signing environment, certificates/provisioning and device acceptance. Keep any future iOS package separate from these browser/Windows source archives.
