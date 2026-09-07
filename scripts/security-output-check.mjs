import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.join(root, "out");
const expectedPages = new Map([
  ["carte-virtuelle-afrique", "https://drava.click/carte-virtuelle-afrique/"],
  ["carte-visa-virtuelle-afrique", "https://drava.click/carte-visa-virtuelle-afrique/"],
  ["carte-mastercard-virtuelle-afrique", "https://drava.click/carte-mastercard-virtuelle-afrique/"],
  ["pieces-tiktok-afrique", "https://drava.click/pieces-tiktok-afrique/"],
  ["carte-virtuelle-cameroun", "https://drava.click/carte-virtuelle-cameroun/"],
  ["carte-visa-virtuelle-cameroun", "https://drava.click/carte-visa-virtuelle-cameroun/"],
  ["carte-mastercard-virtuelle-cameroun", "https://drava.click/carte-mastercard-virtuelle-cameroun/"],
  ["pieces-tiktok-cameroun", "https://drava.click/pieces-tiktok-cameroun/"],
]);

const stagingRoot = await mkdtemp(path.join(tmpdir(), "drava-seo-output-"));
const moved = [];
const failures = [];

function validateSeoHtml(html, slug, canonical) {
  if (!/^<!doctype html>/i.test(html.trimStart())) failures.push(`${slug}: missing HTML doctype`);
  if (!/<html\s+lang="fr"/i.test(html)) failures.push(`${slug}: missing French language declaration`);
  if (!html.includes(`<link rel="canonical" href="${canonical}">`)) failures.push(`${slug}: canonical URL is missing or incorrect`);
  if (!/<meta name="robots" content="index,follow,[^"]+">/i.test(html)) failures.push(`${slug}: index/follow robots directive is missing`);
  if ((html.match(/<h1\b/gi)?.length ?? 0) !== 1) failures.push(`${slug}: must contain exactly one H1`);
  if (!/<meta name="description" content="[^"]{50,}">/i.test(html)) failures.push(`${slug}: meaningful meta description is missing`);
  if (/<(?:form|input|textarea|select|iframe)\b/i.test(html)) failures.push(`${slug}: interactive data-collection or frame element is forbidden`);
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/i.test(html) || /javascript:/i.test(html)) failures.push(`${slug}: browser network or script URL is forbidden`);
  if (/\bsrc="https?:\/\//i.test(html)) failures.push(`${slug}: external runtime asset is forbidden`);

  for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
    const href = match[1];
    if (!(href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:"))) {
      failures.push(`${slug}: external anchor is forbidden (${href})`);
    }
  }

  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  if (scripts.length !== 2) failures.push(`${slug}: must contain exactly theme-init and JSON-LD scripts`);
  for (const [, attrs, body] of scripts) {
    const src = attrs.match(/\bsrc="([^"]+)"/i)?.[1];
    const type = attrs.match(/\btype="([^"]+)"/i)?.[1];
    if (src) {
      if (src !== "/theme-init.js" || body.trim()) failures.push(`${slug}: only the reviewed theme-init script is allowed`);
      continue;
    }
    if (type !== "application/ld+json") {
      failures.push(`${slug}: inline executable script is forbidden`);
      continue;
    }
    try {
      JSON.parse(body.trim());
    } catch {
      failures.push(`${slug}: JSON-LD must be valid JSON`);
    }
  }
}

try {
  for (const slug of expectedPages.keys()) {
    const from = path.join(outputRoot, slug);
    const to = path.join(stagingRoot, slug);
    await rename(from, to);
    moved.push({ from, to });
  }

  const core = spawnSync(process.execPath, ["scripts/security-check.mjs", "--output"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (core.stdout) process.stdout.write(core.stdout);
  if (core.stderr) process.stderr.write(core.stderr);
  if (core.status !== 0) failures.push("Core production security scan failed");

  for (const [slug, canonical] of expectedPages) {
    const stagedPath = path.join(stagingRoot, slug, "index.html");
    const sourcePath = path.join(root, "public", slug, "index.html");
    const [html, source] = await Promise.all([
      readFile(stagedPath, "utf8"),
      readFile(sourcePath, "utf8"),
    ]);
    if (html !== source) failures.push(`${slug}: exported page differs from reviewed public source`);
    validateSeoHtml(html, slug, canonical);
  }

  const [robots, sitemap] = await Promise.all([
    readFile(path.join(outputRoot, "robots.txt"), "utf8"),
    readFile(path.join(outputRoot, "sitemap.xml"), "utf8"),
  ]);
  if (!robots.includes("Sitemap: https://drava.click/sitemap.xml") || !robots.includes("Allow: /")) {
    failures.push("robots.txt must allow crawling and advertise the DRAVA sitemap");
  }
  const requiredUrls = ["https://drava.click/", ...expectedPages.values()];
  for (const url of requiredUrls) {
    if (!sitemap.includes(`<loc>${url}</loc>`)) failures.push(`sitemap.xml is missing ${url}`);
  }
} finally {
  for (const { from, to } of moved.reverse()) {
    await rename(to, from).catch(() => {});
  }
  await rm(stagingRoot, { recursive: true, force: true });
}

if (failures.length) {
  console.error("SEO production safeguards failed:");
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SEO production safeguards passed (${expectedPages.size} exact indexable guides validated).`);
