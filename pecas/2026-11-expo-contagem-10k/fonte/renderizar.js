/* Grava a animação quadro a quadro, sem fundo, e monta os vídeos.
   Uso: node renderizar.js
   Precisa do Playwright (Chromium) e do ffmpeg com prores_ks, libvpx-vp9 e libx264.

   Saída, na pasta de cima:
     contagem-10k-transparente.mov   ProRes 4444 com alfa — Premiere, After Effects,
                                     Final Cut, DaVinci, CapCut no computador
     contagem-10k-transparente.webm  VP9 com alfa — navegador, Canva, web
     contagem-10k-previa.mp4         sobre fundo branco, só para conferir */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  const destino = path.resolve(__dirname, '..');
  const quadros = fs.mkdtempSync(path.join(os.tmpdir(), 'contagem-10k-'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'animacao.html') + '?render');
  const { FPS, DURACAO } = await page.evaluate(() => ({ FPS: window.FPS, DURACAO: window.DURACAO }));
  const total = Math.round(FPS * DURACAO);

  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.quadro(t), i / FPS);
    await page.screenshot({ path: path.join(quadros, `q${String(i).padStart(4, '0')}.png`), omitBackground: true });
  }
  await browser.close();
  console.log(`${total} quadros (${FPS} fps, ${DURACAO} s) em ${quadros}`);

  const entrada = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(quadros, 'q%04d.png')];
  const ff = (args) => execFileSync('ffmpeg', [...entrada, ...args], { stdio: 'inherit' });

  ff(['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-alpha_bits', '16',
      '-vendor', 'apl0', path.join(destino, 'contagem-10k-transparente.mov')]);
  ff(['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '18', '-row-mt', '1',
      '-auto-alt-ref', '0', path.join(destino, 'contagem-10k-transparente.webm')]);
  ff(['-f', 'lavfi', '-i', `color=white:s=1080x1920:r=${FPS}`,
      '-filter_complex', '[1][0]overlay=shortest=1,format=yuv420p',
      '-c:v', 'libx264', '-crf', '18', '-movflags', '+faststart', path.join(destino, 'contagem-10k-previa.mp4')]);

  fs.rmSync(quadros, { recursive: true, force: true });
  console.log('ok');
})();
