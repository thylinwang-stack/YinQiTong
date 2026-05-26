#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, '../design-qa.config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

const root = resolve(process.cwd());
const brandDir = resolve(root, process.argv[2] || config.defaultBrandDir);
const report = {
  pass: [],
  warn: [],
  fail: [],
};

function rel(path) {
  return relative(root, path) || '.';
}

function pass(message) {
  report.pass.push(message);
}

function warn(message) {
  report.warn.push(message);
}

function fail(message) {
  report.fail.push(message);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseNumberAttr(markup, attrName) {
  const match = markup.match(new RegExp(`${attrName}="([^"]+)"`));
  return match ? Number(match[1]) : Number.NaN;
}

function parseSideLinePath(markup) {
  const match = markup.match(/id="side-line"[^>]*\sd="M([-\d.]+)\s+([-\d.]+)V([-\d.]+)"/);
  if (!match) return null;
  return {
    x: Number(match[1]),
    y1: Number(match[2]),
    y2: Number(match[3]),
    raw: `M${match[1]} ${match[2]}V${match[3]}`,
  };
}

function within(actual, expected, tolerance) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function runXmllint(path) {
  const result = spawnSync('xmllint', ['--noout', path], {
    encoding: 'utf8',
  });
  if (result.error && result.error.code === 'ENOENT') {
    warn('xmllint is not installed; skipped XML syntax validation.');
    return;
  }
  if (result.status === 0) {
    pass(`SVG syntax valid: ${rel(path)}`);
  } else {
    fail(`SVG syntax invalid: ${rel(path)} ${result.stderr.trim()}`);
  }
}

function checkRequiredFiles() {
  for (const file of config.requiredFiles) {
    const path = join(brandDir, file);
    if (existsSync(path)) pass(`Required file exists: ${rel(path)}`);
    else fail(`Missing required file: ${rel(path)}`);
  }
}

function checkTemporaryFiles(files) {
  for (const path of files) {
    const name = rel(path);
    const hit = config.forbiddenTemporaryPatterns.find((pattern) => name.includes(pattern));
    if (hit) fail(`Temporary artifact found: ${name} matches "${hit}"`);
  }
  pass('No forbidden temporary artifacts found.');
}

function checkTextRules(files) {
  const textFiles = files.filter((path) => /\.(md|html|svg|txt|json)$/i.test(path));
  const allText = textFiles.map((path) => `${rel(path)}\n${read(path)}`).join('\n\n');

  for (const pattern of config.forbiddenSloganPatterns) {
    if (allText.includes(pattern)) {
      fail(`Forbidden slogan punctuation found: ${pattern}`);
    }
  }

  const sloganHits = textFiles.filter((path) => read(path).includes(config.requiredSlogan));
  if (sloganHits.length > 0) {
    pass(`Required slogan found in ${sloganHits.length} file(s): ${config.requiredSlogan}`);
  } else {
    fail(`Required slogan not found: ${config.requiredSlogan}`);
  }

  for (const word of config.forbiddenPublicWords) {
    const regex = new RegExp(escapeRegExp(word), 'g');
    const hits = textFiles.filter((path) => regex.test(read(path)));
    if (hits.length > 0) {
      warn(`Public-boundary word "${word}" appears in ${hits.map(rel).join(', ')}. Verify it is documentation/context only.`);
    }
  }
}

function checkSvgStructure(path) {
  const svg = read(path);

  for (const id of config.svgChecks.requiredIds) {
    if (svg.includes(`id="${id}"`)) pass(`${rel(path)} contains #${id}`);
    else fail(`${rel(path)} missing #${id}`);
  }

  const line = parseSideLinePath(svg);
  if (!line) {
    fail(`${rel(path)} side-line path is missing or unparsable.`);
  } else {
    const expectedLine = parseSideLinePath(`<path id="side-line" d="${config.svgChecks.sideLine.expectedPath}"/>`);
    const tolerance = config.svgChecks.sideLine.tolerance;
    if (
      within(line.x, expectedLine.x, tolerance) &&
      within(line.y1, expectedLine.y1, tolerance) &&
      within(line.y2, expectedLine.y2, tolerance)
    ) {
      pass(`${rel(path)} side-line matches optical spec: ${line.raw}`);
    } else {
      fail(`${rel(path)} side-line ${line.raw} differs from expected ${config.svgChecks.sideLine.expectedPath}`);
    }
  }

  const sloganMatch = svg.match(/id="brand-slogan"[^>]*>/);
  if (!sloganMatch) {
    fail(`${rel(path)} missing brand-slogan element.`);
    return;
  }

  const sloganMarkup = sloganMatch[0];
  const x = parseNumberAttr(sloganMarkup, 'x');
  const textLength = parseNumberAttr(sloganMarkup, 'textLength');
  const tolerance = config.svgChecks.slogan.tolerance;

  if (within(x, config.svgChecks.slogan.expectedX, tolerance)) {
    pass(`${rel(path)} slogan x matches optical spec: ${x}`);
  } else {
    fail(`${rel(path)} slogan x ${x} differs from expected ${config.svgChecks.slogan.expectedX}`);
  }

  if (within(textLength, config.svgChecks.slogan.expectedTextLength, tolerance)) {
    pass(`${rel(path)} slogan textLength matches optical spec: ${textLength}`);
  } else {
    fail(`${rel(path)} slogan textLength ${textLength} differs from expected ${config.svgChecks.slogan.expectedTextLength}`);
  }
}

function checkGitState() {
  const result = spawnSync('git', ['status', '--short', '--', rel(brandDir)], {
    cwd: root,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    warn('Git status check skipped; current directory may not be a Git worktree.');
    return;
  }

  const output = result.stdout.trim();
  if (output) {
    warn(`Brand files have uncommitted changes. This is expected before final approval:\n${output}`);
  } else {
    pass('No uncommitted brand changes in current worktree.');
  }
}

function main() {
  console.log(`Brand Design QA: ${config.brandName}`);
  console.log(`Brand dir: ${rel(brandDir)}`);
  console.log('');

  if (!existsSync(brandDir)) {
    fail(`Brand directory does not exist: ${rel(brandDir)}`);
  } else {
    const files = walk(brandDir);
    checkRequiredFiles();
    checkTemporaryFiles(files);
    checkTextRules(files);

    for (const svgName of ['logo-primary-dark.svg', 'logo-horizontal-light.svg']) {
      const path = join(brandDir, svgName);
      if (existsSync(path)) {
        runXmllint(path);
        checkSvgStructure(path);
      }
    }

    checkGitState();
  }

  for (const message of report.pass) console.log(`PASS ${message}`);
  for (const message of report.warn) console.log(`WARN ${message}`);
  for (const message of report.fail) console.log(`FAIL ${message}`);

  console.log('');
  console.log(`Summary: ${report.pass.length} passed, ${report.warn.length} warning(s), ${report.fail.length} failed.`);

  if (report.fail.length > 0) process.exit(1);
}

main();
