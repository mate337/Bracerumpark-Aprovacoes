/* Gera as lâminas do carrossel a partir de laminas.html.
   Uso: node renderizar.js            → JPG 1080 × 1080 na pasta de cima
        node renderizar.js --conferir → também grava uma prancha de conferência
   Precisa só do Playwright com Chromium (require('playwright')). */
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const destino = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1200 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'laminas.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));

  const laminas = await page.$$('section.lamina');
  for (const l of laminas) {
    const arq = await l.getAttribute('data-arq');
    await l.screenshot({ path: path.join(destino, `${arq}.jpg`), type: 'jpeg', quality: 92 });
    console.log('ok', arq);
  }
  await browser.close();
})();
