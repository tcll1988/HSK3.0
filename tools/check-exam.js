#!/usr/bin/env node
// 模擬試験（exam/）のデータ検査：node tools/check-exam.js [exam フォルダ]
// 解答・選択肢の形式、ページ画像、問題の位置、音声の時間、解説の有無を確かめます。
// エラーがあると終了コード 1。ffprobe があれば音声の長さも確かめます。
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const examDir = path.resolve(process.argv[2] || path.join(root, 'exam'));
const errors = [];
const warnings = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);
const warn = (id, msg) => warnings.push(`${id}: ${msg}`);

function load(files, extra) {
  const context = vm.createContext(Object.assign({ console }, extra || {}));
  // const は vm のグローバルに残らないので、var に直して読み込みます。
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8').replace(/^const /gm, 'var ');
    vm.runInContext(code, context, { filename: file });
  }
  return context;
}

const durations = {};
function durationOf(file) {
  if (file in durations) return durations[file];
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
    durations[file] = Number(String(out).trim());
  } catch {
    durations[file] = null;
  }
  return durations[file];
}

const catalog = load([path.join(examDir, 'catalog.js')]);
const sampleRoot = path.join(examDir, catalog.sampleRoot);
const ids = Object.keys(catalog.paperCatalog);
let questionTotal = 0;

for (const id of ids) {
  const info = catalog.paperCatalog[id];
  const paperFile = path.join(examDir, 'papers', id, 'paper.js');
  if (!fs.existsSync(paperFile)) { err(id, 'papers/' + id + '/paper.js がありません'); continue; }
  for (const rel of [info.pdf, info.answers, ...Object.values(info.media || {})].filter(Boolean)) {
    if (!fs.existsSync(path.join(sampleRoot, rel))) err(id, '原本ファイルがありません: ' + rel);
  }
  let ctx;
  try {
    ctx = load([path.join(examDir, 'levels.js'), paperFile], { paperId: id });
  } catch (e) { err(id, 'データを読み込めません: ' + e.message); continue; }
  const { layout, book } = ctx;
  if (!layout) { err(id, 'levels.js に構成がありません'); continue; }
  const total = layout.scopes.reduce((a, s) => a + s[1], 0);
  questionTotal += total;
  const lastPart = layout.parts[layout.parts.length - 1][0];
  if (lastPart !== total) err(id, `部分の最後の番号 ${lastPart} が問題数 ${total} と合いません`);
  layout.parts.forEach((p, i) => { if (i && p[0] <= layout.parts[i - 1][0]) err(id, `部分の番号が昇順ではありません: ${p[0]}`); });
  if (book.keys.length !== total) err(id, `解答の数 ${book.keys.length} が問題数 ${total} と合いません`);
  if (book.questionPages.length !== total) err(id, `questionPages の数が問題数 ${total} と合いません`);
  const blank = new Set(book.blankPages || []);
  for (let p = 1; p <= book.pages; p++) {
    if (!fs.existsSync(path.join(examDir, 'papers', id, 'pages', p + '.webp'))) err(id, `ページ画像 ${p}.webp がありません`);
  }
  const notes = book.notes || [];
  let missingNotes = 0, missingSources = 0;
  for (let n = 1; n <= total; n++) {
    const type = ctx.partType(n);
    const k = book.keys[n - 1];
    const scope = ctx.scopeOf(n);
    if (/^[A-G]+$/.test(type) || type === '√×〇') {
      if (![...type].includes(k)) err(id, `第${n}問の解答「${k}」が選択肢 ${type} にありません`);
    } else if (type === 'character') {
      if (!/^[一-鿿]$/.test(k)) err(id, `第${n}問の解答は漢字1字にしてください（今は「${k}」）`);
    } else if (type === 'fill') {
      if (!k) err(id, `第${n}問（記述）の参考答案が空です`);
    } else if (!['essay', 'speak'].includes(type)) {
      err(id, `第${n}問の解答形式「${type}」が分かりません`);
    }
    const pages = book.questionPages[n - 1] || [];
    if (!pages.length) err(id, `第${n}問の questionPages が空です`);
    for (const p of pages) {
      if (p < 1 || p > book.pages) err(id, `第${n}問のページ ${p} が範囲外です`);
      if (blank.has(p)) err(id, `第${n}問が白紙ページ ${p} を指しています`);
    }
    const mark = book.marks[n];
    if (!mark) warn(id, `第${n}問の位置（marks）がありません`);
    else if (mark[1] < 0 || mark[1] > 100 || mark[2] < 0 || mark[2] > 100) err(id, `第${n}問の位置が 0〜100% の範囲外です`);
    else if (!pages.includes(mark[0])) warn(id, `第${n}問の位置のページ ${mark[0]} が questionPages にありません`);
    const a = book.audio && book.audio[n];
    if (a) {
      if (!(a[0] >= 0 && a[1] > a[0])) err(id, `第${n}問の音声の時間 ${a[0]}〜${a[1]} が正しくありません`);
      const media = info.media && info.media[a[2] || 'main'];
      if (!media) err(id, `第${n}問の音声ファイル（${a[2] || 'main'}）が catalog.js にありません`);
      else {
        const d = durationOf(path.join(sampleRoot, media));
        if (d && a[1] > d + 1) err(id, `第${n}問の音声の終わり ${a[1]} 秒が録音の長さ ${d.toFixed(1)} 秒を超えています`);
      }
    } else if (scope === 'listen') warn(id, `第${n}問（リスニング）に音声の時間がありません`);
    if (scope === 'listen' && !(book.sources && book.sources[n])) missingSources++;
    const note = notes[n - 1];
    if (!note) missingNotes++;
    else if (!Array.isArray(note) || note.length !== 3 || note.some(x => typeof x !== 'string' || !x.trim())) err(id, `第${n}問の解説は3つの文字列の配列にしてください`);
  }
  if (missingNotes) warn(id, `日本語解説のない問題が ${missingNotes} 問あります`);
  if (missingSources) warn(id, `音声の原文がないリスニング問題が ${missingSources} 問あります`);
}

console.log(`冊子 ${ids.length} 冊・${questionTotal} 問を検査しました。`);
if (warnings.length) { console.log(`\n注意 ${warnings.length} 件`); warnings.forEach(w => console.log('  - ' + w)); }
if (errors.length) { console.log(`\nエラー ${errors.length} 件`); errors.forEach(e => console.log('  ✗ ' + e)); process.exitCode = 1; }
else console.log('\nエラーはありません。');
