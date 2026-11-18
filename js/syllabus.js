/* Syllabus helpers for characters, grammar and part-of-speech notes.
 * Pure functions, no DOM or storage. Loaded with a plain script tag; attaches
 * window.HSK_SYLLABUS. Works under file:// (no fetch, no modules). */
(function () {
  "use strict";

  var POS_JA = {
    "名": "名詞", "动": "動詞", "形": "形容詞", "副": "副詞", "代": "代詞",
    "数": "数詞", "量": "量詞", "数量": "数量詞", "介": "介詞", "连": "接続詞",
    "助": "助詞", "叹": "感嘆詞", "拟声": "擬声語", "前缀": "接頭辞", "后缀": "接尾辞"
  };
  var READ_KEYS = ["1", "2", "3", "4", "5", "6", "7-9"];
  var WRITE_KEYS = ["1-2", "3", "4", "5", "6", "7-9"];
  var GRAMMAR_KEYS = ["1", "2", "3", "4", "5", "6", "7-9"];

  /* "7-9", 7 or "1-2" -> "7–9" / "1・2" for display. */
  function levelText(level) {
    var value = String(level);
    if (value === "7" || value === "7-9") return "7–9";
    if (value === "1-2") return "1・2";
    return value;
  }

  /* Page level (1–7) -> keys of the character and grammar lists. */
  function listKeys(level) {
    var n = Number(level);
    return {
      read: n === 7 ? "7-9" : String(n),
      write: n <= 2 ? "1-2" : n === 7 ? "7-9" : String(n),
      grammar: n === 7 ? "7-9" : String(n)
    };
  }

  function splitPos(text) {
    var groups = [];
    var base = [];
    var re = /（([^）]*)）|([^、（）]+)/g;
    var match;
    while ((match = re.exec(text || ""))) {
      if (match[1] !== undefined) groups.push(match[1].split("、").filter(Boolean));
      else base.push(match[2]);
    }
    return { base: base, groups: groups };
  }

  /* 词性 with the level each use belongs to. The syllabus writes uses learnt at
   * a later level in parentheses, matched in order with the bracketed levels:
   * level "1（4）" + pos "数、（副）" -> 数 at 1, 副 at 4. */
  function posGroups(entry) {
    var parts = splitPos(entry.pos);
    var levels = String(entry.levelNote || "").match(/（[^）]+）/g) || [];
    var baseLevel = entry.levelNote ? entry.levelNote.split("（")[0] : String(entry.level === 7 ? "7-9" : entry.level);
    var out = [];
    if (parts.base.length) out.push({ level: baseLevel, pos: parts.base });
    parts.groups.forEach(function (group, index) {
      var level = levels[index] ? levels[index].slice(1, -1) : null;
      out.push({ level: level, pos: group });
    });
    return out;
  }

  function posJapanese(pos) { return POS_JA[pos] || pos; }

  /* Every character's place in the lists: { read: {key, n}, write: {key, n} }. */
  function charIndex(chars) {
    var index = new Map();
    function add(kind, keys) {
      keys.forEach(function (key) {
        var list = chars[kind][key];
        if (!list) return;
        Array.from(list.chars).forEach(function (ch, i) {
          var info = index.get(ch) || {};
          info[kind] = { key: key, n: i + 1 };
          index.set(ch, info);
        });
      });
    }
    add("read", READ_KEYS);
    add("write", WRITE_KEYS);
    return index;
  }

  function baseWord(hanzi) { return String(hanzi).replace(/\d+$/, ""); }

  /* Words containing a character, single-character words first, then by level. */
  function wordsWithChar(vocab, ch) {
    return vocab.filter(function (entry) { return baseWord(entry.hanzi).indexOf(ch) !== -1; })
      .sort(function (a, b) {
        var exactA = baseWord(a.hanzi) === ch ? 0 : 1;
        var exactB = baseWord(b.hanzi) === ch ? 0 : 1;
        return exactA - exactB || a.level - b.level || a.id - b.id;
      });
  }

  /* Grammar rows of one level grouped as 类别 > 类别名称 > 细目, in PDF order. */
  function grammarTree(rows) {
    var cats = [];
    rows.forEach(function (row) {
      var cat = cats[cats.length - 1];
      if (!cat || cat.cat !== row.cat) { cat = { cat: row.cat, names: [] }; cats.push(cat); }
      var name = cat.names[cat.names.length - 1];
      if (!name || name.name !== row.name) { name = { name: row.name, items: [] }; cat.names.push(name); }
      var item = name.items[name.items.length - 1];
      if (!item || item.item !== row.item) { item = { item: row.item, rows: [] }; name.items.push(item); }
      item.rows.push(row);
    });
    return cats;
  }

  /* Japanese label for a grammar term; a trailing number (补语1) is kept. */
  function termJapanese(term, dictionary) {
    if (!term || !dictionary) return "";
    var match = /^(.*?)(\d*)$/.exec(term);
    var label = dictionary[match[1]];
    return label ? label + match[2] : "";
  }

  var SUPERSCRIPT = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;

  /* Map from a word (without sense number) to the entry to play, only when every
   * entry written that way has the same pinyin, so the sound is unambiguous. */
  function pronunciationIndex(vocab) {
    var groups = new Map();
    vocab.forEach(function (entry) {
      var key = baseWord(entry.hanzi);
      var list = groups.get(key) || [];
      list.push(entry);
      groups.set(key, list);
    });
    var index = new Map();
    groups.forEach(function (list, key) {
      var readings = new Set(list.map(function (entry) { return entry.pinyin.toLowerCase().replace(/[\s’'-]/g, ""); }));
      if (readings.size === 1) index.set(key, list.slice().sort(function (a, b) { return a.level - b.level || a.id - b.id; })[0]);
    });
    return index;
  }

  /* Split a 词类 grammar cell into text and playable words:
   * "（1）专用名量词：本、个" -> [text "（1）专用名量词：", word 本, text "、", word 个]. */
  function grammarTokens(text, index) {
    var out = [];
    String(text).split("\n").forEach(function (line, lineIndex) {
      if (lineIndex) out.push({ text: "\n" });
      var cut = line.lastIndexOf("：");
      if (cut !== -1) { out.push({ text: line.slice(0, cut + 1) }); line = line.slice(cut + 1); }
      line.split(/([、/])/).forEach(function (part) {
        if (!part) return;
        var entry = part === "、" || part === "/" ? null : index.get(part.replace(SUPERSCRIPT, ""));
        out.push(entry ? { text: part, entry: entry } : { text: part });
      });
    });
    return out;
  }

  window.HSK_SYLLABUS = {
    POS_JA: POS_JA,
    READ_KEYS: READ_KEYS,
    WRITE_KEYS: WRITE_KEYS,
    GRAMMAR_KEYS: GRAMMAR_KEYS,
    levelText: levelText,
    listKeys: listKeys,
    posGroups: posGroups,
    posJapanese: posJapanese,
    charIndex: charIndex,
    baseWord: baseWord,
    wordsWithChar: wordsWithChar,
    grammarTree: grammarTree,
    termJapanese: termJapanese,
    pronunciationIndex: pronunciationIndex,
    grammarTokens: grammarTokens
  };
})();
