const stage = document.querySelector('#objectStage');
const viewer = document.querySelector('#globeModel');
const loadState = document.querySelector('#loadState');
const loadFill = document.querySelector('#loadFill');
const progressBar = loadState.querySelector('[role="progressbar"]');
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
let modelIsReady = false;

function pauseAmbientSnow() {
  if (!viewer.availableAnimations.includes('Snowfall')) return;
  viewer.pause();
}

function startAmbientSnow() {
  if (
    !modelIsReady
    || document.hidden
    || reducedMotion.matches
    || !viewer.availableAnimations.includes('Snowfall')
  ) return;
  viewer.animationName = 'Snowfall';
  viewer.play();
}

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
  modelIsReady = true;
  stage.classList.add('model-ready');
  loadState.classList.add('is-done');
  progressBar.setAttribute('aria-valuenow', '100');
  loadFill.style.transform = 'scaleX(1)';
  startAmbientSnow();
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
  if (event.detail?.status === 'failed') {
    startAmbientSnow();
    openArDialog('failed');
  }
});

window.setTimeout(() => {
  if (stage.classList.contains('model-ready')) return;
  loadState.classList.add('is-quiet');
}, 10_000);

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
    pauseAmbientSnow();
    const launch = viewer.activateAR();
    if (launch?.catch) launch.catch(() => {
      startAmbientSnow();
      openArDialog('failed');
    });
    return;
  }

  if (isIOS) {
    pauseAmbientSnow();
    quickLookLink.hidden = false;
    quickLookLink.click();
    window.setTimeout(() => {
      if (!document.hidden) {
        startAmbientSnow();
        openArDialog('failed');
      }
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
    viewer.removeAttribute('auto-rotate');
    pauseAmbientSnow();
  } else {
    if (arWasRequested) viewer.removeAttribute('auto-rotate');
    startAmbientSnow();
  }
});

window.addEventListener('pageshow', () => {
  if (arWasRequested) {
    viewer.removeAttribute('auto-rotate');
  }
  startAmbientSnow();
});

reducedMotion.addEventListener('change', () => {
  viewer.removeAttribute('auto-rotate');
  if (reducedMotion.matches) pauseAmbientSnow();
  else {
    startAmbientSnow();
    if (!userTookControl && !welcomeFinished) startWelcomeMoment();
  }
});

if (location.hash === '#ar') {
  gift.classList.add('ar-intent');
  cameraNote.textContent = '已经准备好；轻点“放到房间里”会打开 iPhone 相机，画面不会上传到这个网页';
}

if (!isIOS) {
  cameraNote.textContent = '在 iPhone 的 Safari 打开，可以把水晶球放到桌面';
}
