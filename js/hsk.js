/* Pure study logic. Loaded with a plain script tag; attaches window.HSK. */
(function () {
  "use strict";

  // Workbook glosses stored 生 (and 市 in 都市 / 市場 / 市民) as "Th", 当 as "ft", and 写 as "ti".

  var MODES = {
    gloss: { prompt: "hanzi", choice: "gloss" },
    hanzi: { prompt: "gloss", choice: "hanzi" },
    pinyin: { prompt: "hanzi", choice: "pinyin" },
    // Hear the recording, choose the word.
    listen: { prompt: "audio", choice: "hanzi" }
  };

  function plainPinyin(text) { return String(text).toLowerCase().replace(/[\s’'\-]/g, ""); }

  /* A word can be asked by ear only when its recording says just that word
   * (吧 is recorded as 「好吧」, so it is not asked). */
  function listenable(entry) { return !!entry.audio && !entry.audioText; }

  function repairGloss(gloss) {
    if (typeof gloss !== "string") {
      throw new TypeError("gloss must be a string");
    }
    return gloss
      .replace(/都Th/g, "都市")
      .replace(/Th場/g, "市場")
      .replace(/Th民/g, "市民")
      .replace(/Th/g, "生")
      .replace(/ft/g, "当")
      .replace(/ti真/g, "写真")
      .replace(/描ti/g, "描写")
      .replace(/書きti/g, "書き写")
      .replace(/複ti/g, "複写");
  }

  function prepareVocab(entries) {
    if (!Array.isArray(entries)) {
      throw new TypeError("vocab must be an array");
    }
    return entries.map(function (entry) {
      var level = Number(entry.level);
      var id = Number(entry.id);
      if (!id) {
        throw new Error("missing id");
      }
      if (level < 1 || level > 7 || level !== Math.floor(level)) {
        throw new Error("bad level on id " + entry.id);
      }
      ["pinyin", "hanzi", "gloss"].forEach(function (key) {
        if (typeof entry[key] !== "string" || entry[key].length === 0) {
          throw new Error("missing " + key + " on id " + entry.id);
        }
      });
      // Phrases and idioms have no 词性 in the syllabus, so pos may be "".
      if (typeof entry.pos !== "string") throw new Error("missing pos on id " + entry.id);
      var prepared = {
        id: id,
        pinyin: entry.pinyin,
        hanzi: entry.hanzi,
        level: level,
        pos: entry.pos,
        gloss: entry.gloss,
        english: typeof entry.english === "string" ? entry.english : ""
      };
      if (typeof entry.audio === "string" && AUDIO_PATH.test(entry.audio)) {
        prepared.audio = entry.audio;
      }
      ["levelNote", "audioText", "audioReading"].forEach(function (key) {
        if (typeof entry[key] === "string" && entry[key].length > 0) prepared[key] = entry[key];
      });
      if (Number.isInteger(entry.page)) prepared.page = entry.page;
      return prepared;
    });
  }

  function wordsForLevel(vocab, level) {
    var n = Number(level);
    return vocab.filter(function (entry) {
      return entry.level === n;
    });
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    var arr = list.slice();
    var i;
    for (i = arr.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /* Three distractors drawn at random from the same level: different from the
   * answer and from each other, and when listening, not pronounced like the
   * answer and not sharing its recording (半/办 are both bàn). Sampling keeps a
   * round of a whole level (5,600 words for 7–9) fast. */
  function buildQuestion(pool, entry, mode, rng) {
    var spec = MODES[mode];
    var correctText = entry[spec.choice];
    var used = new Set([correctText]);
    var sound = plainPinyin(entry.audioReading || entry.pinyin);
    function usable(item) {
      if (item.id === entry.id || used.has(item[spec.choice])) return false;
      return mode !== "listen" || (item.audio !== entry.audio && plainPinyin(item.audioReading || item.pinyin) !== sound);
    }
    var others = [];
    function take(item) { others.push(item); used.add(item[spec.choice]); }
    for (var tries = 0; others.length < 3 && tries < 60; tries += 1) {
      var candidate = pool[Math.floor(rng() * pool.length)];
      if (usable(candidate)) take(candidate);
    }
    if (others.length < 3) {
      shuffle(pool, rng).forEach(function (item) { if (others.length < 3 && usable(item)) take(item); });
    }
    if (others.length < 3) {
      throw new Error("not enough same-level distractors for id " + entry.id);
    }
    var choices = [
      { text: correctText, entryId: entry.id, keyed: true }
    ];
    others.forEach(function (item) {
      choices.push({ text: item[spec.choice], entryId: item.id, keyed: false });
    });
    return {
      mode: mode,
      level: entry.level,
      entryId: entry.id,
      prompt: entry[spec.prompt],
      choices: shuffle(choices, rng)
    };
  }

  /* count: a number of questions or "all" (every word of the level that the mode
   * can ask). entryIds: the words of a review or a 20-word group instead. */
  function buildRound(vocab, level, mode, seed, count, entryIds) {
    if (!MODES[mode]) {
      throw new Error("unknown practice " + mode);
    }
    var pool = wordsForLevel(prepareVocab(vocab), level);
    if (!pool.length) {
      throw new Error("no words for level " + level);
    }
    var eligible = mode === "listen" ? pool.filter(listenable) : pool;
    var rng = mulberry32(Number(seed) || 1);
    var targets;
    if (entryIds != null) {
      if (!Array.isArray(entryIds) || !entryIds.length || new Set(entryIds).size !== entryIds.length) throw new Error("bad review targets");
      targets = entryIds.map(function (id) {
        var entry = pool.find(function (item) { return item.id === id; });
        if (!entry) throw new Error("review target outside level");
        return entry;
      }).filter(function (entry) { return eligible.indexOf(entry) !== -1; });
      // Only words recorded inside an example were given: ask other words instead.
      if (!targets.length) targets = shuffle(eligible, rng).slice(0, Math.min(entryIds.length, eligible.length));
    } else {
      var n = count === "all" ? eligible.length : count == null ? 10 : Number(count);
      if (!Number.isInteger(n) || n < 1) {
        throw new Error("bad round size " + count);
      }
      targets = shuffle(eligible, rng).slice(0, Math.min(n, eligible.length));
    }
    return targets.map(function (entry) {
      return buildQuestion(pool, entry, mode, rng);
    });
  }

  // Recordings live in this site's audio/ folder, so the page also works offline
  // (double-clicking index.html) and on GitHub Pages.
  var AUDIO_PATH = /^audio\/\d{2}\/[^/]+\.mp3$/;

  function audioSrc(entry) {
    if (!entry || typeof entry !== "object" || !entry.audio || !AUDIO_PATH.test(entry.audio)) return null;
    return entry.audio.split("/").map(encodeURIComponent).join("/");
  }

  function scoreChoice(question, choiceIndex) {
    if (!question || !question.choices) {
      return false;
    }
    if (choiceIndex < 0 || choiceIndex >= question.choices.length) {
      return false;
    }
    return question.choices[choiceIndex].keyed === true;
  }

  // Change this when replacing recordings so returning learners hear the
  // current release instead of an MP3 retained in their browser cache.
  // (Only added on a web server; a file:// page reads the files directly.)
  var AUDIO_VERSION = "20261117-approved-voice-v1";
  function audioPlaybackSrc(entry, protocol) {
    var src = audioSrc(entry);
    if (!src) return null;
    var scheme = protocol || (typeof location !== "undefined" ? location.protocol : "");
    return /^https?:$/.test(scheme) ? src + "?v=" + AUDIO_VERSION : src;
  }

  window.HSK = {
    MODES: MODES,
    repairGloss: repairGloss,
    prepareVocab: prepareVocab,
    wordsForLevel: wordsForLevel,
    buildRound: buildRound,
    listenable: listenable,
    plainPinyin: plainPinyin,
    seededRandom: mulberry32,
    shuffle: shuffle,
    audioSrc: audioSrc,
    audioPlaybackSrc: audioPlaybackSrc,
    AUDIO_VERSION: AUDIO_VERSION,
    scoreChoice: scoreChoice
  };
})();
