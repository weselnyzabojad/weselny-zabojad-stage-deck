#!/usr/bin/env node
// Create one GitHub issue per UI item in docs/ui-improvements-plan.md.
//
// Usage:
//   node scripts/create-ui-improvement-issues.mjs --dry-run
//   node scripts/create-ui-improvement-issues.mjs
//   node scripts/create-ui-improvement-issues.mjs --update
//
// Requires the GitHub CLI (`gh`) to be installed and authenticated with
// permission to open issues in this repository.
//
// The script is idempotent: an issue whose title starts with `UI-NN:` is
// skipped unless `--update` is passed, in which case its title/body/labels are
// refreshed.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const planPath = resolve(here, '..', 'docs', 'ui-improvements-plan.md');

const LABELS = {
  'UI-01': ['ui', 'frontend', 'auth'],
  'UI-02': ['ui', 'frontend'],
  'UI-03': ['ui', 'frontend'],
  'UI-04': ['ui', 'frontend', 'auth'],
  'UI-05': ['ui', 'frontend', 'auth'],
  'UI-06': ['ui', 'frontend'],
  'UI-07': ['ui', 'frontend'],
  'UI-08': ['ui', 'frontend', 'auth'],
  'UI-09': ['ui', 'frontend', 'i18n'],
  'UI-10': ['ui', 'frontend', 'accessibility'],
};

const DRY_RUN = process.argv.includes('--dry-run');
const UPDATE = process.argv.includes('--update');

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function parsePlan(text) {
  const heading = /^## (UI-\d{2}) — (.+)$/gm;
  const matches = [...text.matchAll(heading)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? text.length;
    const section = text
      .slice(start, end)
      .split(/\n---\s*\n/)[0]
      .trim();
    return { id: match[1], title: match[2].trim(), section };
  });
}

function repoSlug() {
  try {
    const url = run('git', ['remote', 'get-url', 'origin']).trim();
    const match = /github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/.exec(url);
    return match ? `${match[1]}/${match[2]}` : null;
  } catch {
    return null;
  }
}

function issueBody(item, repo) {
  const planUrl = repo
    ? `https://github.com/${repo}/blob/master/docs/ui-improvements-plan.md`
    : 'docs/ui-improvements-plan.md';
  return [
    `> UI improvement from the 10-item implementation script. Baseline: \`master\` @ \`1ad2448\`.`,
    '',
    item.section,
    '',
    '---',
    `Source: [\`docs/ui-improvements-plan.md\`](${planUrl}) · ${item.id}`,
  ].join('\n');
}

function issueTitle(item) {
  return `${item.id}: ${item.title}`;
}

function ghIssueList(repo) {
  const args = ['issue', 'list', '--state', 'all', '--limit', '300', '--json', 'number,title,url'];
  if (repo) args.push('--repo', repo);
  return JSON.parse(run('gh', args));
}

function ghCreate(repo, item) {
  const args = [
    'issue',
    'create',
    '--title',
    issueTitle(item),
    '--body',
    issueBody(item, repo),
  ];
  for (const label of LABELS[item.id] ?? ['ui']) args.push('--label', label);
  if (repo) args.push('--repo', repo);
  return run('gh', args).trim();
}

function ghUpdate(repo, number, item) {
  const args = [
    'issue',
    'edit',
    String(number),
    '--title',
    issueTitle(item),
    '--body',
    issueBody(item, repo),
  ];
  for (const label of LABELS[item.id] ?? ['ui']) args.push('--add-label', label);
  if (repo) args.push('--repo', repo);
  return run('gh', args).trim();
}

function main() {
  const plan = readFileSync(planPath, 'utf8');
  const items = parsePlan(plan);
  if (items.length === 0) throw new Error(`No UI-XX sections found in ${planPath}`);

  const repo = repoSlug();
  console.log(`Plan: ${planPath}`);
  console.log(`Repository: ${repo ?? '(gh default from cwd)'}`);
  console.log(`Items: ${items.length}${DRY_RUN ? ' (dry run)' : ''}`);

  if (DRY_RUN) {
    for (const item of items) {
      console.log(`\n--- ${issueTitle(item)}`);
      console.log(`labels: ${(LABELS[item.id] ?? ['ui']).join(', ')}`);
      console.log(issueBody(item, repo));
    }
    return;
  }

  try {
    run('gh', ['auth', 'status']);
  } catch {
    throw new Error('GitHub CLI is not authenticated. Run `gh auth login` first.');
  }

  const existing = ghIssueList(repo);
  const created = [];
  const updated = [];
  const skipped = [];

  for (const item of items) {
    const found = existing.find((issue) => issue.title.startsWith(`${item.id}:`));
    if (found) {
      if (!UPDATE) {
        skipped.push(`${item.id} (#${found.number})`);
        continue;
      }
      const url = ghUpdate(repo, found.number, item) || found.url;
      updated.push(`${item.id} (#${found.number})`);
      console.log(`updated ${item.id}: ${url}`);
      continue;
    }

    const url = ghCreate(repo, item);
    created.push(`${item.id} (${url})`);
    console.log(`created ${item.id}: ${url}`);
  }

  console.log('\nSummary');
  console.log(`  created: ${created.length}`);
  console.log(`  updated: ${updated.length}`);
  console.log(`  skipped: ${skipped.length}`);
  for (const line of created) console.log(`  + ${line}`);
  for (const line of updated) console.log(`  ~ ${line}`);
  for (const line of skipped) console.log(`  = ${line}`);
}

try {
  main();
} catch (error) {
  console.error(`\n✗ ${error.message}`);
  process.exit(1);
}
