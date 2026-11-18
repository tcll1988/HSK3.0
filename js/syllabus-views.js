/* 漢字 and 文法 views. Built by app.js with HSK_VIEWS.create(context); uses
 * window.HSK_CHARS, HSK_GRAMMAR, HSK_GRAMMAR_JA and HSK_SYLLABUS. */
(function () {
  "use strict";

  function create(ctx) {
    var S = window.HSK_SYLLABUS;
    var el = ctx.el;
    var chars = window.HSK_CHARS;
    var grammar = window.HSK_GRAMMAR;
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

    function renderGrammar(level) {
      var key = S.listKeys(level).grammar;
      var rows = grammar.filter(function (row) { return row.level === key; });
      var pages = rows.map(function (row) { return row.page; });
      var panel = el("section", "panel grammar");
      panel.setAttribute("data-grammar-panel", "");
      panel.appendChild(heading("文法を学ぶ", "HSK " + S.levelText(level), rows.length, "項目"));
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

    return { renderKanji: renderKanji, renderGrammar: renderGrammar };
  }

  window.HSK_VIEWS = { create: create };
})();
