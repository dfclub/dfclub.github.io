// 生成主官网的更新日志页（log.html）
// 用法：在仓库根目录执行  node tools/build-log.mjs
// 数据来源：git 提交记录 + tools/log-meta.json 里手写的标题与正文
// 说明：在 GitHub 网页上手动提交的改动同样会被收进来；本脚本自己的提交会被跳过，避免死循环。
//      提交说明写成「标题」+ 空行 + 多行详细描述时，详细描述会直接进日志正文。

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(toolsDir);
const git = large => execFileSync('git', large, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

// ---------- 读提交记录 ----------
const SEP = '\x1f';
const REC = '\x1e';
const raw = git([
  'log',
  '--date=format:%Y-%m-%d %H:%M',
  `--pretty=format:%h${SEP}%ad${SEP}%s${SEP}%b${SEP}%an${REC}`
]).trim();
if (!raw) {
  console.error('没有读到提交记录：请在仓库根目录运行本脚本。');
  process.exit(1);
}

// 每条提交以记录分隔符切开：正文本身可以有多行
const commits = raw
  .split(REC)
  .map(block => block.replace(/^\n+/, '').trim())
  .filter(Boolean)
  .map(block => {
    const [hash, date, subject, messageBody, author] = block.split(SEP);
    return { hash, date, subject, messageBody, author };
  });

// 自己生成的日志提交、以及带 [skip log] 的提交，不再写成记录
const SKIP_AUTHORS = new Set(['github-actions[bot]']);
const SKIP_SUBJECT = /^(docs|chore)\s*[:：]\s*(更新日志页|更新日志)/;
const SKIP_TOKEN = '[skip log]';

// 只改了日志页 / 工具 / 工作流的提交，也不占记录
const ONLY_LOG_PATHS = /^(?:log\.html|tools\/|\.github\/)/;

function changedFiles(hash) {
  return git(['show', '--name-only', '--format=', hash])
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

// ---------- 读手写文案 ----------
let meta = {};
try {
  meta = JSON.parse(readFileSync(join(toolsDir, 'log-meta.json'), 'utf8'));
} catch (err) {
  console.warn('没有读到 tools/log-meta.json，标题将全部改用提交说明。');
}

// ---------- 小工具 ----------
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cleanSubject(subject) {
  return subject
    .replace(/^更新官网入口页\s*\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}\s*[：:]?\s*/, '')
    .replace(/^\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2}\s*[：:]?\s*/, '')
    .trim();
}

// 提交说明里的多行正文：每行一段，去掉空行和分隔线
function messageBodyText(body) {
  const lines = String(body || '')
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(s => s && !/^[-—]{2,}$/.test(s));
  return lines.length ? lines.join('\n') : '';
}

function autoBody(hash) {
  const files = changedFiles(hash);
  let add = 0;
  let del = 0;
  for (const line of git(['show', '--numstat', '--format=', hash]).split('\n')) {
    const [a, d] = line.split('\t');
    if (a && a !== '-' ) add += Number(a) || 0;
    if (d && d !== '-' ) del += Number(d) || 0;
  }
  const shown = files.slice(0, 3).join('、');
  const more = files.length > 3 ? ` 等 ${files.length} 个文件` : '';
  return `改动 ${files.length} 个文件（+${add} / −${del} 行）：${shown}${more}。`;
}

// ---------- 逐条生成 ----------
const entries = [];

for (const c of commits) {
  if (SKIP_AUTHORS.has(c.author)) continue;
  if (SKIP_SUBJECT.test(c.subject)) continue;
  if (c.subject.includes(SKIP_TOKEN)) continue;

  const files = changedFiles(c.hash);
  if (files.length && files.every(f => ONLY_LOG_PATHS.test(f))) continue;

  const item = meta[c.hash] || {};
  const title = item.title || cleanSubject(c.subject) || '入口页更新';
  const body = item.body || messageBodyText(c.messageBody) || autoBody(c.hash);

  entries.push({
    hash: c.hash,
    date: c.date,
    title,
    body,
    manual: Boolean(item.manual)
  });
}

if (!entries.length) {
  console.error('没有可写入的记录。');
  process.exit(1);
}

// 按时间倒序（同日按提交先后，后提交的在上）
entries.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));

// ---------- 填模板 ----------
const tpl = readFileSync(join(toolsDir, 'log-template.html'), 'utf8');

const items = entries.map(e => {
  const badge = e.manual ? '\n          <span class="badge">手动提交</span>' : '';
  const iso = e.date.replace(' ', 'T');
  const bodyParts = String(e.body)
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => `<p>${esc(s)}</p>`)
    .join('\n          ');
  return `      <article class="entry">
        <time datetime="${esc(iso)}">${esc(e.date)}</time>
        <div>
          <h2>${esc(e.title)}${badge}</h2>
          ${bodyParts}
          <span class="hash">提交 ${esc(e.hash)}</span>
        </div>
      </article>`;
}).join('\n');

const newest = entries[0].date.slice(0, 10);
const oldest = entries[entries.length - 1].date.slice(0, 10);
const counts = String(entries.length);

const out = tpl
  .replace(/{{ENTRIES}}/g, items)
  .replace(/{{COUNT}}/g, counts)
  .replace(/{{SPAN}}/g, `${oldest} → ${newest}`)
  .replace(/{{UPDATED}}/g, entries[0].date);

writeFileSync(join(repoRoot, 'log.html'), out, 'utf8');
console.log(`已生成 log.html：${entries.length} 条记录，${oldest} → ${newest}`);
