#!/usr/bin/env node
/* 网站数据检查（Node 版）。在仓库根目录运行：
 *
 *     node tools/check.js
 *
 * 除了 tools/validate-core.js 的规则（和浏览器版 check.html 相同），还检查：
 * index.html 引用的文件是否存在；录音文件是否存在、是否为空、是否为 MP3；
 * audio/ 里有没有没被使用的文件；内容完全相同、读音却不同的录音（疑似放错）；
 * 录音和 data/audio-release.json 记录的是否一致（替换录音后会提示）。
 * 有错误时退出码为 1。 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const core = require("./validate-core.js");

const ROOT = path.resolve(__dirname, "..");
const DATA_FILES = ["data/vocab.js", "data/chars.js", "data/grammar.js", "data/grammar-ja.js", "data/grammar-notes.js", "data/grammar-practice.js"];

function loadData(root) {
  const context = { window: {} };
  vm.createContext(context);
  for (const file of DATA_FILES) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return core.collect(context.window);
}

function isMp3(buffer) {
  return buffer.length > 3 && ((buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0));
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const full = path.join(dir, item.name);
    return item.isDirectory() ? walk(full) : [full];
  });
}

function checkFiles(root, data, report) {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const match of html.matchAll(/(?:src|href)="([^"#:]+?)(?:\?[^"]*)?"/g)) {
    if (!fs.existsSync(path.join(root, match[1]))) report.error("文件", "index.html 引用的 " + match[1] + " 不存在。");
  }
  for (const file of DATA_FILES.concat(["tools/validate-core.js"])) {
    if (!html.includes(file) && file.startsWith("data/")) report.error("文件", "index.html 没有加载 " + file + "。");
  }
  if (!Array.isArray(data.vocab)) return;

  const used = new Map();
  for (const entry of data.vocab) {
    if (!entry || typeof entry.audio !== "string") continue;
    const list = used.get(entry.audio) || [];
    list.push(entry);
    used.set(entry.audio, list);
  }
  const hashes = new Map();
  let missing = 0;
  for (const [file, entries] of used) {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) {
      missing += 1;
      if (missing <= 30) report.error("录音", file + " 不存在（" + entries.map((e) => e.id + " " + e.hanzi).join("、") + "）。");
      continue;
    }
    const buffer = fs.readFileSync(full);
    if (!buffer.length) { report.error("录音", file + " 是 0 字节的空文件。"); continue; }
    if (!isMp3(buffer)) report.error("录音", file + " 不是 MP3 文件。");
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const list = hashes.get(hash) || [];
    list.push({ file, entries });
    hashes.set(hash, list);
  }
  if (missing > 30) report.error("录音", "另有 " + (missing - 30) + " 个录音文件不存在。");

  // 不同文件内容完全相同，但朗读内容和读音都对不上：多半是复制错了文件。
  for (const list of hashes.values()) {
    if (list.length < 2) continue;
    if (!core.sameRecordingIsConsistent(list.flatMap((item) => item.entries))) {
      report.warning("录音", "这些文件内容完全相同，但词和读音都不同，请确认：" + list.map((item) => item.file + "（" + item.entries.map((e) => e.hanzi + " " + e.pinyin).join("、") + "）").join("；") + "。");
    }
  }

  const exampleAudio = new Set();
  for (const note of data.grammarNotes || []) {
    for (const pair of (note && note.ex) || []) {
      if (Array.isArray(pair) && typeof pair[3] === "string" && pair[3]) exampleAudio.add(pair[3]);
    }
  }
  for (const item of data.grammarPractice || []) {
    if (item && typeof item.audio === "string" && item.audio) exampleAudio.add(item.audio);
  }
  if (fs.existsSync(path.join(root, "audio/examples"))) {
    for (const file of exampleAudio) {
      const full = path.join(root, file);
      if (!fs.existsSync(full)) { report.error("录音", "例句录音 " + file + " 不存在。"); continue; }
      const buffer = fs.readFileSync(full);
      if (!buffer.length) report.error("录音", "例句录音 " + file + " 是 0 字节的空文件。");
      else if (!isMp3(buffer)) report.error("录音", "例句录音 " + file + " 不是 MP3 文件。");
    }
  }

  // audio/ 里没有被任何词或例句使用的文件，按文件夹合并成一行。
  const unused = new Map();
  for (const full of walk(path.join(root, "audio"))) {
    const rel = path.relative(root, full).split(path.sep).join("/");
    if (!used.has(rel) && !exampleAudio.has(rel)) {
      const folder = path.dirname(rel);
      unused.set(folder, (unused.get(folder) || []).concat(path.basename(rel)));
    }
  }
  for (const [folder, files] of unused) {
    report.warning("录音", folder + " 里有 " + files.length + " 个没被使用的文件：" + files.slice(0, 5).join("、") + (files.length > 5 ? " 等" : "") + "。");
  }

  // 和发布清单比较：替换过录音时提醒更新 js/hsk.js 的 AUDIO_VERSION。
  const releasePath = path.join(root, "data/audio-release.json");
  if (fs.existsSync(releasePath)) {
    const release = JSON.parse(fs.readFileSync(releasePath, "utf8"));
    const recorded = new Map((release.recordings || []).map((r) => [r.path, r.sha256]));
    let changed = 0;
    for (const [hash, list] of hashes) for (const item of list) if (recorded.get(item.file) !== hash) changed += 1;
    if (changed) report.info("录音", changed + " 个录音和 data/audio-release.json（" + release.release + "）记录的不同。如果是有意替换，请修改 js/hsk.js 里的 AUDIO_VERSION，让学生的浏览器重新下载。");
    else report.info("录音", "所有录音都和发布清单 " + release.release + " 一致。");
  }
}

function run(root) {
  const result = { errors: [], warnings: [], info: [] };
  const report = {
    error: (area, message) => result.errors.push({ area, message }),
    warning: (area, message) => result.warnings.push({ area, message }),
    info: (area, message) => result.info.push({ area, message })
  };
  let data;
  try {
    data = loadData(root);
  } catch (error) {
    report.error("文件", "数据文件无法读取：" + error.message);
    return result;
  }
  const checked = core.validate(data);
  result.errors.push(...checked.errors);
  result.warnings.push(...checked.warnings);
  result.info.push(...checked.info);
  checkFiles(root, data, report);
  return result;
}

if (require.main === module) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : ROOT;
  const result = run(root);
  const print = (label, list) => list.forEach((item) => console.log(label + " [" + item.area + "] " + item.message));
  print("错误", result.errors);
  print("请确认", result.warnings);
  print("信息", result.info);
  console.log("\n检查完毕：错误 " + result.errors.length + " 个，需要确认 " + result.warnings.length + " 个。");
  process.exitCode = result.errors.length ? 1 : 0;
}

module.exports = { run, loadData };
