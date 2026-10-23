import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appDir, '../..');
const runtimeFiles = [
  'README.md',
  'index.html',
  'app-behavior.js',
  'app-v2.css',
  'app.css',
  'app.js',
  'asset-store.mjs',
  'command-rail.js',
  'evidence-center.js',
  'launch-aetherforge.cmd',
  'server.mjs',
  'workflow-studio-export.js',
  'workflow-studio.js',
  'workspace-memory.js'
];

function readOutputArgument(argv) {
  const index = argv.indexOf('--output');
  if (index < 0 || !argv[index + 1]) {
    throw new Error('Usage: node package-workbench.mjs --output <directory>');
  }
  return argv[index + 1];
}

function assertSafeOutput(outputDir) {
  const relativeOutput = relative(repoRoot, outputDir);
  const relativeRepo = relative(outputDir, repoRoot);
  const overlapsRepo = relativeOutput === '' ||
    (!relativeOutput.startsWith(`..${sep}`) && relativeOutput !== '..' && !isAbsolute(relativeOutput)) ||
    relativeRepo === '' ||
    (!relativeRepo.startsWith(`..${sep}`) && relativeRepo !== '..' && !isAbsolute(relativeRepo));
  if (overlapsRepo) throw new Error('Output directory must be outside the repository.');
}

function rootHtml(hasBrowserPreview) {
  const previewSrc = hasBrowserPreview
    ? './preview.png'
    : './apps/aetherforge-workbench/assets/references/desktop-ui-concept.webp';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#081223">
<meta name="description" content="ÆtherForge Engineering Workbench preview and launch instructions.">
<title>ÆtherForge · Engineering Workbench</title>
<style>
:root{color-scheme:dark;font-family:Inter,Segoe UI,Arial,sans-serif;background:#081223;color:#d9e7ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(ellipse at 76% 0%,#173665 0,transparent 45%),#081223}.wrap{max-width:1100px;margin:0 auto;padding:48px 28px 56px}.brand{display:flex;gap:14px;align-items:center;color:#fff;font-weight:800;letter-spacing:.14em}.brand img{width:48px;height:48px}.brand small{display:block;color:#8ca4ca;font-size:10px;letter-spacing:.18em;margin-top:4px}.hero{display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:center;margin-top:58px}.eyebrow{color:#27d6ff;letter-spacing:.2em;font-size:11px;font-weight:700}.copy h1{font-size:clamp(38px,6vw,70px);line-height:.98;margin:16px 0;color:#fff;letter-spacing:-.04em}.copy h1 span{color:#27d6ff}.copy p{max-width:510px;line-height:1.7;color:#a9bad8}.buttons{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}.button{display:inline-block;border-radius:10px;padding:12px 16px;background:#27d6ff;color:#081223;text-decoration:none;font-weight:750}.button.secondary{border:1px solid #395779;background:#102344;color:#d9e7ff}.preview{border:1px solid #29456c;border-radius:18px;overflow:hidden;background:#0d1e3a;box-shadow:0 28px 80px #0008}.preview img{display:block;width:100%;height:auto}.caption{padding:12px 16px;color:#92a9cc;font-size:12px}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:48px}.step{padding:18px;border:1px solid #203b60;border-radius:12px;background:#0d1e3a}.step b{display:block;color:#fff;margin-bottom:8px}.step p{margin:0;color:#9db1d2;font-size:13px;line-height:1.6}.foot{margin-top:24px;color:#7187a8;font-size:12px;line-height:1.6}@media(max-width:760px){.wrap{padding:28px 18px 40px}.hero{grid-template-columns:1fr;gap:26px;margin-top:40px}.steps{grid-template-columns:1fr}.copy h1{font-size:46px}}
</style>
</head>
<body>
<main class="wrap">
  <div class="brand"><img src="./apps/aetherforge-workbench/assets/aetherforge-emblem.svg" alt=""><div>ÆTHERFORGE<small>ENGINEERING WORKBENCH</small></div></div>
  <section class="hero" aria-labelledby="title">
    <div class="copy"><div class="eyebrow">BUILD · VERIFY · AUTOMATE · EVOLVE</div><h1 id="title">ENGINEER THE<br><span>NEXT POSSIBILITY.</span></h1><p>A visual workbench for exploring maintained engineering modules, planning bounded workflows, reviewing evidence, and understanding what can run locally.</p><div class="buttons"><a class="button" href="#run">Run the interactive workbench</a><a class="button secondary" href="./START-HERE.md">Open setup notes</a></div></div>
    <figure class="preview"><img src="${previewSrc}" alt="ÆtherForge engineering workbench desktop interface preview"><figcaption class="caption">Visual preview · the full interactive workbench runs through the included localhost launcher.</figcaption></figure>
  </section>
  <section class="steps" id="run" aria-label="How to run the application">
    <div class="step"><b>1 · Extract the full ZIP</b><p>Keep the included folders together so the application can reach its maintained source and assets.</p></div>
    <div class="step"><b>2 · Start the local adapter</b><p>On Windows, double-click <code>apps/aetherforge-workbench/launch-aetherforge.cmd</code>. Node.js 22 or newer is required.</p></div>
    <div class="step"><b>3 · Use the workbench</b><p>The launcher opens the complete UI in your browser. Close its server console when you are finished.</p></div>
  </section>
  <p class="foot">The application HTML is at <code>apps/aetherforge-workbench/index.html</code>. This root entry point previews the tested UI. Workflow execution and local asset persistence require the included Node.js server. No deployment, cloud mutation, external network call, or AI provider is enabled by this companion.</p>
</main>
</body>
</html>
`;
}

const startHere = `# ÆtherForge Engineering Workbench

This ZIP includes the visible HTML entry point, the complete workbench UI, its localhost server, shipped artwork, and the maintained source modules it uses.

## Windows

1. Extract the entire ZIP and keep its folder structure intact.
2. Install or use Node.js 22 or newer.
3. Double-click \`apps/aetherforge-workbench/launch-aetherforge.cmd\`.
4. The launcher starts the local adapter and opens the interactive workbench in your browser. Close the server console to stop it.

Open the root \`index.html\` for a visual preview and launch instructions. The application HTML is at \`apps/aetherforge-workbench/index.html\`.

## Other systems

From the extracted folder, run \`node apps/aetherforge-workbench/server.mjs\`, then open <http://127.0.0.1:4545>.

No npm install is needed. The ZIP contains the source files required by the app and a minimal root package manifest that enables Node.js ES modules.
`;

export async function buildWorkbenchPackage(outputPath, { previewPath = null } = {}) {
  if (!outputPath) throw new Error('An output directory is required.');
  const outputDir = resolve(outputPath);
  assertSafeOutput(outputDir);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
  const packageAppDir = join(outputDir, 'apps', 'aetherforge-workbench');
  await mkdir(packageAppDir, { recursive: true });

  for (const file of runtimeFiles) {
    await cp(join(appDir, file), join(packageAppDir, file));
  }
  await cp(join(appDir, 'assets'), join(packageAppDir, 'assets'), { recursive: true });
  await cp(join(repoRoot, 'src'), join(outputDir, 'src'), { recursive: true });

  if (previewPath) await cp(resolve(previewPath), join(outputDir, 'preview.png'));

  await writeFile(join(outputDir, 'index.html'), rootHtml(Boolean(previewPath)), 'utf8');
  await writeFile(join(outputDir, 'START-HERE.md'), startHere, 'utf8');
  await writeFile(join(outputDir, 'package.json'), `${JSON.stringify({
    name: 'aetherforge-workbench-portable',
    private: true,
    type: 'module',
    engines: { node: '>=22' }
  }, null, 2)}\n`, 'utf8');
  return outputDir;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const previewIndex = args.indexOf('--preview');
    const previewPath = previewIndex >= 0 ? args[previewIndex + 1] : null;
    if (previewIndex >= 0 && !previewPath) throw new Error('A preview image path must follow --preview.');
    const outputDir = await buildWorkbenchPackage(readOutputArgument(args), { previewPath });
    process.stdout.write(`ÆtherForge package created at ${outputDir}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
