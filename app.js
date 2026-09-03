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
    this.activeUntil = 0;
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

  createParticle(gentle = false) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 0.91;
    const cx = this.width * 0.5;
    const cy = this.height * 0.375;
    const globeRadius = this.width * 0.35;
    return {
      x: cx + Math.cos(angle) * radius * globeRadius,
      y: cy - globeRadius * (0.45 + Math.random() * 0.55),
      vx: (Math.random() - 0.5) * (gentle ? 5 : 22),
      vy: (gentle ? 10 : 20) + Math.random() * (gentle ? 12 : 36),
      drift: Math.random() * Math.PI * 2,
      driftSpeed: 1.2 + Math.random() * 2,
      size: (gentle ? 0.8 : 1) + Math.random() * (gentle ? 1.2 : 2.1),
      alpha: 0.42 + Math.random() * 0.5,
    };
  }

  burst({ welcome = false } = {}) {
    this.resize();
    const gentle = reducedMotion.matches;
    const baseCount = gentle ? 28 : window.innerWidth < 390 ? 112 : 148;
    this.particles = Array.from({ length: baseCount }, () => this.createParticle(welcome));
    const now = performance.now();
    this.activeUntil = now + (gentle ? 1200 : welcome ? 3600 : 4300);
    this.lastTime = now;
    if (!this.frame && !document.hidden) this.frame = requestAnimationFrame((time) => this.draw(time));
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
      particle.drift += particle.driftSpeed * delta;
      particle.x += (particle.vx + Math.sin(particle.drift) * 4) * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.988;

      const dx = particle.x - cx;
      const dy = particle.y - cy;
      if (dx * dx + dy * dy > globeRadius * globeRadius || particle.y > cy + globeRadius * 0.72) {
        Object.assign(particle, this.createParticle(true));
      }

      const ending = Math.max(0, Math.min(1, (this.activeUntil - time) / 700));
      context.globalAlpha = particle.alpha * (time > this.activeUntil - 700 ? ending : 1);
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
    context.globalAlpha = 1;

    if (time < this.activeUntil) {
      this.frame = requestAnimationFrame((nextTime) => this.draw(nextTime));
    } else {
      this.particles = [];
      context.clearRect(0, 0, this.width, this.height);
    }
  }

  pause() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.pausedAt = performance.now();
  }

  resume() {
    if (!this.particles.length || this.frame || performance.now() >= this.activeUntil) return;
    this.lastTime = performance.now();
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
  snowfall.burst({ welcome: true });
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
  snowfall.burst();
  snowAnnouncement.textContent = '雪落下来了。';
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
