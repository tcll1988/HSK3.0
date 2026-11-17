const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { chromium } = require('playwright');
const http = require('node:http');
const path = require('node:path');

function data() {
  const context = { window: {} }; vm.createContext(context);
  vm.runInContext(fs.readFileSync('data/vocab.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('js/hsk.js', 'utf8'), context);
  return context.window;
}

test('all source levels, identifiers, translations and practice modes are available', () => {
  const { HSK, HSK_VOCAB } = data();
  const vocab = HSK.prepareVocab(HSK_VOCAB);
  assert.equal(vocab.length, 11000);
  assert.equal(new Set(vocab.map(w => w.id)).size, 11000);
  assert.deepEqual([1,2,3,4,5,6,7].map(level => HSK.wordsForLevel(vocab, level).length), [300,200,500,1000,1600,1800,5600]);
  assert.ok(vocab.every(w => w.hanzi && w.pinyin && w.english && w.gloss));
  for (const level of [1, 7]) for (const mode of ['gloss','hanzi','pinyin']) {
    const questions = HSK.buildRound(vocab, level, mode, 7, 10);
    assert.equal(questions.length, 10);
    assert.ok(questions.every(q => q.level === level && q.choices.length === 4 && q.choices.filter(c => c.keyed).length === 1));
  }
  const voiced = vocab.find(w => w.hanzi === '爱' && w.pinyin === 'ài');
  assert.match(HSK.audioSrc(voiced), /^https:\/\/tcll1988\.github\.io\/HSK\/audio\//);
  assert.equal(HSK.audioSrc(vocab.find(w => !w.audio)), null);
});

test('browser can browse, search, practise and restore level 7–9', async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve('.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(process.cwd() + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, body) => { if (err) { res.writeHead(404).end(); return; } const ext=path.extname(file); res.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.css':'text/css'})[ext] || 'application/octet-stream'); res.end(body); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless:true, args:['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors=[]; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/index.html');
    await page.locator('button[data-level="7"]').click();
    assert.match(await page.locator('button[data-level="7"]').textContent(), /7–9/);
    assert.equal(await page.evaluate(() => window.HSK_PAGE.level), 7);
    assert.equal(await page.locator('.word').count(), 20);
    const missing = await page.evaluate(() => window.HSK_PAGE.vocab.find(w => w.level === 7 && !w.audio).hanzi);
    await page.locator('.search').fill(missing);
    const row = page.locator('.word').filter({has:page.locator('.hanzi', {hasText:missing})}).first();
    assert.equal(await row.locator('[data-audio]').isDisabled(), true);
    assert.ok(await row.locator('details').count() > 0);
    await page.reload();
    assert.equal(await page.evaluate(() => window.HSK_PAGE.level), 7);
    await page.locator('[data-section="practice"]').click();
    assert.equal(await page.locator('[data-choice-index]').count(), 4);
    await page.locator('[data-choice-index]').first().click();
    assert.equal(await page.locator('[data-feedback]').count(),1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
