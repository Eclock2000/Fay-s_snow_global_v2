const stage = document.querySelector('#objectStage');
const viewer = document.querySelector('#globeModel');
const loadState = document.querySelector('#loadState');
const loadFill = document.querySelector('#loadFill');
const progressBar = loadState.querySelector('[role="progressbar"]');
const snowButton = document.querySelector('#snowButton');
const roomButton = document.querySelector('#roomButton');
const roomButtonText = document.querySelector('#roomButtonText');
const cameraNote = document.querySelector('#cameraNote');
const gift = document.querySelector('#gift');
const arDialog = document.querySelector('#arDialog');
const arDialogTitle = document.querySelector('#arDialogTitle');
const arDialogText = document.querySelector('#arDialogText');
const quickLookLink = document.querySelector('#quickLookLink');
const copyLinkButton = document.querySelector('#copyLink');
const dialogStatus = document.querySelector('#dialogStatus');
const snowAnnouncement = document.querySelector('#snowAnnouncement');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const ua = navigator.userAgent.toLowerCase();
const isIOS = /iphone/.test(ua);
const browserKind = /micromessenger/.test(ua)
  ? 'wechat'
  : /qqbrowser|\bqq\//.test(ua)
    ? 'qq'
    : /weibo/.test(ua)
      ? 'weibo'
      : 'regular';
const isInAppBrowser = browserKind !== 'regular';

let userTookControl = false;
let welcomeFinished = false;
let arWasRequested = false;
let autoRotateTimer = 0;

class Snowfall {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d', { alpha: true });
    this.particles = [];
    this.frame = 0;
    this.lastTime = 0;
    this.startTime = 0;
    this.endTime = 0;
    this.pausedAt = 0;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = bounds.width;
    this.height = bounds.height;
  }

  createParticle(index, count, gentle = false) {
    const cx = this.width * 0.5;
    const cy = this.height * 0.375;
    const globeRadius = this.width * 0.35;
    const y = cy - globeRadius * (0.86 + Math.random() * 0.16);
    const vy = (gentle ? 34 : 43) + Math.random() * (gentle ? 18 : 33);
    const floorY = cy + globeRadius * (0.54 + Math.random() * 0.17);
    const lifeMs = Math.max(2100, ((floorY - y) / vy) * 1000);
    return {
      x: cx + (Math.random() * 2 - 1) * globeRadius * 0.77,
      y,
      vx: (Math.random() - 0.5) * (gentle ? 8 : 18),
      vy,
      drift: Math.random() * Math.PI * 2,
      driftSpeed: 0.9 + Math.random() * 1.8,
      size: (gentle ? 0.75 : 0.9) + Math.random() * (gentle ? 1.15 : 1.8),
      alpha: 0.48 + Math.random() * 0.42,
      delayMs: (index / count) * (gentle ? 750 : 1250) + Math.random() * 180,
      lifeMs,
      fadeInMs: (gentle ? 420 : 320) + Math.random() * 260,
      fadeOutMs: (gentle ? 650 : 520) + Math.random() * 360,
    };
  }

  burst() {
    if (this.particles.length || this.frame) return false;
    this.resize();
    const gentle = reducedMotion.matches;
    const baseCount = gentle ? 32 : window.innerWidth < 390 ? 72 : 88;
    this.particles = Array.from(
      { length: baseCount },
      (_, index) => this.createParticle(index, baseCount, gentle),
    );
    const now = performance.now();
    this.startTime = now;
    this.endTime = now + Math.max(
      ...this.particles.map((particle) => particle.delayMs + particle.lifeMs),
    );
    this.lastTime = now;
    if (!this.frame && !document.hidden) this.frame = requestAnimationFrame((time) => this.draw(time));
    return true;
  }

  draw(time) {
    this.frame = 0;
    if (document.hidden || !this.particles.length) return;

    const delta = Math.min(0.034, Math.max(0.001, (time - this.lastTime) / 1000));
    this.lastTime = time;
    const context = this.context;
    const cx = this.width * 0.5;
    const cy = this.height * 0.375;
    const globeRadius = this.width * 0.35;

    context.clearRect(0, 0, this.width, this.height);
    context.save();
    context.beginPath();
    context.arc(cx, cy, globeRadius * 0.98, 0, Math.PI * 2);
    context.clip();
    context.fillStyle = '#f7fcff';

    for (const particle of this.particles) {
      const ageMs = time - this.startTime - particle.delayMs;
      if (ageMs < 0 || ageMs >= particle.lifeMs) continue;

      particle.drift += particle.driftSpeed * delta;
      particle.x += (particle.vx + Math.sin(particle.drift) * 4) * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.988;

      const fadeIn = Math.min(1, ageMs / particle.fadeInMs);
      const fadeOut = Math.min(1, (particle.lifeMs - ageMs) / particle.fadeOutMs);
      const easedIn = fadeIn * fadeIn * (3 - 2 * fadeIn);
      const easedOut = fadeOut * fadeOut * (3 - 2 * fadeOut);
      context.globalAlpha = particle.alpha * easedIn * easedOut;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
    context.globalAlpha = 1;

    if (time < this.endTime) {
      this.frame = requestAnimationFrame((nextTime) => this.draw(nextTime));
    } else {
      this.particles = [];
      this.startTime = 0;
      this.endTime = 0;
      context.clearRect(0, 0, this.width, this.height);
    }
  }

  pause() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pausedAt = performance.now();
  }

  resume() {
    if (!this.particles.length || this.frame) return;
    const now = performance.now();
    const pausedFor = this.pausedAt ? now - this.pausedAt : 0;
    this.startTime += pausedFor;
    this.endTime += pausedFor;
    this.lastTime = now;
    this.pausedAt = 0;
    this.frame = requestAnimationFrame((time) => this.draw(time));
  }
}

const snowfall = new Snowfall(document.querySelector('#snowLayer'));

function stopAutomaticRotation() {
  userTookControl = true;
  window.clearTimeout(autoRotateTimer);
  viewer.removeAttribute('auto-rotate');
}

function startWelcomeMoment() {
  if (welcomeFinished || reducedMotion.matches || document.hidden) return;
  welcomeFinished = true;
  viewer.setAttribute('rotation-per-second', '5deg');
  viewer.setAttribute('auto-rotate-delay', '0');
  viewer.setAttribute('auto-rotate', '');
  autoRotateTimer = window.setTimeout(() => viewer.removeAttribute('auto-rotate'), 8500);
}

function completeModelLoad() {
  stage.classList.add('model-ready');
  loadState.classList.add('is-done');
  progressBar.setAttribute('aria-valuenow', '100');
  loadFill.style.transform = 'scaleX(1)';
  window.setTimeout(startWelcomeMoment, 240);
}

viewer.addEventListener('progress', (event) => {
  const progress = Math.round((event.detail?.totalProgress || 0) * 100);
  progressBar.setAttribute('aria-valuenow', String(progress));
  loadFill.style.transform = `scaleX(${Math.max(0.025, progress / 100)})`;
});
viewer.addEventListener('load', completeModelLoad);
viewer.addEventListener('error', () => loadState.classList.add('is-quiet'));
viewer.addEventListener('camera-change', (event) => {
  if (event.detail?.source === 'user-interaction') stopAutomaticRotation();
});
viewer.addEventListener('pointerdown', stopAutomaticRotation, { passive: true });
viewer.addEventListener('ar-status', (event) => {
  if (event.detail?.status === 'failed') openArDialog('failed');
});

window.setTimeout(() => {
  if (stage.classList.contains('model-ready')) return;
  loadState.classList.add('is-quiet');
}, 10_000);

snowButton.addEventListener('click', () => {
  stopAutomaticRotation();
  const started = snowfall.burst();
  snowAnnouncement.textContent = started ? '雪落下来了。' : '雪还在轻轻落。';
});

function setArIntent() {
  if (location.hash !== '#ar') history.replaceState(null, '', `${location.pathname}${location.search}#ar`);
  gift.classList.add('ar-intent');
  roomButtonText.textContent = '放到房间里';
}

function browserInstruction() {
  if (browserKind === 'wechat') return '点右上角的 ···，选择“在默认浏览器中打开”，然后再点一次“放到房间里”。';
  if (browserKind === 'qq') return '点右上角菜单，选择“Safari”或“用其他浏览器打开”，然后再点一次“放到房间里”。';
  if (browserKind === 'weibo') return '点右上角菜单，选择“用 Safari 打开”，然后再点一次“放到房间里”。';
  return '请用 iPhone 的 Safari 打开这个链接，再点一次“放到房间里”。';
}

function showDialog() {
  if (typeof arDialog.showModal === 'function') {
    if (!arDialog.open) arDialog.showModal();
  } else {
    arDialog.setAttribute('open', '');
  }
}

function openArDialog(mode = 'browser') {
  dialogStatus.textContent = '';
  if (mode === 'failed') {
    arDialogTitle.textContent = '没有打开，再轻点一次';
    arDialogText.textContent = '可以直接交给 iPhone 的 AR 视图打开。若仍没有反应，请确认正在使用 Safari。';
    quickLookLink.hidden = !isIOS;
  } else if (!isIOS) {
    arDialogTitle.textContent = '在 iPhone 上打开';
    arDialogText.textContent = '用 iPhone 的 Safari 打开这个页面，就能把水晶球放到桌面。';
    quickLookLink.hidden = true;
  } else {
    arDialogTitle.textContent = '换到 Safari，就能放到桌面';
    arDialogText.textContent = browserInstruction();
    quickLookLink.hidden = isInAppBrowser;
  }
  arDialog.classList.toggle('single-action', quickLookLink.hidden);
  showDialog();
}

roomButton.addEventListener('click', () => {
  setArIntent();
  arWasRequested = true;
  stopAutomaticRotation();

  if (isInAppBrowser) {
    openArDialog('browser');
    return;
  }

  if (viewer.canActivateAR && typeof viewer.activateAR === 'function') {
    const launch = viewer.activateAR();
    if (launch?.catch) launch.catch(() => openArDialog('failed'));
    return;
  }

  if (isIOS) {
    quickLookLink.hidden = false;
    quickLookLink.click();
    window.setTimeout(() => {
      if (!document.hidden) openArDialog('failed');
    }, 900);
    return;
  }

  openArDialog('device');
});

document.querySelector('#dialogClose').addEventListener('click', () => arDialog.close());
arDialog.addEventListener('click', (event) => {
  if (event.target === arDialog) arDialog.close();
});

copyLinkButton.addEventListener('click', async () => {
  const url = new URL(location.href);
  url.hash = 'ar';
  try {
    await navigator.clipboard.writeText(url.href);
    dialogStatus.textContent = '链接已复制';
  } catch {
    const selection = document.createElement('textarea');
    selection.value = url.href;
    selection.setAttribute('readonly', '');
    selection.style.position = 'fixed';
    selection.style.opacity = '0';
    document.body.appendChild(selection);
    selection.select();
    document.execCommand('copy');
    selection.remove();
    dialogStatus.textContent = '链接已复制';
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    snowfall.pause();
    viewer.removeAttribute('auto-rotate');
  } else {
    snowfall.resume();
    if (arWasRequested) viewer.removeAttribute('auto-rotate');
  }
});

window.addEventListener('pageshow', () => {
  if (arWasRequested) {
    viewer.removeAttribute('auto-rotate');
    snowfall.pause();
  }
});

reducedMotion.addEventListener('change', () => {
  viewer.removeAttribute('auto-rotate');
  if (!reducedMotion.matches && !userTookControl && !welcomeFinished) startWelcomeMoment();
});

if (location.hash === '#ar') {
  gift.classList.add('ar-intent');
  cameraNote.textContent = '已经准备好；轻点“放到房间里”会打开 iPhone 相机，画面不会上传到这个网页';
}

if (!isIOS) {
  cameraNote.textContent = '在 iPhone 的 Safari 打开，可以把水晶球放到桌面';
}
