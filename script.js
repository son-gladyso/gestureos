(function () {
  'use strict';

  const video = document.getElementById('camera');
  const canvas = document.getElementById('fx');
  const ctx = canvas?.getContext('2d');
  const stage = document.querySelector('.stage');
  const elStatus = document.getElementById('status');
  const elGesture = document.getElementById('gesture');
  const elLoader = document.getElementById('loader');
  const elFps = document.getElementById('fps');
  const elPCount = document.getElementById('particle-count');
  const elErrorOverlay = document.getElementById('error-overlay');
  const elErrorMessage = document.getElementById('error-message');
  const elErrorRetry = document.getElementById('error-retry');
  const tipCards = Array.from(document.querySelectorAll('.tip-card'));

  if (!video || !canvas || !ctx) {
    console.error('GestureOS initialization failed: required DOM nodes are missing.');
    return;
  }

  const config = window.GestureConfig;
  const helpers = window.GestureHelpers;
  const detector = window.GestureDetector;
  const policies = window.GesturePolicies;
  if (!config || !helpers || !policies) {
    console.error('GestureOS initialization failed: config/helpers/policies are missing.');
    return;
  }
  if (!detector || typeof detector.detectGesture !== 'function') {
    console.error('GestureOS initialization failed: detector is missing.');
    return;
  }

  const { isValidLandmarks, clamp } = helpers;
  const { detectGesture } = detector;
  const { resolveQualityMode, getCameraErrorMessage, canUseCameraContext } = policies;
  if (
    typeof isValidLandmarks !== 'function' ||
    typeof clamp !== 'function' ||
    typeof resolveQualityMode !== 'function' ||
    typeof getCameraErrorMessage !== 'function' ||
    typeof canUseCameraContext !== 'function'
  ) {
    console.error('GestureOS initialization failed: invalid helper/policy methods.');
    return;
  }

  const {
    MAX_RINGS = 20,
    MAX_SWORDS = 2000,
    MODE_HOLD_THRESHOLD = 0.08,
    P_FOV = 500,
    EMIT_INTERVAL = {
      tracking: 0.03,
      pinch: 0.022,
      open: 0.028,
      fist: 0.06,
    },
    COLORS = {
      idle: '0,255,224',
      tracking: '0,255,170',
      pinch: '180,60,255',
      open: '255,50,150',
      fist: '0,255,255',
    },
    STATUS_TEXTS = {
      scanning: 'Scanning hand...',
      paused: 'Paused (tab hidden)',
      online: 'System online',
    },
    GENERIC_RUNTIME_ERROR = 'Unexpected runtime error. Please refresh and retry.',
  } = config;

  const IS_MOBILE = window.matchMedia('(max-width: 900px)').matches;
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR_CAP = IS_MOBILE ? 1 : 1.25;
  const MAX_PARTICLES_HIGH = IS_MOBILE ? 140 : 400; // tuned default particle cap
  const MAX_PARTICLES_LOW = IS_MOBILE ? 90 : 200;
  const SWORD_COUNT = IS_MOBILE ? 200 : 800;
  const MIN_DT = 1 / 120;
  const MAX_DT = 1 / 24;

  const SWORD_FOV = 800;
  const INFER_INTERVAL_MS = IS_MOBILE ? 66 : 50;
  const CAMERA_WIDTH = IS_MOBILE ? 640 : 960;
  const CAMERA_HEIGHT = IS_MOBILE ? 480 : 540;

  const STATUS_SCANNING = STATUS_TEXTS.scanning;
  const STATUS_PAUSED = STATUS_TEXTS.paused;
  const STATUS_ONLINE = STATUS_TEXTS.online;

  let W = 0;
  let H = 0;
  let dpr = 1;

  let quality = IS_MOBILE || REDUCED_MOTION ? 'low' : 'high';
  let particleCap = quality === 'high' ? MAX_PARTICLES_HIGH : MAX_PARTICLES_LOW;
  let bloomEnabled = quality === 'high' && !REDUCED_MOTION;
  let lineLimit = quality === 'high' && !REDUCED_MOTION ? 75 : 0;

  let mode = 'idle';
  let handVisible = false;
  let emitClock = 0;

  let rawX = 0;
  let rawY = 0;
  let ptrX = 0;
  let ptrY = 0;
  let ptrVx = 0;
  let ptrVy = 0;
  const SMOOTHING = 0.24;

  let lastFrame = performance.now();
  let fpsTimer = lastFrame;
  let fpsFrames = 0;
  let fpsValue = 60;

  let inferBusy = false;
  let lastInferAt = 0;
  let pageVisible = !document.hidden;
  let mediaReady = false;
  let mediaHands = null;
  let mediaCamera = null;

  // 手势防抖
  let pendingMode = 'idle';
  let modeHoldTimer = 0;
  const particles = [];
  const rings = [];

  // ── 3D 新增状态及交互变量 ──
  let pinchZoomLevel = 0;
  let pinchZoomVelocity = 0;
  let orbitAngleX = 0;
  let orbitAngleY = 0;
  let lotusTime = 0;

  // ── 万剑归宗 3D 数据 (SoA — Structure of Arrays) ──
  const S = {
    x: new Float32Array(MAX_SWORDS),
    y: new Float32Array(MAX_SWORDS),
    z: new Float32Array(MAX_SWORDS),
    vx: new Float32Array(MAX_SWORDS),
    vy: new Float32Array(MAX_SWORDS),
    vz: new Float32Array(MAX_SWORDS),
    delay: new Float32Array(MAX_SWORDS),
    active: new Uint8Array(MAX_SWORDS), // 0=dead, 1=idle/hover, 2=flying
    count: 0,
  };

  // 预渲染光剑 (Sword Sprite)
  const swordCanvas = document.createElement('canvas');
  const sCtx = swordCanvas.getContext('2d');
  if (!sCtx) {
    console.error('GestureOS initialization failed: 2D context is unavailable.');
    return;
  }
  swordCanvas.width = 64;
  swordCanvas.height = 16;

  (function initSwordSprite() {
    const w = swordCanvas.width;
    const h = swordCanvas.height;
    const cy = h / 2;

    sCtx.clearRect(0, 0, w, h);

    // 剑身发光 (Blue/Cyan)
    const gradient = sCtx.createLinearGradient(0, 0, w, 0);
    gradient.addColorStop(0, 'rgba(0, 255, 255, 0)');
    gradient.addColorStop(0.4, 'rgba(0, 255, 255, 0.4)');
    gradient.addColorStop(0.8, 'rgba(200, 255, 255, 0.9)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 1)');

    sCtx.globalCompositeOperation = 'lighter'; // 叠加模式

    // 剑形 (细长菱形)
    sCtx.fillStyle = gradient;
    sCtx.beginPath();
    sCtx.moveTo(0, cy);
    sCtx.lineTo(w * 0.3, cy - 2);
    sCtx.lineTo(w, cy);
    sCtx.lineTo(w * 0.3, cy + 2);
    sCtx.closePath();
    sCtx.fill();

    // 剑芯高亮
    sCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    sCtx.lineWidth = 1.5;
    sCtx.beginPath();
    sCtx.moveTo(w * 0.45, cy);
    sCtx.lineTo(w, cy);
    sCtx.stroke();

    // 剑尖光晕
    const tipGlow = sCtx.createRadialGradient(w, cy, 0, w, cy, 6);
    tipGlow.addColorStop(0, 'rgba(255,255,255,0.8)');
    tipGlow.addColorStop(1, 'rgba(255,255,255,0)');
    sCtx.fillStyle = tipGlow;
    sCtx.beginPath();
    sCtx.arc(w, cy, 6, 0, Math.PI * 2);
    sCtx.fill();
  })();

  function setStatus(text) {
    if (elStatus) elStatus.textContent = text;
  }

  function showError(message) {
    if (elErrorOverlay && elErrorMessage) {
      elErrorMessage.textContent = message;
      elErrorOverlay.hidden = false;
    }
    setStatus('ERROR');
  }

  function handleUnexpectedError(error) {
    console.error('[GestureOS] Unexpected runtime error:', error);
    showError(GENERIC_RUNTIME_ERROR);
    elLoader?.classList.add('hidden');
  }

  function onUnhandledRejection(event) {
    handleUnexpectedError(event?.reason || event);
  }

  function onWindowError(event) {
    handleUnexpectedError(event?.error || event?.message || event);
  }

  function setGesture(name) {
    if (!elGesture) return;
    elGesture.textContent = name.toUpperCase();
    elGesture.setAttribute('data-mode', name);
  }

  function setQuality(next) {
    if (REDUCED_MOTION && next === 'high') return;
    if (quality === next) return;
    quality = next;
    particleCap = quality === 'high' ? MAX_PARTICLES_HIGH : MAX_PARTICLES_LOW;
    bloomEnabled = quality === 'high' && !REDUCED_MOTION;
    lineLimit = quality === 'high' && !REDUCED_MOTION ? 75 : 0;

    if (quality === 'low') {
      stage?.classList.add('perf-low');
      setStatus('Low-latency mode enabled');
    } else {
      stage?.classList.remove('perf-low');
      setStatus('Performance recovered');
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function addParticle(x, y, vx, vy, life, size, modeName, z, vz) {
    if (particles.length >= particleCap) return;
    particles.push({
      x,
      y,
      z: z || 0,
      vx,
      vy,
      vz: vz || 0,
      life,
      maxLife: life,
      size,
      mode: modeName,
    });
  }

  function addRing(x, y, maxR, life, modeName, maxLW) {
    if (rings.length >= MAX_RINGS) return;
    rings.push({
      x,
      y,
      r: 0,
      maxR,
      life,
      maxLife: life,
      mode: modeName,
      maxLW: maxLW || 2,
      lw: maxLW || 2,
    });
  }

  // 万剑归宗初始化 (写入 SoA)
  function initSwords() {
    S.count = SWORD_COUNT;
    for (let i = 0; i < S.count; i++) {
      S.x[i] = (Math.random() - 0.5) * 4000;
      S.y[i] = (Math.random() - 0.5) * 3500;
      S.z[i] = 2000 + Math.random() * 2500;
      S.vx[i] = 0;
      S.vy[i] = 0;
      S.vz[i] = 0;
      S.delay[i] = Math.random() * 2.0;
      S.active[i] = 1; // idle/hover
    }
  }

  function emitBurst(x, y, count, baseSpeed, modeName) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.5) * Math.PI; // 3D仰角
      const sp = baseSpeed * (0.6 + Math.random() * 0.8);
      const xySpeed = sp * Math.cos(elev);
      addParticle(
        x,
        y,
        Math.cos(a) * xySpeed,
        Math.sin(a) * xySpeed,
        0.35 + Math.random() * 0.5,
        1.2 + Math.random() * 2.2,
        modeName,
        (Math.random() - 0.5) * 160,
        sp * Math.sin(elev) * 0.8
      );
    }
  }

  function emitContinuous(modeName) {
    if (!handVisible || modeName === 'idle') return;

    const speed = Math.hypot(ptrVx, ptrVy);
    const moveAngle = Math.atan2(ptrVy, ptrVx);

    switch (modeName) {
      case 'tracking': {
        const count = speed > 800 ? 4 : 2;
        for (let i = 0; i < count; i += 1) {
          const a = Math.random() * Math.PI * 2;
          // 基础扩散速度
          const sp = 10 + Math.random() * 20;
          let vx = Math.cos(a) * sp;
          let vy = Math.sin(a) * sp;

          // 施加反向惯性 (Trail Effect)
          if (speed > 100) {
            vx -= ptrVx * 0.1;
            vy -= ptrVy * 0.1;
          }

          addParticle(
            ptrX,
            ptrY,
            vx,
            vy,
            0.45 + Math.random() * 0.45,
            1 + Math.random() * 1.6,
            modeName,
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 50
          );
        }
        break;
      }
      case 'pinch': {
        const count = speed > 1000 ? 6 : 3;
        for (let i = 0; i < count; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const sp = 45 + Math.random() * 70;
          // 粒子初速度叠加手势速度
          const vx = Math.cos(a) * sp + ptrVx * 0.3;
          const vy = Math.sin(a) * sp + ptrVy * 0.3;

          addParticle(
            ptrX,
            ptrY,
            vx,
            vy,
            0.3 + Math.random() * 0.35,
            1.5 + Math.random() * 1.9,
            modeName,
            (Math.random() - 0.5) * 60,
            (Math.random() - 0.5) * 180
          );
        }
        break;
      }
      case 'open': {
        // 六边形护盾：静止时稳定，移动时在后方留下尾迹
        const count = speed > 500 ? 3 : 2;
        for (let i = 0; i < count; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const r = 18 + Math.random() * 40;
          // 移动时，粒子生成位置偏向后方
          let offsetX = 0,
            offsetY = 0;
          if (speed > 200) {
            offsetX = -Math.cos(moveAngle) * 20;
            offsetY = -Math.sin(moveAngle) * 20;
          }

          const sx = ptrX + Math.cos(a) * r + offsetX;
          const sy = ptrY + Math.sin(a) * r + offsetY;
          const sp = 20 + Math.random() * 35;
          const layerZ = (Math.random() - 0.5) * 120;
          addParticle(
            sx,
            sy,
            Math.cos(a + 1.4) * sp,
            Math.sin(a + 1.4) * sp,
            0.55 + Math.random() * 0.45,
            1.2 + Math.random() * 1.6,
            modeName,
            layerZ,
            (Math.random() - 0.3) * 60
          );
        }
        break;
      }
      case 'fist': {
        const count = 2;
        for (let i = 0; i < count; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const r = 60 + Math.random() * 100;
          const sx = ptrX + Math.cos(a) * r;
          const sy = ptrY + Math.sin(a) * r;
          // 粒子初速度指向手心
          const sp = 80 + Math.random() * 60;
          addParticle(
            sx,
            sy,
            -Math.cos(a) * sp,
            -Math.sin(a) * sp,
            0.3 + Math.random() * 0.3,
            1 + Math.random() * 1.5,
            modeName,
            80 + Math.random() * 200,
            -(100 + Math.random() * 80)
          );
        }
        break;
      }
    }
  }

  function updateSwords(dt) {
    if (mode !== 'fist') return;

    const cx = W / 2;
    const cy = H / 2;

    // 目标(手部)位置 - 增加速度预测 (Lead Target)
    const leadFactor = 0.2;
    const targetX = ptrX - cx + ptrVx * leadFactor;
    const targetY = ptrY - cy + ptrVy * leadFactor;
    const targetZ = 0;

    // SoA 遍历
    for (let i = 0; i < S.count; i++) {
      // 状态 1: 悬停/准备 (Idle)
      if (S.active[i] === 1) {
        S.delay[i] -= dt;
        S.z[i] -= 200 * dt;

        // 随手势移动而整体微偏移 (视差感)
        S.x[i] += ptrVx * 0.05 * dt;
        S.y[i] += ptrVy * 0.05 * dt;

        // 微微震动
        S.x[i] += (Math.random() - 0.5) * 2;
        S.y[i] += (Math.random() - 0.5) * 2;

        if (S.delay[i] <= 0) {
          S.active[i] = 2; // Launch!
        }
      }
      // 状态 2: 飞行 (Flying)
      else if (S.active[i] === 2) {
        const dx = targetX - S.x[i];
        const dy = targetY - S.y[i];
        const dz = targetZ - S.z[i];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;

        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        const accel = 4000;
        S.vx[i] += nx * accel * dt;
        S.vy[i] += ny * accel * dt;
        S.vz[i] += nz * accel * dt;

        // 阻尼
        S.vx[i] *= 0.95;
        S.vy[i] *= 0.95;
        S.vz[i] *= 0.95;

        S.x[i] += S.vx[i] * dt;
        S.y[i] += S.vy[i] * dt;
        S.z[i] += S.vz[i] * dt;

        // 击中(利用未预测的真实距离判断)/越界循环
        const realDist = Math.hypot(ptrX - cx - S.x[i], ptrY - cy - S.y[i]);
        if ((S.z[i] < 200 && realDist < 150) || S.z[i] < -200) {
          S.z[i] = 2000 + Math.random() * 2000;
          S.x[i] = (Math.random() - 0.5) * 4500;
          S.y[i] = (Math.random() - 0.5) * 4500;
          // 复位时保留一点点惯性
          S.vx[i] = ptrVx * 0.1;
          S.vy[i] = ptrVy * 0.1;
          S.vz[i] = 0;
          S.delay[i] = Math.random() * 0.3; // 快速填装
          S.active[i] = 1;
        }
      }
    }
  }

  function drawSwords() {
    if (mode !== 'fist') return;

    const fov = SWORD_FOV;
    const cx = W / 2;
    const cy = H / 2;

    ctx.save();

    for (let i = 0; i < S.count; i++) {
      const z = S.z[i];
      if (z < -fov + 100) continue;

      const scale = fov / (fov + z);
      const sx = S.x[i] * scale + cx;
      const sy = S.y[i] * scale + cy;

      let angle = 0;
      if (S.active[i] === 2) {
        const nextScale = fov / (fov + (z + S.vz[i] * 0.05));
        const nextSx = (S.x[i] + S.vx[i] * 0.05) * nextScale + cx;
        const nextSy = (S.y[i] + S.vy[i] * 0.05) * nextScale + cy;
        angle = Math.atan2(nextSy - sy, nextSx - sx);
      } else {
        angle = Math.atan2(ptrY - sy, ptrX - sx);
      }

      const drawScale = scale * dpr * 1.5;
      const c = Math.cos(angle);
      const s = Math.sin(angle);

      ctx.setTransform(
        drawScale * c,
        drawScale * s,
        drawScale * -s,
        drawScale * c,
        sx * dpr,
        sy * dpr
      );

      // 绘制拖尾 (仅在飞行状态下)
      if (S.active[i] === 2) {
        const speed = Math.sqrt(S.vx[i] ** 2 + S.vy[i] ** 2 + S.vz[i] ** 2);
        const trailLen = Math.min(speed * 0.04, 200); // 根据速度计算拖尾长度
        if (trailLen > 5) {
          ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
          ctx.beginPath();
          ctx.moveTo(-30, 0);
          ctx.lineTo(-30 - trailLen, -2); // 尾部收窄
          ctx.lineTo(-30 - trailLen, 2);
          ctx.fill();
        }
      }

      ctx.drawImage(swordCanvas, -32, -8);
    }
    ctx.restore();
  }

  // 屏幕震动效果
  function triggerScreenShake() {
    if (REDUCED_MOTION) return;
    stage?.classList.remove('screen-shake');
    void stage?.offsetWidth;
    stage?.classList.add('screen-shake');
    setTimeout(() => stage?.classList.remove('screen-shake'), 400);
  }

  function onModeChange(nextMode) {
    const c = COLORS[nextMode] || COLORS.idle;
    setGesture(nextMode);

    // 高亮当前激活的 tip card
    tipCards.forEach((card) => {
      card.classList.toggle('active', card.dataset.mode === nextMode);
    });

    if (nextMode === 'pinch') {
      emitBurst(ptrX, ptrY, quality === 'high' ? 14 : 8, 170, 'pinch');
      addRing(ptrX, ptrY, 120, 0.35, 'pinch', 3);
      triggerScreenShake();
    } else if (nextMode === 'open') {
      emitBurst(ptrX, ptrY, quality === 'high' ? 12 : 7, 120, 'open');
      addRing(ptrX, ptrY, 150, 0.5, 'open', 4);
      triggerScreenShake();
    } else if (nextMode === 'fist') {
      addRing(ptrX, ptrY, 110, 0.4, 'fist', 3);
      initSwords();
      triggerScreenShake();
    } else if (nextMode === 'tracking') {
      addRing(ptrX, ptrY, 70, 0.25, 'tracking', 2);
    }

    if (nextMode !== 'idle') {
      setStatus(`Gesture: ${nextMode}`);
    }

    if (elGesture) {
      elGesture.style.textShadow = `0 0 10px rgba(${c},0.7)`;
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        // swap-and-pop: O(1) 替代 splice O(n)
        particles[i] = particles[particles.length - 1];
        particles.pop();
        continue;
      }

      // 物理场：不同模式不同力场
      if (handVisible) {
        const dx = ptrX - p.x;
        const dy = ptrY - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) + 0.1;

        if (mode === 'fist') {
          // 拳头: 强力黑洞引力 (带速度预测)
          const predX = ptrX + ptrVx * 0.15;
          const predY = ptrY + ptrVy * 0.15;
          const pdx = predX - p.x;
          const pdy = predY - p.y;
          const pdistSq = pdx * pdx + pdy * pdy;
          const pdist = Math.sqrt(pdistSq) + 0.1;

          const force = 900 / (pdistSq * 0.05 + 50);
          p.vx += (pdx / pdist) * force * 70 * dt;
          p.vy += (pdy / pdist) * force * 70 * dt;
          // z轴: 将粒子向屏幕平面(z=0)猛拉
          p.vz += -p.z * 5.0 * dt;
        } else if (mode === 'open') {
          if (dist < 350) {
            let force = 2500 / (distSq + 200);

            if (Math.abs(ptrVx) > 50 || Math.abs(ptrVy) > 50) {
              const dot = (dx * ptrVx + dy * ptrVy) / (dist * Math.hypot(ptrVx, ptrVy));
              if (dot < -0.3) force *= 3.0;
            }

            p.vx -= (dx / dist) * force * 150 * dt;
            p.vy -= (dy / dist) * force * 150 * dt;
            p.vz += (p.z > 0 ? 1 : -1) * force * 80 * dt;
          }
        } else if (mode === 'pinch') {
          // 捏合: 拖拽引力 + 3D扰动
          if (dist < 200) {
            const pullSpeed = 1500;
            p.vx += (dx / dist) * pullSpeed * dt;
            p.vy += (dy / dist) * pullSpeed * dt;

            p.vx += (ptrVx - p.vx) * 2.0 * dt;
            p.vy += (ptrVy - p.vy) * 2.0 * dt;

            p.vx += (Math.random() - 0.5) * 60;
            p.vy += (Math.random() - 0.5) * 60;
            // z轴: 混沌跳跃 + 中心拉力
            p.vz += (Math.random() - 0.5) * 120;
            p.vz += -p.z * 2.5 * dt;
          }
        }
      }

      // 3D 阻尼
      p.vx *= 1 - 1.8 * dt;
      p.vy *= 1 - 1.8 * dt;
      p.vz *= 1 - 2.5 * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // 深度边界弹回
      if (p.z < -300) {
        p.z = -300;
        p.vz *= -0.4;
      }
      if (p.z > 600) {
        p.z = 600;
        p.vz *= -0.3;
      }
    }
  }

  function drawParticleLayer(alphaMul) {
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      const lifeAlpha = p.life / p.maxLife;
      const rgb = COLORS[p.mode] || COLORS.idle;

      //  3D 透视投影
      const depthScale = Math.max(0.25, Math.min(2.5, P_FOV / (P_FOV + p.z)));
      const depthAlpha = Math.max(0.2, Math.min(1.2, depthScale));
      const finalAlpha = lifeAlpha * alphaMul * depthAlpha;
      const projSize = p.size * depthScale;

      if (p.mode === 'tracking' || p.mode === 'idle') {
        const size = projSize * (0.5 + lifeAlpha);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 3 + p.z * 0.005);
        ctx.fillStyle = `rgba(${rgb},${finalAlpha.toFixed(3)})`;
        ctx.fillRect(-size / 2, -size / 2, size, size);
        if (depthScale > 1.15) {
          ctx.strokeStyle = `rgba(${rgb},${(finalAlpha * 0.4).toFixed(3)})`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-size / 2, -size / 2, size, size);
        }
        ctx.restore();
      } else if (p.mode === 'pinch') {
        // 3D 锯齿闪电电弧
        if (Math.random() > 0.35 && depthScale > 0.5) {
          const jitter = 10 * depthScale;
          ctx.beginPath();
          let lx = p.x,
            ly = p.y;
          const tx = ptrX + (Math.random() - 0.5) * 6;
          const ty = ptrY + (Math.random() - 0.5) * 6;
          const segs = 3 + Math.floor(Math.random() * 3);
          ctx.moveTo(lx, ly);
          for (let s = 1; s < segs; s++) {
            const t = s / segs;
            lx = p.x + (tx - p.x) * t + (Math.random() - 0.5) * jitter;
            ly = p.y + (ty - p.y) * t + (Math.random() - 0.5) * jitter;
            ctx.lineTo(lx, ly);
          }
          ctx.lineTo(tx, ty);
          ctx.strokeStyle = `rgba(${rgb},${(finalAlpha * 0.4).toFixed(3)})`;
          ctx.lineWidth = 0.7 * depthScale;
          ctx.stroke();
        }
        // 径向发光核心
        const coreR = projSize * 0.8;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, coreR * 2.5);
        grad.addColorStop(0, `rgba(${rgb},${(finalAlpha * 0.55).toFixed(3)})`);
        grad.addColorStop(0.5, `rgba(${rgb},${(finalAlpha * 0.12).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${(finalAlpha * 0.65).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.mode === 'open') {
        // 3D 六边形护盾碎片  深度倾斜
        const size = projSize * 1.2;
        const tilt = 1.0 - Math.abs(p.z) * 0.0008;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(1, Math.max(0.4, tilt));
        ctx.rotate(p.z * 0.003);
        ctx.beginPath();
        for (let h = 0; h < 6; h++) {
          const theta = (h * Math.PI) / 3 - Math.PI / 6;
          const hx = Math.cos(theta) * size;
          const hy = Math.sin(theta) * size;
          if (h === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(${rgb},${(finalAlpha * 0.4).toFixed(3)})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${rgb},${(finalAlpha * 0.75).toFixed(3)})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
      } else if (p.mode === 'fist') {
        const coreR = projSize * 1.2;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, coreR * 3);
        grad.addColorStop(0, `rgba(${rgb},${(finalAlpha * 0.5).toFixed(3)})`);
        grad.addColorStop(0.4, `rgba(${rgb},${(finalAlpha * 0.1).toFixed(3)})`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${(finalAlpha * 0.7).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, coreR * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${rgb},${finalAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, projSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // -------------------------
  // 6. Ring & Effect Logic
  // -------------------------
  function updateRings(dt) {
    for (let i = rings.length - 1; i >= 0; i -= 1) {
      const r = rings[i];
      r.life -= dt;
      if (r.life <= 0) {
        // swap-and-pop
        rings[i] = rings[rings.length - 1];
        rings.pop();
        continue;
      }
      const t = 1 - r.life / r.maxLife;
      // 缓动函数
      const ease = r.mode === 'open' ? t : 1 - Math.pow(1 - t, 3);
      r.r = r.maxR * ease;
      r.lw = (r.maxLW || 2) * (1 - t);
    }
  }

  function drawRings() {
    for (let i = 0; i < rings.length; i += 1) {
      const r = rings[i];
      const alpha = r.life / r.maxLife;
      const rgb = COLORS[r.mode] || COLORS.idle;

      if (r.r > 5) {
        const glowGrad = ctx.createRadialGradient(r.x, r.y, r.r * 0.75, r.x, r.y, r.r * 1.3);
        glowGrad.addColorStop(0, `rgba(${rgb},0)`);
        glowGrad.addColorStop(0.5, `rgba(${rgb},${(alpha * 0.1).toFixed(3)})`);
        glowGrad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (r.mode === 'open') {
        const sides = 6;
        const step = (Math.PI * 2) / sides;
        // 后景层 (小)
        ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.18).toFixed(3)})`;
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        for (let j = 0; j <= sides; j++) {
          const theta = j * step - Math.PI / 2;
          const px = r.x + Math.cos(theta) * r.r * 0.82;
          const py = r.y + Math.sin(theta) * r.r * 0.82;
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        // 主层
        ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.55).toFixed(3)})`;
        ctx.lineWidth = 3.5 * alpha;
        ctx.beginPath();
        for (let j = 0; j <= sides; j++) {
          const theta = j * step - Math.PI / 2;
          const px = r.x + Math.cos(theta) * r.r;
          const py = r.y + Math.sin(theta) * r.r;
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        // 前景层 (大)
        ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.12).toFixed(3)})`;
        ctx.lineWidth = 1.2 * alpha;
        ctx.beginPath();
        for (let j = 0; j <= sides; j++) {
          const theta = j * step - Math.PI / 2;
          const px = r.x + Math.cos(theta) * r.r * 1.18;
          const py = r.y + Math.sin(theta) * r.r * 1.18;
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else {
        // 内环 (白色高亮)
        ctx.strokeStyle = `rgba(255,255,255,${(alpha * 0.25).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        // 主环
        ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.55).toFixed(3)})`;
        ctx.lineWidth = (r.lw || 2) * 1.4;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        // 外环 (衰减)
        ctx.strokeStyle = `rgba(${rgb},${(alpha * 0.12).toFixed(3)})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r * 1.25, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawConstellation() {
    if (lineLimit <= 1 || particles.length < 2) return;
    const limit = Math.min(particles.length, lineLimit);
    const maxD = 68;
    const maxD2 = maxD * maxD;

    for (let i = 0; i < limit; i += 1) {
      const a = particles[i];
      const aLife = a.life / a.maxLife;
      if (aLife < 0.18) continue;

      for (let j = i + 1; j < limit; j += 1) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z - b.z) * 0.25;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > maxD2) continue;

        const avgDepth = (a.z + b.z) / 2;
        const depthFade = Math.max(0.3, P_FOV / (P_FOV + avgDepth));
        const strength = (1 - d2 / maxD2) * 0.2 * depthFade;
        ctx.strokeStyle = `rgba(130,220,255,${strength.toFixed(3)})`;
        ctx.lineWidth = 0.6 * depthFade;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  function drawStarOrbit() {
    if (!handVisible || mode !== 'tracking') return;
    ctx.save();
    ctx.translate(ptrX, ptrY);
    ctx.rotate(orbitAngleY * 0.5);

    const time = performance.now() * 0.001;
    for (let i = 0; i < 3; i++) {
      ctx.save();
      if (i === 0) {
        ctx.scale(1, 0.3);
        ctx.rotate(time + orbitAngleX);
      }
      if (i === 1) {
        ctx.rotate(Math.PI / 3);
        ctx.scale(1, 0.4);
        ctx.rotate(-time * 1.2 + orbitAngleY);
      }
      if (i === 2) {
        ctx.rotate(-Math.PI / 4);
        ctx.scale(1, 0.45);
        ctx.rotate(time * 0.8 + orbitAngleX);
      }

      ctx.strokeStyle = `rgba(0, 255, 170, 0.5)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 70 + i * 25, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(70 + i * 25, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawMicroUniverse() {
    if (!handVisible || mode !== 'pinch') return;
    const z = pinchZoomLevel;
    ctx.save();
    ctx.translate(ptrX, ptrY);
    ctx.rotate(orbitAngleY + performance.now() * 0.0005);

    // 1. 银河外环
    if (z < 1.5) {
      const alpha = clamp(1 - z / 1.5, 0, 1);
      const scale = 1 + z * 3;
      ctx.scale(scale, scale * 0.6);

      for (let r = 10; r < 180; r += 15) {
        ctx.strokeStyle = `rgba(180, 60, 255, ${alpha * 0.35 * (1 - r / 180)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 2. 恒星视角
    if (z > 0.5 && z < 2.5) {
      let alpha = 1;
      if (z < 1.0) alpha = (z - 0.5) * 2;
      if (z > 2.0) alpha = 1 - (z - 2.0) * 2;

      const scale = 0.5 + (z - 1) * 2;
      ctx.scale(scale, scale);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
      grad.addColorStop(0, `rgba(255, 230, 100, ${alpha})`);
      grad.addColorStop(0.5, `rgba(255, 130, 0, ${alpha * 0.8})`);
      grad.addColorStop(1, `rgba(255, 0, 0, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 地球深层视角
    if (z > 1.5) {
      let alpha = clamp((z - 1.5) * 2, 0, 1);
      const scale = 0.5 + (z - 2.0) * 1.5;
      ctx.scale(scale, scale);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 35);
      grad.addColorStop(0, `rgba(50, 180, 255, ${alpha})`);
      grad.addColorStop(0.8, `rgba(0, 80, 220, ${alpha})`);
      grad.addColorStop(1, `rgba(0, 0, 50, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 35, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.4})`;
      ctx.lineWidth = 1;
      ctx.save();
      ctx.scale(1, 0.3);
      ctx.rotate(performance.now() * 0.002);
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(60, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawCyberLotus() {
    if (!handVisible || mode !== 'open') return;
    ctx.save();
    ctx.translate(ptrX, ptrY);
    ctx.scale(1, Math.max(0.3, 1 - Math.abs(ptrVy) * 0.001));
    ctx.rotate(orbitAngleY * 0.5);

    const petals = 12;
    const layers = 3;
    const baseColor = '255, 50, 150';
    const time = lotusTime * 1.5;

    for (let l = 0; l < layers; l++) {
      ctx.save();
      const dir = l % 2 === 0 ? 1 : -1;
      ctx.rotate(time * dir * (1 - l * 0.2));
      const rScale = 90 + l * 45;

      const alpha = 0.8 - l * 0.2;
      ctx.strokeStyle = `rgba(${baseColor}, ${alpha})`;
      ctx.lineWidth = 2 - l * 0.4;
      ctx.fillStyle = `rgba(${baseColor}, ${alpha * 0.12})`;

      for (let p = 0; p < petals; p++) {
        ctx.save();
        ctx.rotate(((Math.PI * 2) / petals) * p);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(rScale * 0.5, rScale * 0.3, rScale, 0);
        ctx.quadraticCurveTo(rScale * 0.5, -rScale * 0.3, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPointer() {
    if (!handVisible || mode === 'idle') return;
    const rgb = COLORS[mode] || COLORS.idle;

    // 绘制手指核心发光区
    const coreR = mode === 'pinch' ? 9 : mode === 'fist' ? 8 : 6;
    const coreGrad = ctx.createRadialGradient(ptrX, ptrY, 0, ptrX, ptrY, coreR * 2);
    coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
    coreGrad.addColorStop(0.35, `rgba(${rgb},0.7)`);
    coreGrad.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(ptrX, ptrY, coreR * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function renderFrame() {
    ctx.clearRect(0, 0, W, H);

    if (handVisible && mode !== 'idle') {
      const rgb = COLORS[mode] || COLORS.idle;
      const fogGrad = ctx.createRadialGradient(ptrX, ptrY, 0, ptrX, ptrY, 250);
      fogGrad.addColorStop(0, `rgba(${rgb},0.05)`);
      fogGrad.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, W, H);
    }

    if (bloomEnabled) {
      // 第一层 bloom (近距离)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(5px)';
      drawParticleLayer(0.28);
      ctx.restore();

      // 第二层 bloom (远距离柔和光晕)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = 'blur(14px)';
      drawParticleLayer(0.07);
      ctx.restore();
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawConstellation();
    drawParticleLayer(0.85);
    drawRings();
    drawSwords();
    drawStarOrbit();
    drawMicroUniverse();
    drawCyberLotus();
    drawPointer();
    ctx.restore();
  }

  function updateQualityFromFps() {
    const nextQuality = resolveQualityMode(quality, fpsValue, IS_MOBILE, REDUCED_MOTION);
    if (nextQuality !== quality) {
      setQuality(nextQuality);
    }
  }

  function tick(ts) {
    rafId = requestAnimationFrame(tick);
    if (!pageVisible) {
      lastFrame = ts;
      return;
    }

    let dt = (ts - lastFrame) / 1000;
    lastFrame = ts;
    if (!Number.isFinite(dt)) dt = MIN_DT;
    dt = clamp(dt, MIN_DT, MAX_DT);

    fpsFrames += 1;
    if (ts - fpsTimer >= 500) {
      fpsValue = Math.round((fpsFrames * 1000) / (ts - fpsTimer));
      fpsFrames = 0;
      fpsTimer = ts;
      if (elFps) elFps.textContent = `${fpsValue} FPS`;
      updateQualityFromFps();
    }

    if (handVisible) {
      const prevX = ptrX;
      const prevY = ptrY;
      ptrX += (rawX - ptrX) * SMOOTHING;
      ptrY += (rawY - ptrY) * SMOOTHING;
      // 计算瞬时速度
      ptrVx = (ptrX - prevX) / dt;
      ptrVy = (ptrY - prevY) / dt;

      // === 3D 旋转联动 ===
      orbitAngleX += ptrVy * 0.002 * dt;
      orbitAngleY -= ptrVx * 0.002 * dt;
    } else {
      // 手部丢失后平滑减速
      ptrVx *= 0.85;
      ptrVy *= 0.85;
      // 速度足够小时归零
      if (Math.abs(ptrVx) < 1) ptrVx = 0;
      if (Math.abs(ptrVy) < 1) ptrVy = 0;
    }

    // === 3D 参数平滑与时间推演 ===
    orbitAngleX *= 0.92;
    orbitAngleY *= 0.92;
    lotusTime += dt;

    if (mode === 'pinch' && handVisible) {
      pinchZoomVelocity += dt * 2.5;
      if (ptrVy > 50) pinchZoomVelocity += ptrVy * 0.008 * dt; // 下拽加速放大
    } else {
      pinchZoomVelocity -= dt * 8.0;
    }
    pinchZoomVelocity = clamp(pinchZoomVelocity, -3, 3);
    pinchZoomLevel += pinchZoomVelocity * dt;
    pinchZoomLevel = clamp(pinchZoomLevel, 0, 3);

    emitClock += dt;
    const interval = EMIT_INTERVAL[mode] || 0.04;
    if (handVisible && mode !== 'idle' && emitClock >= interval) {
      emitContinuous(mode);
      emitClock = 0;
    }

    updateParticles(dt);
    updateRings(dt);
    updateSwords(dt);
    renderFrame();

    if (elPCount) elPCount.textContent = `P: ${particles.length} | S: ${S.count}`;
  }

  function onResults(results) {
    const hands = results.multiHandLandmarks;
    if (!hands || hands.length === 0) {
      handVisible = false;
      if (mode !== 'idle') {
        mode = 'idle';
        onModeChange('idle');
      }
      setStatus(STATUS_SCANNING);
      return;
    }

    const lm = hands[0];
    if (!isValidLandmarks(lm)) {
      handVisible = false;
      if (mode !== 'idle') {
        mode = 'idle';
        onModeChange('idle');
      }
      setStatus(STATUS_SCANNING);
      return;
    }

    handVisible = true;
    rawX = (1 - lm[8].x) * W;
    rawY = lm[8].y * H;
    if (mode === 'idle') {
      ptrX = rawX;
      ptrY = rawY;
    }

    const nextMode = detectGesture(lm);
    if (nextMode !== mode) {
      if (nextMode === pendingMode) {
        modeHoldTimer += INFER_INTERVAL_MS / 1000;
        if (modeHoldTimer >= MODE_HOLD_THRESHOLD) {
          mode = nextMode;
          onModeChange(nextMode);
          pendingMode = 'idle';
          modeHoldTimer = 0;
        }
      } else {
        pendingMode = nextMode;
        modeHoldTimer = 0;
      }
    } else {
      pendingMode = 'idle';
      modeHoldTimer = 0;
    }
  }

  function onVisibilityChange() {
    pageVisible = !document.hidden;
    if (!mediaReady) return;
    if (!pageVisible) {
      setStatus(STATUS_PAUSED);
      return;
    }
    if (!handVisible || mode === 'idle') {
      setStatus(STATUS_SCANNING);
    } else {
      setStatus(`Gesture: ${mode}`);
    }
  }

  async function initMediaPipe() {
    if (!canUseCameraContext(window.isSecureContext, location.hostname)) {
      showError('Camera access requires HTTPS or localhost.');
      elLoader?.classList.add('hidden');
      return;
    }

    if (typeof Hands === 'undefined' || typeof Camera === 'undefined') {
      showError('MediaPipe resources failed to load. Check network and refresh.');
      elLoader?.classList.add('hidden');
      return;
    }

    try {
      mediaHands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });

      mediaHands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.55,
      });

      mediaHands.onResults(onResults);
    } catch (handInitErr) {
      console.error('[GestureOS] Hands model init failed:', handInitErr);
      showError(
        'Hand tracking model failed to initialize. Try refreshing or using a different browser.'
      );
      elLoader?.classList.add('hidden');
      return;
    }

    let inferErrors = 0;
    const MAX_INFER_ERRORS = 10;

    mediaCamera = new Camera(video, {
      onFrame: async () => {
        if (!pageVisible) return;
        if (!mediaHands) return;
        const now = performance.now();
        if (inferBusy || now - lastInferAt < INFER_INTERVAL_MS) return;
        inferBusy = true;
        lastInferAt = now;
        try {
          await mediaHands.send({ image: video });
          inferErrors = 0;
        } catch (err) {
          inferErrors++;
          console.warn(
            `[GestureOS] Inference error (${inferErrors}/${MAX_INFER_ERRORS}):`,
            err.message
          );
          if (inferErrors >= MAX_INFER_ERRORS) {
            setStatus('Inference unstable – retrying…');
            inferErrors = 0;
          }
        } finally {
          inferBusy = false;
        }
      },
      width: CAMERA_WIDTH,
      height: CAMERA_HEIGHT,
    });

    try {
      await mediaCamera.start();
      mediaReady = true;
      setStatus(STATUS_ONLINE);
      elLoader?.classList.add('hidden');
    } catch (err) {
      console.error(err);
      const msg = getCameraErrorMessage(err);
      showError(msg);
      elLoader?.classList.add('hidden');
    }
  }

  if (REDUCED_MOTION) {
    stage?.classList.add('reduced-motion');
  }

  // 资源清理 (SPA场景下防止泄漏)
  let rafId = null;
  let cleanedUp = false;
  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;

    if (rafId) cancelAnimationFrame(rafId);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('resize', resize);
    window.removeEventListener('error', onWindowError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);

    try {
      mediaCamera?.stop?.();
    } catch (err) {
      console.warn('[GestureOS] Failed to stop camera instance:', err);
    }

    try {
      mediaHands?.close?.();
    } catch (err) {
      console.warn('[GestureOS] Failed to close hands instance:', err);
    }
    mediaCamera = null;
    mediaHands = null;

    const stream = video.srcObject;
    if (stream && typeof stream.getTracks === 'function') {
      stream.getTracks().forEach((track) => track.stop());
    }
    video.srcObject = null;
  }
  window.addEventListener('beforeunload', cleanup, { once: true });
  window.addEventListener('pagehide', cleanup, { once: true });

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('resize', resize);
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  if (elErrorRetry) {
    elErrorRetry.addEventListener('click', () => {
      cleanup();
      window.location.reload();
    });
  }

  resize();
  setGesture('idle');
  rafId = requestAnimationFrame(tick);
  initMediaPipe();
})();
