/* Gera o vídeo vertical (1080 × 1920, 30 fps, 30 s).
   Uso: node renderizar.js caminho/do/video-do-estande.mp4
   Precisa do Playwright (Chromium) e do ffmpeg com libx264.

   Saída, na pasta de cima:
     feed-expo-paraguai.mp4   pronto para o feed (H.264 + som do estande na cena 3)
     capa.jpg                 quadro final, para escolher como capa no Instagram */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const fonteVideo = process.argv[2] && path.resolve(process.argv[2]);
if (!fonteVideo) { console.error('uso: node renderizar.js video-do-estande.mp4'); process.exit(1); }
const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });

(async () => {
  const destino = path.resolve(__dirname, '..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'feed-expo-'));
  const quadros = path.join(tmp, 'q'), vq = path.join(tmp, 'v');
  fs.mkdirSync(quadros); fs.mkdirSync(vq);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'animacao.html') + '?render');
  await page.evaluate(() => document.fonts.ready);
  const { FPS, DURACAO, C3 } = await page.evaluate(() => ({ FPS: window.FPS, DURACAO: window.DURACAO, C3: window.C3 }));

  /* trecho do vídeo que aparece na cena 3: do segundo 0 até a foto da cena 4 cobrir tudo */
  const trecho = 22.7 - C3.video;
  ff(['-i', fonteVideo, '-t', trecho.toFixed(2), '-vf', `fps=${FPS}`, '-q:v', '2', path.join(vq, 'v%05d.jpg')]);
  const nv = fs.readdirSync(vq).length;

  const total = Math.round(FPS * DURACAO);
  for (let i = 0; i < total; i++) {
    const t = i / FPS;
    const f = Math.min(nv, Math.max(1, Math.round((t - C3.video) * FPS) + 1));
    await page.evaluate((s) => window.trocaVideo(s), 'file://' + path.join(vq, `v${String(f).padStart(5, '0')}.jpg`));
    await page.evaluate((t) => window.quadro(t), t);
    await page.screenshot({ path: path.join(quadros, `q${String(i).padStart(5, '0')}.png`) });
    if (i % 150 === 0) console.log(`quadro ${i}/${total}`);
  }
  await page.screenshot({ path: path.join(destino, 'capa.jpg'), type: 'jpeg', quality: 92 });
  await browser.close();

  /* som: o do próprio vídeo, só enquanto ele está na tela, com entrada e saída suaves */
  const atraso = Math.round(C3.video * 1000);
  ff(['-framerate', String(FPS), '-i', path.join(quadros, 'q%05d.png'), '-i', fonteVideo,
      '-filter_complex',
      `[1:a]atrim=0:${trecho.toFixed(2)},asetpts=PTS-STARTPTS,afade=t=in:d=0.4,` +
      `afade=t=out:st=${(trecho - 0.9).toFixed(2)}:d=0.9,adelay=${atraso}|${atraso},apad[a]`,
      '-map', '0:v', '-map', '[a]', '-t', String(DURACAO),
      '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', path.join(destino, 'feed-expo-paraguai.mp4')]);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`ok — ${total} quadros`);
})();
