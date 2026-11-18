/* 漢字 and 文法 views. Built by app.js with HSK_VIEWS.create(context); uses
 * window.HSK_CHARS, HSK_GRAMMAR, HSK_GRAMMAR_JA and HSK_SYLLABUS. */
(function () {
  "use strict";

  function create(ctx) {
    var S = window.HSK_SYLLABUS;
    var el = ctx.el;
    var chars = window.HSK_CHARS;
    var grammar = window.HSK_GRAMMAR;
    var practice = window.HSK_GRAMMAR_PRACTICE || [];
    var terms = window.HSK_GRAMMAR_JA || {};
    var charIndex = S.charIndex(chars);
    var playable = S.pronunciationIndex(ctx.vocab);
    var kanjiKind = {};      // level -> "read" | "write"
    var kanjiFilter = {};    // level -> "all" | "new" | "learned"
    var grammarQuery = "";
    var grammarScope = "current";
    var WORD_LIMIT = 24;

    function levelLabel(key) { return "HSK " + S.levelText(key); }

    function heading(eyebrow, title, count, unit) {
      var head = el("div", "list-heading");
      var copy = el("div");
      copy.appendChild(el("p", "eyebrow", eyebrow));
      copy.appendChild(el("h2", null, title));
      head.appendChild(copy);
      var badge = el("p", "meta count-badge");
      badge.appendChild(el("span", null, count.toLocaleString("ja-JP")));
      badge.appendChild(document.createTextNode(" " + unit));
      head.appendChild(badge);
      return head;
    }

    function pagesText(pages) {
      return pages[0] === pages[1] ? "p." + pages[0] : "p." + pages[0] + "–" + pages[1];
    }

    function learnedSet(kind) {
      var store = ctx.progress().kanji;
      return store[kind];
    }

    function isLearned(kind, ch) { return learnedSet(kind).indexOf(ch) !== -1; }

    function toggleLearned(kind, ch) {
      var list = learnedSet(kind);
      var index = list.indexOf(ch);
      if (index === -1) list.push(ch); else list.splice(index, 1);
      ctx.saveProgress();
      return index === -1;
    }

    /* ---------- 漢字 ---------- */

    function renderKanji(level) {
      var keys = S.listKeys(level);
      var kind = kanjiKind[level] || "read";
      var panel = el("section", "panel kanji");
      panel.setAttribute("data-kanji-panel", "");
      var body = el("div", "kanji-body");
      var dialog = renderKanjiDialog();
      var repaint = null;   // redraws the grid only (the dialog stays open)

      function draw() {
        ctx.stopAudio();
        var key = kind === "read" ? keys.read : keys.write;
        var list = chars[kind][key];
        var all = Array.from(list.chars);
        body.textContent = "";
        panel.replaceChildren(heading("漢字を学ぶ", "HSK " + S.levelText(level), all.length, "字"), body, dialog.node);

        var tabs = el("div", "kanji-tabs");
        tabs.setAttribute("role", "group");
        tabs.setAttribute("aria-label", "漢字の種類");
        [["read", "読める字", "認読字 · " + Array.from(chars.read[keys.read].chars).length + " 字"],
          ["write", "書ける字", "書写字 · " + Array.from(chars.write[keys.write].chars).length + " 字" + (keys.write === "1-2" ? "（1・2級）" : "")]].forEach(function (item) {
          var button = el("button", "kanji-tab");
          button.type = "button";
          button.setAttribute("data-kanji-kind", item[0]);
          button.setAttribute("aria-pressed", item[0] === kind ? "true" : "false");
          button.appendChild(el("strong", null, item[1]));
          button.appendChild(el("span", null, item[2]));
          button.addEventListener("click", function () {
            if (kind === item[0]) return;
            kind = kanjiKind[level] = item[0];
            draw();
          });
          tabs.appendChild(button);
        });
        body.appendChild(tabs);

        var note = el("p", "kanji-note", kind === "read"
          ? "読める字（認読字）は、見て読みと意味が分かればよい字です。字をタップすると、その字を使う単語と音声を確認できます。"
          : "書ける字（書写字）は、手で書けるようにする字です。" + (keys.write === "1-2" ? "1級と2級の書写字は、大綱では一つの表になっています。" : ""));
        body.appendChild(note);
        body.appendChild(el("p", "kanji-source", "出典：新版HSK考試大綱「漢字大綱」" + levelLabel(key) + (kind === "read" ? " 認読字" : " 書写字") + "（" + pagesText(list.pages) + "）"));

        body.appendChild(renderLookup());

        var tools = el("div", "kanji-tools");
        var count = el("p", "kanji-progress");
        count.setAttribute("role", "status");
        tools.appendChild(count);
        var filterLabel = el("label", "kanji-filter");
        filterLabel.appendChild(el("span", null, "表示"));
        var filter = el("select");
        filter.setAttribute("data-kanji-filter", "");
        [["all", "すべて"], ["new", "まだ覚えていない字"], ["learned", "覚えた字"]].forEach(function (item) {
          var option = el("option", null, item[1]);
          option.value = item[0];
          filter.appendChild(option);
        });
        filter.value = kanjiFilter[level] || "all";
        filterLabel.appendChild(filter);
        tools.appendChild(filterLabel);
        body.appendChild(tools);

        var grid = el("ul", "kanji-grid");
        grid.setAttribute("aria-label", (kind === "read" ? "認読字" : "書写字") + "の一覧");
        body.appendChild(grid);
        var empty = el("p", "kanji-empty");
        body.appendChild(empty);

        function paint() {
          var mode = filter.value;
          kanjiFilter[level] = mode;
          var learnedCount = all.filter(function (ch) { return isLearned(kind, ch); }).length;
          count.textContent = "覚えた字 " + learnedCount + " / " + all.length;
          var fragment = document.createDocumentFragment();
          all.forEach(function (ch, i) {
            var learned = isLearned(kind, ch);
            if ((mode === "new" && learned) || (mode === "learned" && !learned)) return;
            var item = el("li");
            var cell = el("button", "kanji-cell" + (learned ? " is-learned" : ""));
            cell.type = "button";
            cell.setAttribute("data-kanji", ch);
            cell.setAttribute("aria-label", ch + (learned ? "（覚えた）" : "") + " を詳しく見る");
            var glyph = el("span", "kanji-glyph", ch);
            glyph.lang = "zh-CN";
            cell.appendChild(glyph);
            cell.appendChild(el("span", "kanji-number", String(i + 1)));
            cell.addEventListener("click", function () {
              dialog.open(ch, kind, {
                changed: paint,
                closed: function () { var again = grid.querySelector('[data-kanji="' + ch + '"]'); if (again) again.focus(); }
              });
            });
            item.appendChild(cell);
            fragment.appendChild(item);
          });
          grid.replaceChildren(fragment);
          empty.hidden = grid.children.length > 0;
          empty.textContent = mode === "learned" ? "まだ「覚えた」にした字はありません。" : "この一覧の字はすべて覚えました！";
        }
        filter.addEventListener("change", paint);
        repaint = paint;
        paint();
      }

      function renderLookup() {
        var box = el("div", "kanji-lookup");
        var label = el("label", "kanji-lookup-field");
        label.appendChild(el("span", null, "何級の字か調べる"));
        var input = el("input", "search");
        input.type = "search";
        input.autocomplete = "off";
        input.spellcheck = false;
        input.placeholder = "漢字を入力（例：爱）";
        input.setAttribute("data-kanji-lookup", "");
        label.appendChild(input);
        box.appendChild(label);
        var result = el("ul", "kanji-lookup-result");
        result.setAttribute("role", "status");
        box.appendChild(result);
        input.addEventListener("input", function () {
          var seen = new Set();
          var items = Array.from(input.value.replace(/[\s\u0000-ɏ]/g, "")).filter(function (ch) {
            if (seen.has(ch)) return false;
            seen.add(ch);
            return true;
          }).slice(0, 8);
          result.textContent = "";
          items.forEach(function (ch) {
            var info = charIndex.get(ch);
            var row = el("li");
            var glyph = el("strong", null, ch);
            glyph.lang = "zh-CN";
            row.appendChild(glyph);
            row.appendChild(el("span", null, info ? describe(info) : "大綱の漢字表にはありません"));
            if (info) {
              var more = el("button", "secondary-button", "詳しく");
              more.type = "button";
              more.addEventListener("click", function () {
                dialog.open(ch, info.read ? "read" : "write", { changed: function () { if (repaint) repaint(); } });
              });
              row.appendChild(more);
            }
            result.appendChild(row);
          });
        });
        return box;
      }

      draw();
      return panel;
    }

    function describe(info) {
      var parts = [];
      parts.push(info.read ? "認読字 " + levelLabel(info.read.key) + "（No." + info.read.n + "）" : "認読字ではありません");
      parts.push(info.write ? "書写字 " + levelLabel(info.write.key) + "（No." + info.write.n + "）" : "書写字ではありません");
      return parts.join(" · ");
    }

    function renderKanjiDialog() {
      var node = el("dialog", "kanji-dialog");
      node.setAttribute("aria-labelledby", "kanji-dialog-title");
      var hooks = {};
      node.addEventListener("close", function () {
        ctx.stopAudio();
        var closed = hooks.closed;
        hooks = {};
        if (closed) closed();
      });
      node.addEventListener("click", function (event) {
        if (event.target === node) node.close();   // backdrop
      });

      /* hooks.changed runs after a 覚えた toggle, hooks.closed when the dialog closes. */
      function open(ch, kind, callbacks) {
        ctx.stopAudio();
        hooks = callbacks || {};
        var info = charIndex.get(ch) || {};
        node.textContent = "";
        var head = el("div", "kanji-dialog-head");
        var glyph = el("span", "kanji-big", ch);
        glyph.lang = "zh-CN";
        glyph.id = "kanji-dialog-title";
        head.appendChild(glyph);
        var facts = el("div", "kanji-facts");
        facts.appendChild(el("p", null, info.read ? "認読字：" + levelLabel(info.read.key) + "（No." + info.read.n + "）" : "認読字：大綱の表にはありません"));
        facts.appendChild(el("p", null, info.write ? "書写字：" + levelLabel(info.write.key) + "（No." + info.write.n + "）" : "書写字：対象外（読めればよい字）"));
        head.appendChild(facts);
        var close = el("button", "dialog-close", "×");
        close.type = "button";
        close.setAttribute("aria-label", "閉じる");
        close.setAttribute("data-dialog-close", "");
        close.addEventListener("click", function () { node.close(); });
        head.appendChild(close);
        node.appendChild(head);

        var marks = el("div", "kanji-marks");
        [["read", "読める"], ["write", "書ける"]].forEach(function (item) {
          if (!info[item[0]]) return;
          var button = el("button", "kanji-mark");
          button.type = "button";
          button.setAttribute("data-kanji-learned", item[0]);
          function label() {
            var on = isLearned(item[0], ch);
            button.setAttribute("aria-pressed", on ? "true" : "false");
            button.textContent = (on ? "✓ " : "○ ") + item[1] + "字として覚えた";
          }
          label();
          button.addEventListener("click", function () {
            toggleLearned(item[0], ch);
            label();
            if (hooks.changed) hooks.changed();
          });
          marks.appendChild(button);
        });
        node.appendChild(marks);

        var words = S.wordsWithChar(ctx.vocab, ch);
        node.appendChild(el("h3", "kanji-words-title", "この字を使う単語 · " + words.length + " 語"));
        var list = el("ul", "kanji-words");
        node.appendChild(list);
        var more = el("button", "secondary-button kanji-more");
        more.type = "button";
        node.appendChild(more);
        var shown = 0;
        function addWords() {
          words.slice(shown, shown + WORD_LIMIT).forEach(function (entry) { list.appendChild(wordRow(entry, ch)); });
          shown = Math.min(words.length, shown + WORD_LIMIT);
          more.hidden = shown >= words.length;
          more.textContent = "さらに表示（残り " + (words.length - shown) + " 語）";
          ctx.markButtons();
        }
        more.addEventListener("click", addWords);
        addWords();
        if (!words.length) list.appendChild(el("li", "kanji-word-empty", "この字を使う単語は大綱の語彙表にありません。"));
        if (!node.open) node.showModal();
        close.focus();
      }

      return { node: node, open: open };
    }

    function wordRow(entry, ch) {
      var row = el("li", "kanji-word");
      var text = el("div", "kanji-word-text");
      var title = el("div", "kanji-word-title");
      var hanzi = el("span", "hanzi");
      hanzi.lang = "zh-CN";
      Array.from(S.baseWord(entry.hanzi)).forEach(function (part) {
        hanzi.appendChild(part === ch ? el("mark", null, part) : document.createTextNode(part));
      });
      title.appendChild(hanzi);
      title.appendChild(el("span", "word-level", "HSK " + S.levelText(entry.level)));
      text.appendChild(title);
      text.appendChild(el("span", "pinyin", entry.pinyin));
      text.appendChild(el("span", "gloss", entry.gloss));
      var note = ctx.audioNote(entry);
      if (note) text.appendChild(el("span", "audio-note", note));
      row.appendChild(text);
      row.appendChild(ctx.listenButton(entry));
      ctx.makeAudioTarget(row, entry);
      return row;
    }

    /* ---------- 文法 ---------- */

    function normalize(text) {
      return String(text).toLowerCase().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, function (d) { return "⁰¹²³⁴⁵⁶⁷⁸⁹".indexOf(d); }).replace(/\s+/g, "");
    }

    function term(zh, className) {
      var box = el("span", className);
      var chinese = el("span", "term-zh", zh);
      chinese.lang = "zh-CN";
      box.appendChild(chinese);
      var ja = S.termJapanese(zh, terms);
      if (ja) box.appendChild(el("span", "term-ja", ja));
      return box;
    }

    function grammarText(row) {
      var box = el("p", "grammar-text");
      box.lang = "zh-CN";
      if (!row.text) {
        box.classList.add("is-empty");
        box.lang = "ja";
        box.textContent = "（大綱では内容の記載なし）";
        return box;
      }
      var tokens = row.cat === "词类" ? S.grammarTokens(row.text, playable) : [{ text: row.text }];
      tokens.forEach(function (token) {
        if (token.entry) {
          var button = el("button", "grammar-word", token.text);
          button.type = "button";
          button.lang = "zh-CN";
          button.setAttribute("data-audio", token.text);
          button.setAttribute("data-audio-id", String(token.entry.id));
          button.setAttribute("aria-pressed", "false");
          button.setAttribute("aria-label", token.text + " を聞く（" + token.entry.pinyin + "）");
          button.title = token.entry.pinyin + (token.entry.audioText ? " · 音声の例：" + token.entry.audioText : "");
          button.addEventListener("click", function () { ctx.playEntry(token.entry); });
          box.appendChild(button);
          return;
        }
        token.text.split("\n").forEach(function (part, i) {
          if (i) box.appendChild(el("br"));
          if (part) box.appendChild(document.createTextNode(part));
        });
      });
      return box;
    }

    function renderTree(rows) {
      var wrap = el("div", "grammar-tree");
      S.grammarTree(rows).forEach(function (cat) {
        var section = el("section", "grammar-cat");
        var h3 = el("h3");
        h3.appendChild(term(cat.cat, "grammar-term"));
        section.appendChild(h3);
        cat.names.forEach(function (name) {
          var group = el("div", "grammar-group");
          if (name.name) {
            var h4 = el("h4");
            h4.appendChild(term(name.name, "grammar-term"));
            group.appendChild(h4);
          }
          var list = el("dl", "grammar-items");
          name.items.forEach(function (item) {
            var dt = el("dt");
            if (item.item) dt.appendChild(term(item.item, "grammar-term"));
            else dt.classList.add("is-blank");
            list.appendChild(dt);
            var dd = el("dd");
            item.rows.forEach(function (row) {
              var line = el("div", "grammar-row");
              line.setAttribute("data-grammar-row", "");
              line.appendChild(grammarText(row));
              dd.appendChild(line);
            });
            list.appendChild(dd);
          });
          group.appendChild(list);
          section.appendChild(group);
        });
        wrap.appendChild(section);
      });
      return wrap;
    }

    /* 文法: two tabs, the syllabus items (項目を見る) and fill-in practice (練習する). */
    function renderGrammar(level) {
      var key = S.listKeys(level).grammar;
      var rows = grammar.filter(function (row) { return row.level === key; });
      var questions = practice.filter(function (item) { return item.level === key; });
      var store = ctx.progress().grammar;
      var panel = el("section", "panel grammar");
      panel.setAttribute("data-grammar-panel", "");

      function draw() {
        ctx.stopAudio();
        var tab = store.tab === "practice" && questions.length ? "practice" : "list";
        var tabs = el("div", "kanji-tabs grammar-tabs");
        tabs.setAttribute("role", "group");
        tabs.setAttribute("aria-label", "文法の学び方");
        [["list", "項目を見る", "語法大綱 · " + rows.length + " 項目"], ["practice", "練習する", "（　）に入る語を選ぶ · " + questions.length + " 問"]].forEach(function (item) {
          var button = el("button", "kanji-tab");
          button.type = "button";
          button.setAttribute("data-grammar-tab", item[0]);
          button.setAttribute("aria-pressed", item[0] === tab ? "true" : "false");
          button.disabled = item[0] === "practice" && !questions.length;
          button.appendChild(el("strong", null, item[1]));
          button.appendChild(el("span", null, item[2]));
          button.addEventListener("click", function () {
            if (item[0] === tab) return;
            store.tab = item[0];
            ctx.saveProgress();
            draw();
          });
          tabs.appendChild(button);
        });
        panel.replaceChildren(
          heading("文法を学ぶ", "HSK " + S.levelText(level), tab === "practice" ? questions.length : rows.length, tab === "practice" ? "問" : "項目"),
          tabs,
          tab === "practice" ? renderGrammarPractice(level, key, questions) : renderGrammarList(level, key, rows));
      }

      draw();
      return panel;
    }

    function renderGrammarList(level, key, rows) {
      var pages = rows.map(function (row) { return row.page; });
      var panel = el("div", "grammar-list");
      panel.appendChild(el("p", "grammar-note", "新版HSK考試大綱「語法大綱」の項目です。中国語の用語の横の日本語は参考訳です。下線のある語はタップで音声を聞けます。"));
      panel.appendChild(el("p", "kanji-source", "出典：" + levelLabel(key) + " 語法（" + pagesText([Math.min.apply(null, pages), Math.max.apply(null, pages)]) + "）"));

      var tools = el("div", "grammar-tools");
      var searchWrap = el("div", "search-wrap");
      var search = el("input", "search");
      search.type = "search";
      search.autocomplete = "off";
      search.spellcheck = false;
      search.placeholder = "文法を探す（例：把、比較、补语）";
      search.setAttribute("aria-label", "文法項目を探す");
      search.setAttribute("data-grammar-search", "");
      search.value = grammarQuery;
      searchWrap.appendChild(search);
      tools.appendChild(searchWrap);
      var scopeLabel = el("label", "grammar-scope");
      scopeLabel.appendChild(el("span", null, "範囲"));
      var scope = el("select");
      scope.setAttribute("data-grammar-scope", "");
      [["current", "この級"], ["all", "すべての級"]].forEach(function (item) {
        var option = el("option", null, item[1]);
        option.value = item[0];
        scope.appendChild(option);
      });
      scope.value = grammarScope;
      scopeLabel.appendChild(scope);
      tools.appendChild(scopeLabel);
      panel.appendChild(tools);

      var status = el("p", "search-status");
      status.setAttribute("role", "status");
      panel.appendChild(status);
      var toc = el("nav", "grammar-toc");
      toc.setAttribute("aria-label", "文法の分類");
      panel.appendChild(toc);
      var content = el("div", "grammar-content");
      panel.appendChild(content);

      function matches(row, needle) {
        return normalize([row.cat, row.name, row.item, row.text,
          S.termJapanese(row.cat, terms), S.termJapanese(row.name, terms), S.termJapanese(row.item, terms)].join(" ")).indexOf(needle) !== -1;
      }

      function draw() {
        ctx.stopAudio();
        grammarQuery = search.value;
        grammarScope = scope.value;
        var needle = normalize(search.value.trim());
        content.textContent = "";
        toc.textContent = "";
        if (!needle) {
          status.textContent = "";
          toc.hidden = false;
          var cats = S.grammarTree(rows);
          var tree = renderTree(rows);
          Array.prototype.forEach.call(tree.children, function (section, index) {
            section.id = "grammar-cat-" + index;
            var link = el("a", "grammar-chip");
            link.href = "#" + section.id;
            var label = S.termJapanese(cats[index].cat, terms);
            link.textContent = label ? label.replace(/（.*）/, "") : cats[index].cat;
            link.addEventListener("click", function (event) {
              event.preventDefault();
              section.scrollIntoView({ block: "start", behavior: "smooth" });
            });
            toc.appendChild(link);
          });
          content.appendChild(tree);
          ctx.markButtons();
          return;
        }
        toc.hidden = true;
        var pool = scope.value === "all" ? grammar : rows;
        var found = pool.filter(function (row) { return matches(row, needle); });
        status.textContent = found.length + " 項目が見つかりました / " + (scope.value === "all" ? "全級" : "HSK " + S.levelText(level));
        if (!found.length) {
          var empty = el("div", "empty-state");
          empty.appendChild(el("strong", null, "見つかりませんでした"));
          empty.appendChild(el("p", null, "中国語の用語（例：补语）や日本語（例：補語）でも探せます。"));
          content.appendChild(empty);
          return;
        }
        if (scope.value === "all") {
          S.GRAMMAR_KEYS.forEach(function (levelKey) {
            var part = found.filter(function (row) { return row.level === levelKey; });
            if (!part.length) return;
            content.appendChild(el("h3", "grammar-level-heading", levelLabel(levelKey) + " · " + part.length + " 項目"));
            content.appendChild(renderTree(part));
          });
        } else content.appendChild(renderTree(found));
        ctx.markButtons();
      }

      search.addEventListener("input", draw);
      scope.addEventListener("change", draw);
      draw();
      return panel;
    }

    /* ---------- 文法練習 ---------- */

    var CHEERS = ["正解！", "その調子！", "よくできました！", "すばらしい！", "完璧です！", "いい感じです！"];
    var lastCheer = -1;
    function cheer() {
      var index = Math.floor(Math.random() * (CHEERS.length - 1));
      if (index >= lastCheer && lastCheer !== -1) index += 1;   // never the same twice in a row
      lastCheer = index;
      return CHEERS[index];
    }

    function hashText(text) {
      var hash = 0;
      for (var i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
      return hash;
    }

    /* Choices of one question in an order that stays the same within a session. */
    function choiceOrder(item, session) {
      return window.HSK.shuffle(item.choices, window.HSK.seededRandom((session.seed + hashText(item.id)) >>> 0 || 1));
    }

    /* The sentence with its blank, or with a word put into the blank. */
    function sentence(item, filled, className) {
      var box = el("p", className || "grammar-sentence");
      box.lang = "zh-CN";
      var parts = item.q.split("（　）");
      box.appendChild(document.createTextNode(parts[0]));
      var blank = el("span", "grammar-blank" + (filled ? " is-filled" : ""), filled || "（　）");
      if (!filled) blank.setAttribute("aria-label", "空欄");
      box.appendChild(blank);
      box.appendChild(document.createTextNode(parts.slice(1).join("（　）")));
      return box;
    }

    function pointLabel(item) {
      var box = el("p", "grammar-point");
      box.appendChild(el("span", "grammar-point-label", "大綱の項目："));
      [item.cat, item.name, item.item].filter(Boolean).forEach(function (part, index) {
        if (index) box.appendChild(document.createTextNode(" › "));
        box.appendChild(term(part, "grammar-term"));
      });
      var pattern = el("span", "grammar-point-pattern", item.pattern);
      pattern.lang = "zh-CN";
      box.appendChild(pattern);
      return box;
    }

    function renderGrammarPractice(level, key, questions) {
      var store = ctx.progress().grammar;
      var byId = new Map(questions.map(function (item) { return [item.id, item]; }));
      var wrap = el("div", "grammar-practice practice");
      wrap.setAttribute("data-grammar-practice", "");

      function newSession(ids, all) {
        var seed = Math.floor(Math.random() * 0x7fffffff) + 1;
        var order = window.HSK.shuffle(ids, window.HSK.seededRandom(seed));
        var size = all || store.count === "all" ? order.length : Math.min(10, order.length);
        store.sessions[key] = { seed: seed, ids: order.slice(0, size), picks: {}, index: 0 };
        ctx.saveProgress();
        return store.sessions[key];
      }

      function current() {
        var session = store.sessions[key];
        if (session) session.ids = session.ids.filter(function (id) { return byId.has(id); });   // questions deleted from the data
        if (!session || !session.ids.length) session = newSession(questions.map(function (item) { return item.id; }));
        session.index = Math.min(session.index, session.ids.length);
        return session;
      }

      function isRight(session, id) { return session.picks[id] === byId.get(id).answer; }

      function countLabel(value) {
        return value === "all" ? "全部（" + questions.length + "問）" : Math.min(10, questions.length) + "問";
      }

      function renderCount(onChange) {
        var label = el("label", "count-field");
        label.appendChild(el("span", null, "問題数"));
        var select = el("select");
        select.setAttribute("data-grammar-count", "");
        [10, "all"].forEach(function (value) {
          var option = el("option", null, countLabel(value));
          option.value = String(value);
          select.appendChild(option);
        });
        select.value = String(store.count);
        select.addEventListener("change", function () {
          store.count = select.value === "all" ? "all" : 10;
          ctx.saveProgress();
          onChange();
        });
        label.appendChild(select);
        return label;
      }

      /* Starting over loses this round's answers, so it takes a second press. */
      function restartButton(className) {
        var button = el("button", className || "secondary-button");
        button.type = "button";
        button.setAttribute("data-grammar-restart", "");
        var armed = false;
        var timer = null;
        function label() {
          button.textContent = armed ? "もう一度押すと、新しく" + countLabel(store.count) + "を始めます" : "新しく" + countLabel(store.count) + "を始める";
          button.classList.toggle("is-armed", armed);
        }
        button.addEventListener("click", function () {
          var session = store.sessions[key];
          var started = session && Object.keys(session.picks).length && session.index < session.ids.length;
          if (started && !armed) {
            armed = true;
            label();
            clearTimeout(timer);
            timer = setTimeout(function () { armed = false; label(); }, 5000);
            return;
          }
          clearTimeout(timer);
          newSession(questions.map(function (item) { return item.id; }));
          draw(true);
        });
        label();
        button.relabel = label;
        return button;
      }

      function draw(focus) {
        ctx.stopAudio();
        var session = current();
        wrap.textContent = "";
        if (session.index >= session.ids.length) renderSummary(session);
        else renderQuestion(session);
        if (focus) {
          var target = wrap.querySelector(".grammar-sentence, .grammar-summary h3");
          if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
          wrap.scrollIntoView({ block: "start", behavior: "instant" });
        }
      }

      function renderQuestion(session) {
        var id = session.ids[session.index];
        var item = byId.get(id);
        var answeredCount = session.ids.filter(function (qid) { return session.picks[qid] !== undefined; }).length;
        var rightCount = session.ids.filter(function (qid) { return session.picks[qid] !== undefined && isRight(session, qid); }).length;
        var head = el("div", "practice-head");
        head.appendChild(el("h3", null, "文法練習"));
        var score = el("p", "meta score", "正解 " + rightCount + " / " + session.ids.length);
        head.appendChild(score);
        wrap.appendChild(head);
        wrap.appendChild(el("p", "practice-instruction", "（　）に入ることばを選びましょう。"));
        wrap.appendChild(el("p", "progress-label", "第 " + (session.index + 1) + " 問 / " + session.ids.length));
        var track = el("div", "progress-track");
        track.setAttribute("role", "progressbar");
        track.setAttribute("aria-label", "回答済みの問題数");
        track.setAttribute("aria-valuemin", "0");
        track.setAttribute("aria-valuemax", String(session.ids.length));
        track.setAttribute("aria-valuenow", String(answeredCount));
        var fill = el("span", "progress-fill");
        fill.style.width = (answeredCount / session.ids.length * 100) + "%";
        track.appendChild(fill);
        wrap.appendChild(track);

        var card = el("div", "grammar-question");
        card.setAttribute("data-grammar-item", id);
        var text = sentence(item);
        card.appendChild(text);
        wrap.appendChild(card);

        var choices = el("div", "choices");
        choiceOrder(item, session).forEach(function (choice) {
          var button = el("button", "choice", choice);
          button.type = "button";
          button.lang = "zh-CN";
          button.setAttribute("data-grammar-choice", choice);
          button.addEventListener("click", function () {
            if (session.picks[id] !== undefined) return;
            session.picks[id] = choice;
            ctx.saveProgress();
            paint(true);
            next.focus({ preventScroll: true });
          });
          choices.appendChild(button);
        });
        wrap.appendChild(choices);

        var feedback = el("p", "feedback");
        feedback.setAttribute("data-grammar-feedback", "");
        feedback.setAttribute("aria-live", "polite");
        wrap.appendChild(feedback);
        var explain = el("div", "grammar-explain");
        explain.hidden = true;
        wrap.appendChild(explain);

        var bar = el("div", "practice-bar");
        var next = el("button", "next", session.index + 1 < session.ids.length ? "次の問題" : "結果を見る");
        next.type = "button";
        next.setAttribute("data-grammar-next", "");
        next.addEventListener("click", function () {
          if (session.picks[id] === undefined) return;
          session.index += 1;
          ctx.saveProgress();
          draw(true);
        });
        bar.appendChild(next);
        wrap.appendChild(bar);

        var actions = el("div", "practice-actions");
        var restart = restartButton();
        actions.appendChild(renderCount(restart.relabel));
        actions.appendChild(restart);
        wrap.appendChild(actions);

        function paint(fresh) {
          var pick = session.picks[id];
          var done = pick !== undefined;
          var right = done && pick === item.answer;
          Array.prototype.forEach.call(choices.children, function (button) {
            var value = button.getAttribute("data-grammar-choice");
            button.disabled = done;
            button.classList.toggle("is-right", done && value === item.answer);
            button.classList.toggle("is-wrong", done && !right && value === pick);
          });
          next.disabled = !done;
          text.replaceWith(text = sentence(item, done ? item.answer : null));
          feedback.textContent = done ? (right ? (fresh ? cheer() : "正解") : "不正解") : "";
          if (done) feedback.setAttribute("data-result", right ? "right" : "wrong");
          else feedback.removeAttribute("data-result");
          explain.textContent = "";
          explain.hidden = !done;
          if (done) {
            if (!right) explain.appendChild(el("p", "answer-explanation", "正しい答え：" + item.answer));
            explain.appendChild(el("p", "grammar-ja", "訳：" + item.ja));
            explain.appendChild(el("p", "grammar-note-text", "ポイント：" + item.note));
            explain.appendChild(pointLabel(item));
            var redo = el("button", "secondary-button", "この問題をやり直す");
            redo.type = "button";
            redo.setAttribute("data-grammar-redo", "");
            redo.addEventListener("click", function () {
              delete session.picks[id];
              ctx.saveProgress();
              paint(false);
              var first = choices.querySelector("button");
              if (first) first.focus();
            });
            explain.appendChild(redo);
          }
          var answered = session.ids.filter(function (qid) { return session.picks[qid] !== undefined; });
          score.textContent = "正解 " + answered.filter(function (qid) { return isRight(session, qid); }).length + " / " + session.ids.length;
          track.setAttribute("aria-valuenow", String(answered.length));
          fill.style.width = (answered.length / session.ids.length * 100) + "%";
        }
        paint(false);
      }

      function renderSummary(session) {
        var right = session.ids.filter(function (id) { return isRight(session, id); });
        var wrong = session.ids.filter(function (id) { return !isRight(session, id); });
        var box = el("div", "round-summary grammar-summary");
        box.appendChild(el("p", "eyebrow", "HSK " + S.levelText(level) + " · 文法練習"));
        box.appendChild(el("h3", null, "おつかれさまでした！"));
        var score = el("div", "summary-score");
        score.setAttribute("aria-label", session.ids.length + " 問中 " + right.length + " 問正解");
        score.appendChild(el("strong", null, String(right.length)));
        score.appendChild(el("span", null, "/ " + session.ids.length));
        box.appendChild(score);
        box.appendChild(el("p", "summary-message", wrong.length ? "間違えた文をもう一度読んで、ポイントを確かめましょう。" : "全問正解です。この調子で！"));
        if (wrong.length) {
          box.appendChild(el("h4", "review-heading", "振り返る文 · " + wrong.length + " 問"));
          var list = el("ul", "grammar-review");
          wrong.forEach(function (id) {
            var item = byId.get(id);
            var row = el("li");
            row.appendChild(sentence(item, item.answer, "grammar-sentence is-small"));
            row.appendChild(el("p", "grammar-ja", "訳：" + item.ja));
            row.appendChild(el("p", "grammar-note-text", "ポイント：" + item.note));
            list.appendChild(row);
          });
          box.appendChild(list);
        }
        var actions = el("div", "summary-actions");
        if (wrong.length) {
          var retry = el("button", "secondary-button", "間違えた問題だけもう一度 · " + wrong.length + " 問");
          retry.type = "button";
          retry.setAttribute("data-grammar-retry", "");
          retry.addEventListener("click", function () { newSession(wrong, true); draw(true); });
          actions.appendChild(retry);
        }
        var restart = restartButton("next");
        actions.appendChild(renderCount(restart.relabel));
        actions.appendChild(restart);
        box.appendChild(actions);
        wrap.appendChild(box);
      }

      draw(false);
      return wrap;
    }

    return { renderKanji: renderKanji, renderGrammar: renderGrammar };
  }

  window.HSK_VIEWS = { create: create };
})();
