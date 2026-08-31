/*
 * Renders the running project docs (HTML fragments) to PDF using headless
 * Chrome, then copies them to the Cursor artifacts folder for review.
 *
 *   node docs/build-docs.mjs
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(dir, "src");
const outDir = dir;
const artifactsDir = "/opt/cursor/artifacts";

const CHROME =
  ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/opt/google/chrome/chrome"].find(
    (p) => fs.existsSync(p),
  ) || "google-chrome";

const SHARED_CSS = `
  @page { size: A4; margin: 20mm 18mm; }
  :root {
    --ink:#2c2418; --ink-soft:#5c4e3e; --muted:#8f7e6c; --accent:#b55245;
    --paper:#faf5ea; --line:#e4d4bc; --room:#241c18;
  }
  * { box-sizing: border-box; }
  body {
    font-family: "Fraunces", Georgia, "Times New Roman", serif;
    color: var(--ink); background: var(--paper); line-height: 1.5;
    font-size: 11.5pt; margin: 0;
  }
  .cover { background: var(--room); color:#f3e9d8; padding: 34px 30px; border-radius: 14px; margin-bottom: 26px; }
  .cover h1 { font-size: 30pt; margin: 0 0 6px; font-weight: 600; }
  .cover .sub { font-family:"Caveat", cursive; font-size: 18pt; color:#e9d9be; margin:0; }
  .cover .meta { margin-top: 14px; font-size: 10pt; color:#c9b79c; }
  h2 { font-size: 17pt; color: var(--ink); border-bottom: 2px solid var(--accent); padding-bottom: 4px; margin-top: 30px; page-break-after: avoid; }
  h3 { font-size: 13pt; color: var(--accent); margin: 18px 0 4px; page-break-after: avoid; }
  h4 { font-size: 11.5pt; margin: 12px 0 2px; color: var(--ink-soft); }
  p, li { color: var(--ink); }
  .muted { color: var(--muted); }
  ul { margin: 6px 0 6px 0; padding-left: 20px; }
  li { margin: 3px 0; }
  .phase { page-break-inside: avoid; margin-bottom: 8px; }
  .tag { display:inline-block; font-size:8.5pt; letter-spacing:.06em; text-transform:uppercase; background:var(--accent); color:#f6efe4; padding:2px 8px; border-radius:999px; vertical-align:middle; }
  .pill { display:inline-block; font-size:9pt; background:#efe3cf; border:1px solid var(--line); border-radius:999px; padding:1px 8px; margin-right:4px; }
  code { background:#efe3cf; padding:1px 5px; border-radius:4px; font-size:10pt; }
  table { border-collapse: collapse; width:100%; margin:8px 0; font-size:10.5pt; }
  th, td { border:1px solid var(--line); padding:6px 8px; text-align:left; vertical-align:top; }
  th { background:#efe3cf; }
  hr { border:none; border-top:1px solid var(--line); margin:22px 0; }
  .note { background:#fbeee6; border-left:3px solid var(--accent); padding:8px 12px; border-radius:6px; margin:8px 0; }
`;

function build(name, title, subtitle) {
  const bodyPath = path.join(srcDir, `${name}.body.html`);
  if (!fs.existsSync(bodyPath)) {
    console.warn(`skip ${name}: no ${bodyPath}`);
    return;
  }
  const body = fs.readFileSync(bodyPath, "utf8");
  const generated = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap" rel="stylesheet">
<style>${SHARED_CSS}</style><title>${title}</title></head>
<body>
<div class="cover">
  <h1>${title}</h1>
  <p class="sub">${subtitle}</p>
  <p class="meta">Keepsake &middot; generated ${generated}</p>
</div>
${body}
</body></html>`;

  const tmpHtml = path.join(outDir, `.${name}.full.html`);
  fs.writeFileSync(tmpHtml, html);
  const outPdf = path.join(outDir, `${name}.pdf`);
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--no-pdf-header-footer",
      "--virtual-time-budget=4000",
      `--print-to-pdf=${outPdf}`,
      `file://${tmpHtml}`,
    ],
    { stdio: "ignore" },
  );
  fs.rmSync(tmpHtml, { force: true });
  try {
    fs.mkdirSync(artifactsDir, { recursive: true });
    fs.copyFileSync(outPdf, path.join(artifactsDir, `${name}.pdf`));
  } catch {
    /* artifacts dir may not exist outside cloud */
  }
  console.log(`built ${outPdf}`);
}

build("keepsake-worklog", "Keepsake — Build Work Log", "Per-phase summary of work, decisions, and changes");
build("keepsake-suggestions", "Keepsake — Suggestions & Deviations", "Ideas that differ from Design Bible v3, saved for your review");
