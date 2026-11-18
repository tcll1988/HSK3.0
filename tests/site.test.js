const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const vm = require('node:vm');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const core = require('../tools/validate-core.js');
const check = require('../tools/check.js');

const ROOT = path.resolve(__dirname, '..');
const DATA = ['data/vocab.js', 'data/chars.js', 'data/grammar.js', 'data/grammar-ja.js', 'data/grammar-practice.js'];

function load(files) {
  const context = { window: {}, location: { protocol: 'file:' } };
  vm.createContext(context);
  for (const file of files) vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  return context.window;
}
const clone = (value) => JSON.parse(JSON.stringify(value));

test('syllabus data passes every shared check', () => {
  const result = core.validate(core.collect(load(DATA)));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

test('vocabulary follows the PDF and uses the local recordings', () => {
  const win = load(['js/hsk.js', ...DATA]);
  const vocab = win.HSK.prepareVocab(win.HSK_VOCAB);
  assert.equal(vocab.length, 11000);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((level) => win.HSK.wordsForLevel(vocab, level).length), [300, 200, 500, 1000, 1600, 1800, 5600]);
  assert.ok(vocab.every((w) => /^audio\/\d{2}\/entry-\d+\.mp3$/.test(w.audio)));
  const byId = new Map(vocab.map((w) => [w.id, w]));
  const raw = new Map(win.HSK_VOCAB.map((w) => [w.id, w]));
  assert.equal(byId.get(14).pinyin, 'bú kèqi');           // PDF spacing for phrases
  assert.equal(byId.get(14).pos, '');                     // phrases have no 词性 in the PDF
  assert.equal(byId.get(461).pinyin, 'xiǎoháir');
  assert.equal(byId.get(1534).pinyin, 'ǹg');
  assert.equal(byId.get(7).levelNote, '1（4）');
  assert.equal(byId.get(7058).pinyin, 'hèng');            // kept, see the maintenance guide
  assert.equal(raw.get(7058).pdfPinyin, 'héng');
  assert.equal(byId.get(6692).pinyin, 'gǎn’ēn');          // PDF omits the apostrophe
  assert.equal(byId.get(10737).pinyin, 'zhìlìyú');         // PDF writes it as one word
  assert.equal(win.HSK_VOCAB.filter((w) => w.pdfPinyin).length, 5);
  assert.equal(byId.get(4).audioText, '好吧');
  assert.equal(byId.get(181).audioReading, 'shéi');
  assert.equal(win.HSK.audioSrc(byId.get(1)), 'audio/01/entry-1.mp3');
  assert.equal(win.HSK.audioPlaybackSrc(byId.get(1), 'file:'), 'audio/01/entry-1.mp3');
  assert.equal(win.HSK.audioPlaybackSrc(byId.get(1), 'https:'), 'audio/01/entry-1.mp3?v=' + win.HSK.AUDIO_VERSION);
  for (const level of [1, 7]) for (const mode of ['gloss', 'hanzi', 'pinyin', 'listen']) {
    for (const count of [10, 20, 30, 'all']) {
      const round = win.HSK.buildRound(vocab, level, mode, 7, count);
      const pool = win.HSK.wordsForLevel(vocab, level).filter((w) => mode !== 'listen' || win.HSK.listenable(w));
      assert.equal(round.length, count === 'all' ? pool.length : count);
      assert.ok(round.every((q) => q.choices.length === 4 && new Set(q.choices.map((c) => c.text)).size === 4 && q.choices.filter((c) => c.keyed).length === 1));
    }
  }
});

test('listening questions can be told apart by ear', () => {
  const win = load(['js/hsk.js', ...DATA]);
  const vocab = win.HSK.prepareVocab(win.HSK_VOCAB);
  const byId = new Map(vocab.map((w) => [w.id, w]));
  const sound = (w) => win.HSK.plainPinyin(w.audioReading || w.pinyin);
  for (const level of [1, 2, 3, 4, 5, 6, 7]) {
    for (const q of win.HSK.buildRound(vocab, level, 'listen', level * 13, 'all')) {
      const answer = byId.get(q.entryId);
      assert.equal(answer.audioText, undefined, 'words recorded inside an example are not asked');
      for (const choice of q.choices.filter((c) => !c.keyed)) {
        const other = byId.get(choice.entryId);
        assert.notEqual(other.audio, answer.audio);
        assert.notEqual(sound(other), sound(answer));
      }
    }
  }
  // A review made only of example-recorded words (吧 → 好吧, 了 → 好了) still gives a round.
  assert.equal(win.HSK.buildRound(vocab, 1, 'listen', 3, null, [4, 108]).length, 2);
});

test('syllabus helpers group characters, grammar and parts of speech', () => {
  const win = load(['js/hsk.js', ...DATA, 'js/syllabus.js']);
  const S = win.HSK_SYLLABUS;
  const good = win.HSK_VOCAB.find((w) => w.id === 71);  // 好 1（2）（4） 形、（副）、（动）
  assert.deepEqual(JSON.parse(JSON.stringify(S.posGroups(good))), [{ level: '1', pos: ['形'] }, { level: '2', pos: ['副'] }, { level: '4', pos: ['动'] }]);
  assert.deepEqual(JSON.parse(JSON.stringify(S.listKeys(2))), { read: '2', write: '1-2', grammar: '2' });
  assert.deepEqual(JSON.parse(JSON.stringify(S.listKeys(7))), { read: '7-9', write: '7-9', grammar: '7-9' });
  assert.equal(S.charIndex(win.HSK_CHARS).size, 3088);
  assert.equal(S.wordsWithChar(win.HSK_VOCAB, '爱')[0].hanzi, '爱');
  assert.equal(S.termJapanese('结果补语2', win.HSK_GRAMMAR_JA), '結果補語2');
  const index = S.pronunciationIndex(win.HSK_VOCAB);
  const tokens = S.grammarTokens('（1）专用名量词：本、个、只', index);
  assert.equal(tokens[0].text, '（1）专用名量词：');
  assert.equal(tokens.find((t) => t.text === '本').entry.pinyin, 'běn');
  assert.equal(tokens.find((t) => t.text === '只').entry, undefined); // zhī / zhǐ: not played
  const tree = S.grammarTree(win.HSK_GRAMMAR.filter((row) => row.level === '1'));
  assert.deepEqual(clone(tree.map((cat) => cat.cat)), ['语素', '词类', '短语', '句子成分', '句子的类型', '动作的态', '特殊表达法']);
});

test('the shared checks catch deliberate mistakes (reverse test)', () => {
  const data = clone(core.collect(load(DATA)));
  data.vocab[1].id = 1;                                  // duplicate id
  data.vocab[2].pinyin = '';                             // missing pinyin
  data.vocab[3].audio = 'audio/04/吧.wav';               // bad audio path
  data.vocab[6].levelNote = '1（4）（5）';                // brackets no longer match the 词性
  data.vocab[8].audio = data.vocab[9].audio;             // 杯子 shares 本1's recording
  data.chars.read['2'].chars += '爱';                    // in two 认读字 levels
  data.chars.write['3'].chars += '鬱';                   // 书写字 outside the 认读字 lists
  data.grammar[0].level = '10';
  data.grammarPractice[1].id = data.grammarPractice[0].id;           // duplicate question id
  data.grammarPractice[2].q = '我（　）有（　）中国朋友。';            // two blanks
  data.grammarPractice[3].answer = '你';                              // answer not among the choices
  data.grammarPractice[4].choices = ['吗', '吗', '的', '着'];           // repeated choice
  data.grammarPractice[5].item = '不存在的细目';                      // no such syllabus item
  const { errors, warnings } = core.validate(data);
  const text = (list) => list.map((item) => item.message).join('\n');
  assert.match(text(errors), /序号 1 重复/);
  assert.match(text(errors), /pinyin 不能为空/);
  assert.match(text(errors), /audio 路径/);
  assert.match(text(errors), /括号数和词性括号数不一致/);
  assert.match(text(errors), /同时出现在认读字 1 级和 2 级/);
  assert.match(text(errors), /level「10」/);
  assert.match(text(warnings), /书写字「鬱」/);
  assert.match(text(warnings), /被读音和录音内容都不同的词共用/);
  assert.match(text(errors), /题号 g1-01 重复/);
  assert.match(text(errors), /正好有一个填空处/);
  assert.match(text(errors), /答案「你」不在选项里/);
  assert.match(text(errors), /4 个不重复/);
  assert.match(text(errors), /不存在的细目）在该级的 data\/grammar\.js 里找不到/);
});

test('the node check finds missing, empty, non-MP3 and unused recordings', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsk-check-'));
  try {
    for (const file of ['index.html', 'css/app.css', 'js/hsk.js', 'js/syllabus.js', 'js/study.js', 'js/audio-player.js', 'js/syllabus-views.js', 'js/app.js', 'data/chars.js', 'data/grammar.js', 'data/grammar-ja.js', 'data/grammar-practice.js']) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.copyFileSync(path.join(ROOT, file), path.join(dir, file));
    }
    const vocab = load(['data/vocab.js']).HSK_VOCAB.slice(0, 4);
    fs.writeFileSync(path.join(dir, 'data/vocab.js'), 'window.HSK_VOCAB = ' + JSON.stringify(vocab) + ';');
    fs.mkdirSync(path.join(dir, 'audio/02'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'audio/03'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'audio/04'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'audio/02/entry-2.mp3'), '');                     // empty
    fs.writeFileSync(path.join(dir, 'audio/03/entry-3.mp3'), 'not really audio');     // not MP3
    fs.copyFileSync(path.join(ROOT, 'audio/04/entry-4.mp3'), path.join(dir, 'audio/04/entry-4.mp3'));
    fs.copyFileSync(path.join(ROOT, 'audio/04/entry-4.mp3'), path.join(dir, 'audio/04/extra.mp3')); // unused
    const result = check.run(dir);
    const errors = result.errors.map((item) => item.message).join('\n');
    const warnings = result.warnings.map((item) => item.message).join('\n');
    assert.match(errors, /audio\/01\/entry-1\.mp3 不存在/);
    assert.match(errors, /audio\/02\/entry-2\.mp3 是 0 字节/);
    assert.match(errors, /audio\/03\/entry-3\.mp3 不是 MP3/);
    assert.match(warnings, /audio\/04 里有 1 个没被使用的文件：extra\.mp3/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the repository passes the node check', () => {
  const result = check.run(ROOT);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
});

function serve() {
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(ROOT + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(body);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('browser: words, recordings, 漢字, 文法 and practice work from a folder and from a server', async (t) => {
  const server = await serve();
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: ['--autoplay-policy=no-user-gesture-required']
  });
  const sites = { 'file://': 'file://' + ROOT + '/index.html', 'http://': 'http://127.0.0.1:' + server.address().port + '/index.html' };
  try {
    for (const [name, url] of Object.entries(sites)) {
      await t.test(name, async () => {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(url);

        // Words and a local recording: loads, plays and ends.
        assert.equal(await page.locator('.word').count(), 20);
        const watchAudio = () => page.evaluate(() => {
          window.__audio = [];
          const player = document.querySelector('[data-player]');
          ['playing', 'ended', 'error'].forEach((type) => player.addEventListener(type, () => window.__audio.push(type + ' ' + player.currentSrc.replace(/^.*?(audio\/)/, '$1'))));
        });
        await watchAudio();
        await page.locator('.word').first().locator('[data-audio]').click();
        await page.waitForFunction(() => window.__audio.some((e) => e.startsWith('ended')), null, { timeout: 10000 });
        const events = await page.evaluate(() => window.__audio);
        assert.match(events[0], /^playing audio\/01\/entry-1\.mp3/);
        assert.equal(url.startsWith('http') ? /\?v=/.test(events[0]) : !/\?v=/.test(events[0]), true);
        const details = page.locator('.word').first().locator('.word-details');
        await details.locator('summary').click();
        assert.match(await details.textContent(), /品詞：動詞/);
        assert.match(await details.textContent(), /p\.2/);

        // 漢字: list, details with words and audio, mark as learned, filter, kind switch.
        await page.locator('[data-section="kanji"]').click();
        assert.equal(await page.locator('.kanji-cell').count(), 246);
        await page.locator('[data-kanji="爱"]').click();
        const dialog = page.locator('.kanji-dialog[open]');
        await dialog.waitFor();
        assert.match(await dialog.textContent(), /書写字：HSK 1・2（No\.1）/);
        assert.ok(await dialog.locator('.kanji-word').count() >= 6);
        await dialog.locator('[data-kanji-learned="read"]').click();
        assert.equal(await dialog.locator('[data-kanji-learned="read"]').getAttribute('aria-pressed'), 'true');
        assert.match(await page.locator('[data-kanji="爱"]').getAttribute('class'), /is-learned/); // grid updates at once
        await dialog.locator('.kanji-word').first().locator('[data-audio]').click();
        await page.waitForFunction(() => window.__audio.some((e) => e.startsWith('playing') && e.includes('entry-1.mp3')), null, { timeout: 10000 });
        await page.keyboard.press('Escape');
        await page.locator('.kanji-dialog[open]').waitFor({ state: 'detached' });
        await page.waitForFunction(() => document.activeElement && document.activeElement.getAttribute('data-kanji') === '爱'); // focus returns
        await page.locator('[data-kanji-filter]').selectOption('learned');
        assert.equal(await page.locator('.kanji-cell').count(), 1);
        await page.locator('[data-kanji-filter]').selectOption('all');
        await page.locator('[data-kanji-kind="write"]').click();
        assert.equal(await page.locator('.kanji-cell').count(), 100);
        await page.locator('[data-kanji-lookup]').fill('鬱爱');
        assert.match(await page.locator('.kanji-lookup-result').textContent(), /大綱の漢字表にはありません/);
        assert.match(await page.locator('.kanji-lookup-result').textContent(), /認読字 HSK 1（No\.1）/);

        // The view and the learned mark survive a reload.
        await page.reload();
        await watchAudio();
        assert.equal(await page.evaluate(() => window.HSK_PAGE.view), 'kanji');
        await page.locator('[data-kanji-kind="read"]').click();
        assert.match(await page.locator('[data-kanji="爱"]').getAttribute('class'), /is-learned/);

        // 文法: all rows of the level, Japanese labels, search across levels, playable words.
        await page.locator('[data-section="grammar"]').click();
        assert.equal(await page.locator('[data-grammar-row]').count(), 70);
        assert.match(await page.locator('.grammar-cat').first().textContent(), /语素形態素/);
        await page.locator('[data-grammar-scope]').selectOption('all');
        await page.locator('[data-grammar-search]').fill('把');
        assert.match(await page.locator('[data-grammar-panel] .search-status').textContent(), /全級/);
        assert.ok(await page.locator('.grammar-level-heading').count() >= 3);
        await page.locator('[data-grammar-search]').fill('');
        await page.locator('.grammar-word', { hasText: '会' }).first().click();
        await page.waitForFunction(() => window.__audio.some((e) => e.includes('entry-82.mp3')), null, { timeout: 10000 });

        // 文法練習: right and wrong answers, the explanation, progress after a reload, redo.
        await page.locator('[data-grammar-tab="practice"]').click();
        const practiceItem = () => page.evaluate(() => {
          const id = document.querySelector('[data-grammar-item]').getAttribute('data-grammar-item');
          return window.HSK_GRAMMAR_PRACTICE.find((item) => item.id === id);
        });
        let item = await practiceItem();
        assert.equal(item.level, '1');
        assert.match(await page.locator('.grammar-practice .progress-label').textContent(), /第 1 問 \/ 10/);
        assert.equal(await page.locator('[data-grammar-choice]').count(), 4);
        await page.locator(`[data-grammar-choice="${item.answer}"]`).click();
        assert.equal(await page.locator('[data-grammar-feedback]').getAttribute('data-result'), 'right');
        assert.ok((await page.locator('.grammar-explain').textContent()).includes('訳：' + item.ja));
        assert.ok((await page.locator('.grammar-sentence').textContent()).includes(item.q.replace('（　）', item.answer)));
        await page.locator('[data-grammar-next]').click();
        item = await practiceItem();
        const wrongChoice = item.choices.find((choice) => choice !== item.answer);
        await page.locator(`[data-grammar-choice="${wrongChoice}"]`).click();
        assert.equal(await page.locator('[data-grammar-feedback]').getAttribute('data-result'), 'wrong');
        assert.ok((await page.locator('.grammar-explain').textContent()).includes('正しい答え：' + item.answer));
        await page.reload();
        await watchAudio();
        assert.match(await page.locator('.grammar-practice .progress-label').textContent(), /第 2 問 \/ 10/);
        assert.equal(await page.locator('[data-grammar-feedback]').getAttribute('data-result'), 'wrong');
        assert.match(await page.locator('.grammar-practice .score').textContent(), /正解 1 \/ 10/);
        await page.locator('[data-grammar-redo]').click();
        assert.equal(await page.locator('[data-grammar-choice]:enabled').count(), 4);
        await page.locator('.practice-actions [data-grammar-restart]').click();       // first press only asks
        assert.match(await page.locator('.practice-actions [data-grammar-restart]').textContent(), /もう一度押すと/);
        await page.locator('[data-grammar-tab="list"]').click();

        // Practice keeps its mode when visiting other sections.
        await page.locator('[data-section="practice"]').click();
        await page.locator('.views [data-view="pinyin"]').click();
        await page.locator('[data-choice-index]').first().click();
        assert.equal(await page.locator('[data-feedback]').getAttribute('data-result') !== null, true);
        await page.locator('[data-section="kanji"]').click();
        await page.locator('[data-section="practice"]').click();
        assert.equal(await page.locator('.views [data-view="pinyin"]').getAttribute('aria-pressed'), 'true');

        // 音声で選ぶ: the word plays at once, stays hidden until answered, then is shown.
        await page.evaluate(() => { window.__audio = []; });
        await page.locator('.views [data-view="listen"]').click();
        const heard = await page.evaluate(() => {
          const question = window.HSK_PAGE.question();
          return window.HSK_PAGE.vocab.find((word) => word.id === question.entryId);
        });
        await page.waitForFunction((file) => window.__audio.some((e) => e.startsWith('playing ' + file)), heard.audio, { timeout: 10000 });
        assert.ok(!(await page.locator('.prompt-row').textContent()).includes(heard.hanzi));
        const keyed = await page.evaluate(() => window.HSK_PAGE.question().choices.findIndex((choice) => choice.keyed));
        await page.locator(`[data-choice-index="${keyed}"]`).click();
        assert.ok((await page.locator('[data-listen-reveal]').textContent()).includes(heard.hanzi + heard.pinyin));
        await page.locator('.practice-actions [data-question-count]').selectOption('20');
        await page.locator('[data-practice-restart]').click();
        await page.locator('[data-confirm-restart]').click();
        assert.match(await page.locator('.progress-label').textContent(), /第 1 問 \/ 20/);
        await page.locator('.practice-actions [data-question-count]').selectOption('all');
        assert.match(await page.locator('[data-practice-restart]').textContent(), /全部（291問）/);

        // The backup file carries the 漢字 marks.
        await page.locator('.settings-summary').click();
        await page.locator('.backup-controls > summary').click();
        const [download] = await Promise.all([page.waitForEvent('download'), page.locator('[data-export-progress]').click()]);
        const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
        assert.deepEqual(backup.progress.kanji.read, ['爱']);

        // Font size: A＋ scales the page.
        await page.locator('[data-font-larger]').click();
        assert.equal(await page.evaluate(() => document.documentElement.style.fontSize), '110%');
        assert.deepEqual(errors, []);
        await context.close();
      });
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('browser: no sideways scrolling at phone, tablet and desktop widths with the largest text', async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    for (const width of [320, 390, 768, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await context.newPage();
      await page.goto('file://' + ROOT + '/index.html');
      await page.evaluate(() => localStorage.setItem('hsk3-study-preferences-v1', JSON.stringify({ fontScale: 1.4 })));
      for (const view of ['list', 'kanji', 'grammar', 'gloss', 'listen', 'grammar-practice']) {
        await page.goto('file://' + ROOT + '/index.html?level=7&view=' + view.replace('-practice', ''));
        if (view === 'grammar-practice') await page.locator('[data-grammar-tab="practice"]').click();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 1, width + 'px ' + view + ' overflows by ' + overflow + 'px');
      }
      await page.goto('file://' + ROOT + '/index.html?level=1&view=kanji');
      await page.locator('[data-kanji="不"]').click();
      const box = await page.locator('.kanji-dialog[open]').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= width, width + 'px dialog does not fit');
      await context.close();
    }
  } finally {
    await browser.close();
  }
});
