// 模擬試験（exam/）のテスト：データ検査、逆テスト、ブラウザーでの操作（file:// と http://）、横はみ出し。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const EXAM = path.join(ROOT, 'exam');
const PAPERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S79', 'K3', 'K4', 'K5', 'K6'];
const launch = () => chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--autoplay-policy=no-user-gesture-required']
});
const runCheck = (dir) => spawnSync(process.execPath, [path.join(ROOT, 'tools/check-exam.js'), dir], { encoding: 'utf8' });

test('exam data passes the checker', () => {
  const result = runCheck(EXAM);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /冊子 11 冊・515 問/);
});

test('the exam checker catches deliberate mistakes (reverse test)', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'exam-check-'));
  try {
    const dir = path.join(tmp, 'exam');
    fs.mkdirSync(path.join(dir, 'papers', 'S1'), { recursive: true });
    fs.symlinkSync(path.join(ROOT, 'HSK3.0_新版样卷'), path.join(tmp, 'HSK3.0_新版样卷'));
    fs.symlinkSync(path.join(EXAM, 'papers', 'S1', 'pages'), path.join(dir, 'papers', 'S1', 'pages'));
    fs.copyFileSync(path.join(EXAM, 'levels.js'), path.join(dir, 'levels.js'));
    const catalog = fs.readFileSync(path.join(EXAM, 'catalog.js'), 'utf8').replace(/^ (S[2-9]|S79|K\d):.*\n/gm, '');
    fs.writeFileSync(path.join(dir, 'catalog.js'), catalog);
    const code = fs.readFileSync(path.join(EXAM, 'papers', 'S1', 'paper.js'), 'utf8');
    const book = JSON.parse(code.slice('const book='.length).replace(/;\s*$/, ''));
    book.keys[0] = 'Z';                       // 選択肢にない解答
    book.audio['2'] = [900, 950];              // 録音（約795秒）より後ろ
    book.notes[3] = ['解説が1つだけ'];          // 解説の形が違う
    book.questionPages[4] = [2];               // 白紙ページ
    fs.writeFileSync(path.join(dir, 'papers', 'S1', 'paper.js'), 'const book=' + JSON.stringify(book) + ';\n');
    const result = runCheck(dir);
    assert.equal(result.status, 1);
    assert.match(result.stdout, /第1問の解答「Z」が選択肢 ABC にありません/);
    assert.match(result.stdout, /第4問の解説は3つの文字列の配列/);
    assert.match(result.stdout, /第5問が白紙ページ 2 を指しています/);
    if (spawnSync('ffprobe', ['-version']).status === 0) assert.match(result.stdout, /第2問の音声の終わり 950 秒が録音の長さ/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// 長い録音の途中から再生できるよう、Range リクエストに応えるサーバー（GitHub Pages と同じ）。
function serve() {
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.pdf': 'application/pdf' };
  const server = http.createServer((req, res) => {
    const file = path.resolve(ROOT + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    const size = fs.statSync(file).size;
    const type = types[path.extname(file)] || 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      res.writeHead(206, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': size });
      fs.createReadStream(file).pipe(res);
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('browser: practice, exam, writing and speaking work from a folder and from a server', async (t) => {
  const server = await serve();
  const browser = await launch();
  const sites = { 'file://': 'file://' + EXAM + '/index.html', 'http://': 'http://127.0.0.1:' + server.address().port + '/exam/index.html' };
  try {
    for (const [name, base] of Object.entries(sites)) {
      await t.test(name, async () => {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(m.text()); });

        // Every paper opens its home page with the structure table.
        for (const id of PAPERS) {
          await page.goto(base + '?paper=' + id + '#home');
          await page.locator('.hero h1').waitFor();
          assert.ok(await page.locator('.structure tbody tr').count() > 0, id);
          const img = page.locator('.paper-link a').first();
          assert.match(await img.getAttribute('href'), /HSK3\.0_/);
        }

        // Listening practice: the clip starts inside its range and stops at the end.
        await page.goto(base + '?paper=S2#practice/listen');
        await page.locator('#session-settings button[type=submit]').click();
        await page.locator('.player audio').waitFor();
        const clip = await page.evaluate(async () => {
          const audio = document.querySelector('.player audio');
          audio.muted = true;
          if (audio.readyState < 1) await new Promise((r) => audio.addEventListener('loadedmetadata', r, { once: true }));
          await audio.play();
          await new Promise((r) => setTimeout(r, 1200));
          return { t: audio.currentTime, paused: audio.paused, error: audio.error && audio.error.code };
        });
        assert.equal(clip.error, null);
        assert.ok(clip.t > 91 && clip.t < 107, 'segment of question 1 plays: ' + clip.t);
        assert.equal(clip.paused, false);
        // Wrong answer first, then the right one.
        await page.locator('[data-pick="A"]').click();
        await page.locator('.practice-feedback.is-wrong').waitFor();
        assert.match(await page.locator('.practice-feedback').textContent(), /正解は B です/);
        assert.equal(await page.locator('.step [data-go]').last().isDisabled(), true);
        await page.locator('[data-pick="B"]').click();
        await page.locator('.practice-feedback.is-right').waitFor();
        assert.match(await page.locator('.practice-feedback').textContent(), /他们正在打篮球呢/);
        assert.match(await page.locator('.practice-feedback').textContent(), /バスケットボール/);
        await page.locator('.step [data-go]').last().click();
        assert.match(await page.locator('.qhead').textContent(), /原題 第2問/);
        // Progress survives a reload.
        await page.reload();
        assert.match(await page.locator('.qhead').textContent(), /原題 第2問/);
        await page.goto(base + '?paper=S2#practice/listen');
        assert.match(await page.locator('.session-status').textContent(), /2問目/);

        // Exam mode with the dialog, the result and the review.
        await page.goto(base + '?paper=S1#practice/read');
        await page.locator('input[value=exam]').check();
        await page.locator('#session-settings button[type=submit]').click();
        await page.locator('[data-pick="F"]').click();                     // 21: F (correct)
        await page.locator('.step [data-go]').last().click();
        await page.locator('[data-pick="B"]').click();                     // 22: A is correct
        assert.equal(await page.locator('.option.correct, .option.wrong').count(), 0, 'no feedback in exam mode');
        assert.match(await page.locator('.timer').textContent(), /経過/);
        await page.locator('.sheet [data-submit]').click();
        await page.locator('#accept').click();
        await page.locator('.score').waitFor();
        assert.match(await page.locator('.score').textContent(), /1\s*\/\s*20/);
        await page.locator('.result .solid').click();
        await page.locator('.explain').waitFor();
        assert.match(await page.locator('.explain h3').textContent(), /不正解|未解答/);

        // Character writing (S3 61) and short answers with self-check (S79 67).
        await page.goto(base + '?paper=S3#practice/write');
        await page.locator('#session-settings button[type=submit]').click();
        await page.locator('#written').fill('北');
        await page.locator('#check-written').click();
        await page.locator('.practice-feedback.is-wrong').waitFor();
        await page.locator('#written').fill('方');
        await page.locator('#check-written').click();
        await page.locator('.practice-feedback.is-right').waitFor();

        await page.goto(base + '?paper=S79#practice/read');
        await page.locator('input[value=random]').check();
        await page.locator('input[value=original]').check();
        await page.locator('#session-settings button[type=submit]').click();
        await page.evaluate(() => { location.hash = location.hash; });
        const seq = await page.evaluate(() => JSON.parse(localStorage.getItem('hsk3-sample-S79-v1')).drafts['read/practice/original'].sequence.length);
        assert.equal(seq, 40);

        // Speaking: show the model answer, then mark it as done.
        await page.goto(base + '?paper=K3#practice/speak');
        await page.locator('#session-settings button[type=submit]').click();
        await page.locator('#check-written').click();
        await page.locator('#mark-written').click();
        await page.locator('.practice-feedback.is-right').waitFor();
        assert.equal(await page.locator('.step [data-go]').last().isDisabled(), false);

        // History lists the submitted exam.
        await page.goto(base + '?paper=S1#history');
        assert.equal(await page.locator('.history-row').count(), 1);

        assert.deepEqual(errors, []);
        await context.close();
      });
    }
  } finally {
    await browser.close();
    server.close();
  }
});

test('browser: the vocabulary site links to the exam for the chosen level', async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('file://' + ROOT + '/index.html');
    assert.equal(await page.getAttribute('[data-exam-link]', 'href'), 'exam/index.html?paper=S1#home');
    await page.locator('.levels button').nth(6).click();
    assert.equal(await page.getAttribute('[data-exam-link]', 'href'), 'exam/index.html?paper=S79#home');
  } finally {
    await browser.close();
  }
});

test('browser: no sideways scrolling on the exam pages at phone, tablet and desktop widths', async () => {
  const browser = await launch();
  try {
    for (const width of [320, 390, 768, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      for (const hash of ['?paper=S4#home', '?paper=S4#practice/all', '?paper=S79#history']) {
        await page.goto('file://' + EXAM + '/index.html' + hash);
        await page.waitForTimeout(150);
        if (hash.endsWith('practice/all')) {
          await page.locator('#session-settings button[type=submit]').click();
          await page.locator('.original img').waitFor();
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(overflow <= 0, `${width}px ${hash}: ${overflow}px`);
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
