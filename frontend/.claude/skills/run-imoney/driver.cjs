#!/usr/bin/env node
/**
 * Driver headless do iMoney para agentes: loga, navega, tira screenshot,
 * mede overflow-x e coleta erros de console.
 *
 * Uso (a partir de /frontend):
 *   node .claude/skills/run-imoney/driver.cjs /dashboard
 *   node .claude/skills/run-imoney/driver.cjs /dashboard/assessor --name assessor --full
 *   node .claude/skills/run-imoney/driver.cjs /login --no-login
 *
 * Env: IMONEY_EMAIL / IMONEY_PASSWORD (login), BASE_URL (default
 * http://localhost:3000), OUT_DIR (default /tmp/imoney-shots), WIDTH (default 375).
 * Requer: npm i --no-save playwright-core  +  chromium headless shell em
 * ~/.cache/ms-playwright (ver SKILL.md).
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.IMONEY_EMAIL || 'claude.teste375@example.com';
const PASS = process.env.IMONEY_PASSWORD || 'Teste375!imoney';
const OUT = process.env.OUT_DIR || '/tmp/imoney-shots';
const WIDTH = parseInt(process.env.WIDTH || '375', 10);

const args = process.argv.slice(2);
const urlPath = args.find(a => a.startsWith('/')) || '/dashboard';
const full = args.includes('--full');
const noLogin = args.includes('--no-login');
const nameIdx = args.indexOf('--name');
const name = nameIdx >= 0 ? args[nameIdx + 1] : urlPath.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';

function resolveHeadlessShell() {
  const root = path.join(process.env.HOME, '.cache/ms-playwright');
  const dir = fs.readdirSync(root).filter(d => d.startsWith('chromium_headless_shell-')).sort().pop();
  if (!dir) throw new Error('chromium headless shell não encontrado em ' + root);
  return path.join(root, dir, 'chrome-headless-shell-linux64/chrome-headless-shell');
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: resolveHeadlessShell(), args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 812 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + String(e).slice(0, 200)));

  if (!noLogin) {
    await page.goto(BASE + '/login', { waitUntil: 'load' });
    await page.waitForTimeout(3000); // hidratação do React — sem isso o click é engolido
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.locator('form button[type="submit"]').click();
    try {
      await page.waitForURL('**/dashboard**', { timeout: 30000 });
      // navegar imediatamente aborta o refresh de token do supabase-js
      // ("Failed to fetch") e o dashboard fica preso no skeleton
      await page.waitForTimeout(5000);
    } catch {
      console.error('LOGIN FALHOU. Texto da página:');
      console.error(await page.evaluate(() => document.body.innerText.slice(0, 400)));
      await browser.close();
      process.exit(1);
    }
  }

  await page.goto(BASE + urlPath, { waitUntil: 'load' });
  await page.waitForTimeout(5000); // dados client-side + primeira compilação do next dev

  const file = path.join(OUT, name + '.png');
  await page.screenshot({ path: file, fullPage: full });
  console.log('screenshot:', file);

  const over = await page.evaluate(() => {
    const doc = document.documentElement;
    const overX = doc.scrollWidth - doc.clientWidth;
    const bad = [];
    if (overX > 1) {
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.right > doc.clientWidth + 1 && r.width < doc.scrollWidth - 2) {
          bad.push(`<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 50)}"> right=${Math.round(r.right)}`);
          if (bad.length >= 5) break;
        }
      }
    }
    return { overX, bad };
  });
  console.log('overflow-x:', over.overX + 'px', over.bad.length ? over.bad : '');

  const uniq = [...new Set(errors)].filter(e => !e.includes('amplitude') && !e.includes('Amplitude'));
  console.log('console errors (' + uniq.length + '):');
  uniq.slice(0, 10).forEach(e => console.log(' -', e));
  await browser.close();
})();
