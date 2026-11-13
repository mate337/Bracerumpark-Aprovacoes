/* Grava a animação quadro a quadro, sem fundo, e monta os vídeos.
   Precisa do Playwright (Chromium) e do ffmpeg com prores_ks, libvpx-vp9, libx264.

   node renderizar.js
     Só o texto, 6 s, na pasta de cima:
       contagem-10k-transparente.mov   ProRes 4444 com alfa — Premiere, After Effects,
                                       Final Cut, DaVinci, CapCut no computador
       contagem-10k-transparente.webm  VP9 com alfa — navegador, Canva, web
       contagem-10k-previa.mp4         sobre fundo branco, só para conferir

   node renderizar.js --video gravacao.mp4
     O vídeo entra emoldurado na parte branca, acima do texto; a peça dura o
     tempo do vídeo e leva o som dele:
       story-10k-video.mp4                pronto para o story (fundo branco)
       story-10k-video-transparente.mov   ProRes 4444 com alfa
       story-10k-video-transparente.webm  VP9 com alfa */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const FPS = 30;
const iv = process.argv.indexOf('--video');
const fonteVideo = iv > 0 ? path.resolve(process.argv[iv + 1]) : null;

const ff = (args) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });

(async () => {
  const destino = path.resolve(__dirname, '..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'contagem-10k-'));
  const quadros = path.join(tmp, 'q');
  fs.mkdirSync(quadros);

  /* o vídeo vira uma sequência de quadros a 30 fps (já girado: o ffmpeg aplica a rotação do celular) */
  let cfg = null, nQuadrosVideo = 0;
  if (fonteVideo) {
    const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries',
      'stream=width,height:stream_side_data=rotation:format=duration', '-of', 'json', fonteVideo]));
    const s = info.streams[0];
    const giro = Math.abs((s.side_data_list || []).find((d) => 'rotation' in d)?.rotation || 0) % 180 === 90;
    const vq = path.join(tmp, 'v');
    fs.mkdirSync(vq);
    ff(['-i', fonteVideo, '-vf', `fps=${FPS}`, '-q:v', '2', path.join(vq, 'v%05d.jpg')]);
    nQuadrosVideo = fs.readdirSync(vq).length;
    cfg = { src: '', w: giro ? s.height : s.width, h: giro ? s.width : s.height, duracao: nQuadrosVideo / FPS, dir: vq };
    console.log(`vídeo ${cfg.w}×${cfg.h}, ${nQuadrosVideo} quadros`);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  if (cfg) await page.addInitScript((c) => { window.VIDEO_CFG = c; }, cfg);
  await page.goto('file://' + path.join(__dirname, 'animacao.html') + '?render');
  const duracao = await page.evaluate(() => window.DURACAO);
  const total = cfg ? nQuadrosVideo : Math.round(FPS * duracao);

  for (let i = 0; i < total; i++) {
    if (cfg) {
      const src = 'file://' + path.join(cfg.dir, `v${String(i + 1).padStart(5, '0')}.jpg`);
      await page.evaluate((s) => window.trocaVideo(s), src);
    }
    await page.evaluate((t) => window.quadro(t), i / FPS);
    await page.screenshot({ path: path.join(quadros, `q${String(i).padStart(5, '0')}.png`), omitBackground: true });
    if (i % 120 === 0) console.log(`quadro ${i}/${total}`);
  }
  await browser.close();
  console.log(`${total} quadros (${FPS} fps, ${(total / FPS).toFixed(2)} s)`);

  const seq = ['-framerate', String(FPS), '-i', path.join(quadros, 'q%05d.png')];
  const som = fonteVideo ? ['-i', fonteVideo, '-map', '0:v', '-map', '1:a?', '-shortest'] : [];
  const nome = fonteVideo ? 'story-10k-video' : 'contagem-10k';

  /* com vídeo, qscale 11 e alfa de 8 bits: ~190 MB em vez de ~570 MB, sem diferença visível */
  ff([...seq, ...som, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le',
      ...(fonteVideo ? ['-qscale:v', '11', '-alpha_bits', '8'] : ['-alpha_bits', '16']),
      '-vendor', 'apl0', ...(fonteVideo ? ['-c:a', 'aac', '-b:a', '192k'] : []),
      path.join(destino, `${nome}-transparente.mov`)]);
  ff([...seq, ...som, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', fonteVideo ? '24' : '18',
      '-row-mt', '1', '-auto-alt-ref', '0', ...(fonteVideo ? ['-c:a', 'libopus', '-b:a', '128k'] : []),
      path.join(destino, `${nome}-transparente.webm`)]);

  /* sobre branco: a prévia (só texto) ou o story pronto (com vídeo e som) */
  const branco = ['-f', 'lavfi', '-i', `color=white:s=1080x1920:r=${FPS}`];
  const mp4 = fonteVideo ? 'story-10k-video.mp4' : 'contagem-10k-previa.mp4';
  ff([...seq, ...branco, ...(fonteVideo ? ['-i', fonteVideo] : []),
      '-filter_complex', '[1][0]overlay=shortest=1,format=yuv420p[v]', '-map', '[v]',
      ...(fonteVideo ? ['-map', '2:a?', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
      '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', path.join(destino, mp4)]);

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('ok');
})();
