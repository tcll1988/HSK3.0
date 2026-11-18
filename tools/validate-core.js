/* 数据检查规则（Node 版 tools/check.js 和浏览器版 check.html 共用）。
 * validate({ vocab, chars, grammar, grammarJa, grammarNotes, grammarPractice }) 返回
 *   { errors: [...], warnings: [...], info: [...] }
 * errors 必须修正；warnings 请老师确认；info 只是统计。 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HSK_VALIDATE = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var POS = ["名", "动", "形", "副", "代", "数", "量", "数量", "介", "连", "助", "叹", "拟声", "前缀", "后缀"];
  var LEVEL_NOTE = /^(?:[1-6]|7-9)(?:（(?:[1-6]|7-9)）)+$/;
  var AUDIO_PATH = /^audio\/\d{2}\/[^/]+\.mp3$/;
  var READ_KEYS = ["1", "2", "3", "4", "5", "6", "7-9"];
  var WRITE_KEYS = ["1-2", "3", "4", "5", "6", "7-9"];
  var GRAMMAR_LEVELS = ["1", "2", "3", "4", "5", "6", "7-9"];
  var HAN = /^[㐀-鿿豈-﫿]$|^[\ud840-\ud87f][\udc00-\udfff]$/;

  function baseWord(hanzi) { return String(hanzi).replace(/\d+$/, ""); }
  function plainPinyin(text) { return String(text).toLowerCase().replace(/[\s’'\-]/g, ""); }

  /* Entries may share one recording when they say the same thing: the same
   * spoken text (字 is recorded as 「汉字」, the same as the word 汉字) or the
   * same reading (半/办 bàn). The group is suspicious only when it splits into
   * parts that share neither. */
  function sameRecordingIsConsistent(entries) {
    var spoken = entries.map(function (e) { return e.audioText || baseWord(e.hanzi); });
    var reading = entries.map(function (e) { return plainPinyin(e.audioReading || e.pinyin); });
    var reached = [0];
    var seen = new Set([0]);
    while (reached.length) {
      var i = reached.pop();
      for (var j = 0; j < entries.length; j += 1) {
        if (!seen.has(j) && (spoken[i] === spoken[j] || reading[i] === reading[j])) { seen.add(j); reached.push(j); }
      }
    }
    return seen.size === entries.length;
  }

  function validateVocab(vocab, report) {
    if (!Array.isArray(vocab) || !vocab.length) { report.error("词汇", "data/vocab.js 里没有词汇数据（window.HSK_VOCAB）。"); return; }
    var seen = new Map();
    var perLevel = {};
    vocab.forEach(function (entry, index) {
      var where = "第 " + (index + 1) + " 条" + (entry && entry.id ? "（序号 " + entry.id + "）" : "");
      if (!entry || typeof entry !== "object") { report.error("词汇", where + "不是对象。"); return; }
      if (!Number.isInteger(entry.id) || entry.id < 1) report.error("词汇", where + "：id 必须是正整数。");
      else if (seen.has(entry.id)) report.error("词汇", "序号 " + entry.id + " 重复（" + seen.get(entry.id) + " 和 " + entry.hanzi + "）。");
      else seen.set(entry.id, entry.hanzi);
      ["hanzi", "pinyin", "gloss"].forEach(function (key) {
        if (typeof entry[key] !== "string" || !entry[key].trim()) report.error("词汇", where + "：" + key + " 不能为空。");
      });
      if (typeof entry.english !== "string" || !entry.english.trim()) report.warning("词汇", where + "：缺少英语释义（english）。");
      if (!Number.isInteger(entry.level) || entry.level < 1 || entry.level > 7) report.error("词汇", where + "：level 必须是 1–7（7 表示 7–9 级）。");
      else perLevel[entry.level] = (perLevel[entry.level] || 0) + 1;
      if (typeof entry.pos !== "string") report.error("词汇", where + "：pos 必须是字符串（短语可以是空字符串）。");
      else {
        entry.pos.split(/[、（）]/).filter(Boolean).forEach(function (pos) {
          if (POS.indexOf(pos) === -1) report.warning("词汇", where + "：未知词性「" + pos + "」。");
        });
        var groups = (entry.pos.match(/（[^）]*）/g) || []).length;
        if (entry.levelNote !== undefined) {
          if (!LEVEL_NOTE.test(entry.levelNote)) report.error("词汇", where + "：levelNote「" + entry.levelNote + "」格式不对，应如「1（4）」。");
          else {
            var noteLevel = entry.levelNote.split("（")[0];
            if ((noteLevel === "7-9" ? 7 : Number(noteLevel)) !== entry.level) report.error("词汇", where + "：levelNote 的第一个级别和 level 不一致。");
            if ((entry.levelNote.match(/（/g) || []).length !== groups) report.error("词汇", where + "：levelNote 括号数和词性括号数不一致（" + entry.levelNote + " / " + entry.pos + "）。");
          }
        } else if (groups) report.error("词汇", where + "：词性有括号（" + entry.pos + "），但没有 levelNote。");
      }
      if (typeof entry.audio !== "string" || !AUDIO_PATH.test(entry.audio)) report.error("词汇", where + "：audio 路径应为 audio/两位数字/文件名.mp3。");
    });
    var differs = vocab.filter(function (entry) { return entry && entry.pdfPinyin; });
    if (differs.length) report.info("词汇", "拼音没有采用 PDF 写法的词（pdfPinyin 为 PDF 原文）：" + differs.map(function (entry) { return entry.hanzi + " " + entry.pinyin + "（PDF " + entry.pdfPinyin + "）"; }).join("、") + "。");
    var ids = Array.from(seen.keys()).sort(function (a, b) { return a - b; });
    if (ids.length && (ids[0] !== 1 || ids[ids.length - 1] !== ids.length)) report.warning("词汇", "序号不是从 1 连续到 " + ids.length + "。");
    report.info("词汇", "共 " + vocab.length + " 条：" + [1, 2, 3, 4, 5, 6, 7].map(function (n) { return (n === 7 ? "7–9" : n) + "级 " + (perLevel[n] || 0); }).join("，") + "。");

    // 同一个录音文件被读音不同的词共用，多半是对错了录音。
    var byFile = new Map();
    vocab.forEach(function (entry) {
      if (!entry || typeof entry.audio !== "string") return;
      var list = byFile.get(entry.audio) || [];
      list.push(entry);
      byFile.set(entry.audio, list);
    });
    byFile.forEach(function (list, file) {
      if (!sameRecordingIsConsistent(list)) report.warning("录音", file + " 被读音和录音内容都不同的词共用：" + list.map(function (entry) { return entry.id + " " + entry.hanzi + " " + entry.pinyin; }).join("、") + "。");
    });
    report.info("录音", "词汇引用了 " + byFile.size + " 个录音文件。");
  }

  function validateChars(chars, vocab, report) {
    if (!chars || typeof chars !== "object" || !chars.read || !chars.write) { report.error("汉字", "data/chars.js 里没有汉字数据（window.HSK_CHARS）。"); return; }
    var readOwner = new Map();
    [["read", READ_KEYS, "认读字"], ["write", WRITE_KEYS, "书写字"]].forEach(function (part) {
      part[1].forEach(function (key) {
        var list = chars[part[0]][key];
        if (!list || typeof list.chars !== "string") { report.error("汉字", part[2] + " " + key + " 级的列表缺失。"); return; }
        var items = Array.from(list.chars);
        var seen = new Set();
        items.forEach(function (ch, i) {
          if (!HAN.test(ch)) report.error("汉字", part[2] + " " + key + " 级第 " + (i + 1) + " 个「" + ch + "」不是汉字。");
          if (seen.has(ch)) report.error("汉字", part[2] + " " + key + " 级里「" + ch + "」重复。");
          seen.add(ch);
          if (part[0] === "read") {
            if (readOwner.has(ch) && readOwner.get(ch) !== key) report.error("汉字", "「" + ch + "」同时出现在认读字 " + readOwner.get(ch) + " 级和 " + key + " 级。");
            readOwner.set(ch, key);
          }
        });
        if (!Array.isArray(list.pages) || list.pages.length !== 2) report.warning("汉字", part[2] + " " + key + " 级缺少页码 pages。");
        report.info("汉字", part[2] + " " + key + " 级 " + items.length + " 字。");
      });
    });
    WRITE_KEYS.forEach(function (key) {
      var list = chars.write[key];
      if (!list) return;
      Array.from(list.chars).forEach(function (ch) {
        if (!readOwner.has(ch)) report.warning("汉字", "书写字「" + ch + "」（" + key + " 级）不在任何认读字表里。");
      });
    });
    if (Array.isArray(vocab)) {
      var text = vocab.map(function (entry) { return entry && entry.hanzi ? baseWord(entry.hanzi) : ""; }).join("|");
      readOwner.forEach(function (key, ch) {
        if (text.indexOf(ch) === -1) report.warning("汉字", "认读字「" + ch + "」（" + key + " 级）在词汇表里找不到使用它的词。");
      });
    }
  }

  function validateGrammar(grammar, grammarJa, report) {
    if (!Array.isArray(grammar) || !grammar.length) { report.error("语法", "data/grammar.js 里没有语法数据（window.HSK_GRAMMAR）。"); return; }
    var perLevel = {};
    var untranslated = new Set();
    grammar.forEach(function (row, index) {
      var where = "第 " + (index + 1) + " 行";
      if (!row || typeof row !== "object") { report.error("语法", where + "不是对象。"); return; }
      if (GRAMMAR_LEVELS.indexOf(row.level) === -1) report.error("语法", where + "：level「" + row.level + "」应为 1–6 或 7-9。");
      else perLevel[row.level] = (perLevel[row.level] || 0) + 1;
      if (!Number.isInteger(row.page)) report.warning("语法", where + "：缺少页码 page。");
      ["cat", "name", "item", "text"].forEach(function (key) {
        if (typeof row[key] !== "string") report.error("语法", where + "：" + key + " 必须是字符串（可以是空字符串）。");
      });
      if (!row.cat) report.error("语法", where + "：类别（cat）不能为空。");
      if (!row.item && !row.text) report.warning("语法", where + "：细目和语法内容都是空的。");
      if (grammarJa) [row.cat, row.name, row.item].forEach(function (term) {
        if (term && !grammarJa[String(term).replace(/\d+$/, "")]) untranslated.add(term);
      });
    });
    report.info("语法", GRAMMAR_LEVELS.map(function (level) { return (level === "7-9" ? "7–9" : level) + "级 " + (perLevel[level] || 0); }).join("，") + "，共 " + grammar.length + " 行。");
    if (untranslated.size) report.info("语法", "没有日语参考译名的用语（只显示中文）：" + Array.from(untranslated).join("、") + "。");
  }

  /* data/grammar-practice.js: fill-in questions written for the site (not from the PDF). */
  function validateGrammarPractice(items, grammar, report) {
    if (items === undefined) return;
    if (!Array.isArray(items)) { report.error("语法练习", "data/grammar-practice.js 里的 window.HSK_GRAMMAR_PRACTICE 应该是数组。"); return; }
    var seen = new Set();
    var perLevel = {};
    items.forEach(function (item, index) {
      var where = "第 " + (index + 1) + " 题" + (item && item.id ? "（" + item.id + "）" : "");
      if (!item || typeof item !== "object") { report.error("语法练习", where + "不是对象。"); return; }
      if (typeof item.id !== "string" || !item.id) report.error("语法练习", where + "：缺少 id。");
      else if (seen.has(item.id)) report.error("语法练习", "题号 " + item.id + " 重复。");
      else seen.add(item.id);
      if (GRAMMAR_LEVELS.indexOf(item.level) === -1) report.error("语法练习", where + "：level「" + item.level + "」应为 1–6 或 7-9。");
      else perLevel[item.level] = (perLevel[item.level] || 0) + 1;
      if (typeof item.q !== "string" || item.q.split("（　）").length !== 2) report.error("语法练习", where + "：题目 q 里必须正好有一个填空处「（　）」（全角括号＋全角空格）。");
      var choicesOk = Array.isArray(item.choices) && item.choices.length === 4 && new Set(item.choices).size === 4 &&
        item.choices.every(function (choice) { return typeof choice === "string" && choice.trim(); });
      if (!choicesOk) report.error("语法练习", where + "：choices 必须是 4 个不重复、不为空的选项。");
      else if (item.choices.indexOf(item.answer) === -1) report.error("语法练习", where + "：答案「" + item.answer + "」不在选项里。");
      if (typeof item.ja !== "string" || !item.ja.trim()) report.warning("语法练习", where + "：缺少日语翻译 ja。");
      if (typeof item.note !== "string" || !item.note.trim()) report.warning("语法练习", where + "：缺少解说 note。");
      if (Array.isArray(grammar)) {
        var rows = grammar.filter(function (row) { return row && row.level === item.level && row.cat === item.cat && row.name === item.name && row.item === item.item; });
        if (!rows.length) report.error("语法练习", where + "：对应的语法项目（" + [item.cat, item.name, item.item].filter(Boolean).join(" › ") + "）在该级的 data/grammar.js 里找不到。");
        else if (item.pattern && !rows.some(function (row) { return row.text === item.pattern; })) report.warning("语法练习", where + "：pattern「" + item.pattern + "」和 data/grammar.js 的语法内容对不上。");
      }
    });
    report.info("语法练习", GRAMMAR_LEVELS.map(function (level) { return (level === "7-9" ? "7–9" : level) + "级 " + (perLevel[level] || 0); }).join("，") + "，共 " + items.length + " 题（例句是为本网站编写的，请老师审核）。");
  }

  /* data/grammar-notes.js: a Japanese explanation and examples per syllabus row,
   * written for the site. A note is shown only while its text still matches the
   * row with the same id (ids count the rows, so inserting a row shifts them). */
  function validateGrammarNotes(notes, grammar, report) {
    if (notes === undefined) return;
    if (!Array.isArray(notes)) { report.error("语法讲解", "data/grammar-notes.js 里的 window.HSK_GRAMMAR_NOTES 应该是数组。"); return; }
    var rows = new Map();
    if (Array.isArray(grammar)) grammar.forEach(function (row) { if (row && typeof row.id === "string") rows.set(row.id, row); });
    var seen = new Set();
    var examples = 0;
    notes.forEach(function (note, index) {
      var where = "第 " + (index + 1) + " 条" + (note && note.id ? "（" + note.id + "）" : "");
      if (!note || typeof note !== "object") { report.error("语法讲解", where + "不是对象。"); return; }
      if (typeof note.id !== "string" || !note.id) { report.error("语法讲解", where + "：缺少 id。"); return; }
      if (seen.has(note.id)) report.error("语法讲解", "id " + note.id + " 重复。");
      seen.add(note.id);
      var row = rows.get(note.id);
      if (Array.isArray(grammar) && !row) report.error("语法讲解", where + "：data/grammar.js 里没有这个 id。");
      else if (row && note.text !== row.text) report.warning("语法讲解", where + "：text「" + note.text + "」和 data/grammar.js 的语法内容「" + row.text + "」不一致，网站不会显示这条讲解。请确认 id 是否错位。");
      if (typeof note.ja !== "string" || !note.ja.trim()) report.warning("语法讲解", where + "：缺少日语讲解 ja。");
      var exOk = Array.isArray(note.ex) && note.ex.every(function (pair) {
        return Array.isArray(pair) && pair.length === 2 && pair.every(function (text) { return typeof text === "string" && text.trim(); });
      });
      if (!exOk) report.error("语法讲解", where + "：ex 必须是 [[中文例句, 日语翻译], ...] 的形式，两项都不能为空。");
      else if (!note.ex.length) report.warning("语法讲解", where + "：没有例句。");
      else examples += note.ex.length;
    });
    var missing = Array.from(rows.keys()).filter(function (id) { return !seen.has(id); });
    if (missing.length) report.warning("语法讲解", "这些语法行还没有讲解：" + missing.slice(0, 20).join("、") + (missing.length > 20 ? " 等 " + missing.length + " 行" : "") + "。");
    report.info("语法讲解", "共 " + notes.length + " 条讲解、" + examples + " 个例句（讲解和例句是为本网站编写的，请老师审核）。");
  }

  function validate(data) {
    var result = { errors: [], warnings: [], info: [] };
    var report = {
      error: function (area, message) { result.errors.push({ area: area, message: message }); },
      warning: function (area, message) { result.warnings.push({ area: area, message: message }); },
      info: function (area, message) { result.info.push({ area: area, message: message }); }
    };
    validateVocab(data.vocab, report);
    validateChars(data.chars, data.vocab, report);
    validateGrammar(data.grammar, data.grammarJa, report);
    validateGrammarPractice(data.grammarPractice, data.grammar, report);
    validateGrammarNotes(data.grammarNotes, data.grammar, report);
    return result;
  }

  /* 把 index.html 里按顺序加载的数据文件读进一个对象（Node 和测试用）。 */
  function collect(win) {
    return { vocab: win.HSK_VOCAB, chars: win.HSK_CHARS, grammar: win.HSK_GRAMMAR, grammarJa: win.HSK_GRAMMAR_JA, grammarNotes: win.HSK_GRAMMAR_NOTES, grammarPractice: win.HSK_GRAMMAR_PRACTICE };
  }

  return { validate: validate, collect: collect, sameRecordingIsConsistent: sameRecordingIsConsistent, AUDIO_PATH: AUDIO_PATH };
});
