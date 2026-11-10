/**
 * Ultra-Modern, High-Performance Interactive Background for Dana Mahjad Dashboard
 *
 * Features:
 * - Fixed full-screen canvas behind all UI layers (#dashboard-bg).
 * - Smooth velocity-interpolated (lerped) cursor spotlight.
 * - Dual radial glow: soft financial cyan/emerald (#10b981) + deep electric blue (#3b82f6).
 * - Illuminated micro-grid overlay with glowing intersection dots under cursor radius (~220px).
 * - Mobile / Touch battery-saver fallback (gentle floating ambient aura, no mouse listeners, DPR 1).
 * - Visibility API optimization (pauses RAF loop when tab is hidden or minimized).
 */

export interface DashboardBgOptions {
  canvasId?: string;
  gridSize?: number;
  spotlightRadius?: number;
}

export function initDashboardBackground(options: DashboardBgOptions = {}) {
  const canvasId = options.canvasId || 'dashboard-bg';
  let canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;

  // Create canvas element if not present in DOM
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = canvasId;
    document.body.prepend(canvas);
  }

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  // Touch / Mobile Detection
  const isTouch =
    typeof window !== 'undefined' &&
    (('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));

  const dpr = isTouch ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const gridSize = options.gridSize || 38;
  const spotRadius = options.spotlightRadius || (isTouch ? 180 : 230);

  let width = window.innerWidth;
  let height = window.innerHeight;

  // Mouse & Lerp State
  let currX = width * 0.5;
  let currY = height * 0.35;
  let targetX = currX;
  let targetY = currY;

  let rafId: number | null = null;
  let isRunning = false;
  let isTabVisible = !document.hidden;

  function resize() {
    if (!canvas) return;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx!.scale(dpr, dpr);
  }

  resize();

  // Desktop Mouse Listeners
  function onMouseMove(e: MouseEvent) {
    targetX = e.clientX;
    targetY = e.clientY;
  }

  function onMouseLeave() {
    targetX = width * 0.5;
    targetY = height * 0.35;
  }

  if (!isTouch) {
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onMouseLeave);
  }

  // Window Resize
  let resizeTimeout: any = null;
  function onWindowResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      resize();
    }, 100);
  }
  window.addEventListener('resize', onWindowResize, { passive: true });

  // Tab Visibility Change (Battery & CPU conservation)
  function onVisibilityChange() {
    isTabVisible = !document.hidden;
    if (isTabVisible && !isRunning) {
      start();
    } else if (!isTabVisible && isRunning) {
      stop();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Render Loop
  function render(now: number) {
    if (!isRunning || !isTabVisible || !ctx) return;

    if (isTouch) {
      // Mobile slow floating ambient aura (low battery consumption)
      const t = now * 0.0005;
      targetX = width * 0.5 + Math.sin(t) * (width * 0.25);
      targetY = height * 0.38 + Math.cos(t * 1.2) * (height * 0.16);
      currX += (targetX - currX) * 0.04;
      currY += (targetY - currY) * 0.04;
    } else {
      // Desktop velocity interpolation (smooth lerping)
      currX += (targetX - currX) * 0.075;
      currY += (targetY - currY) * 0.075;
    }

    // 1. Deep Midnight Slate Canvas Base (#07090e)
    ctx.fillStyle = '#07090e';
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient Corner Gradients for Visual Depth
    const trGrad = ctx.createRadialGradient(width, 0, 0, width, 0, width * 0.7);
    trGrad.addColorStop(0, 'rgba(30, 41, 59, 0.18)');
    trGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = trGrad;
    ctx.fillRect(0, 0, width, height);

    const blGrad = ctx.createRadialGradient(0, height, 0, 0, height, width * 0.6);
    blGrad.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
    blGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = blGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Dynamic Interactive Dual Glow
    // Glow A: Deep Blue / Electric Indigo
    const bx = currX + 45;
    const by = currY + 30;
    const blueGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 540);
    blueGrad.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
    blueGrad.addColorStop(0.35, 'rgba(37, 99, 235, 0.05)');
    blueGrad.addColorStop(0.7, 'rgba(30, 58, 138, 0.015)');
    blueGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = blueGrad;
    ctx.fillRect(0, 0, width, height);

    // Glow B: Soft Cyan / Financial Emerald Glow
    const gx = currX - 35;
    const gy = currY - 25;
    const emeraldGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 460);
    emeraldGrad.addColorStop(0, 'rgba(16, 185, 129, 0.085)');
    emeraldGrad.addColorStop(0.35, 'rgba(6, 182, 212, 0.045)');
    emeraldGrad.addColorStop(0.75, 'rgba(16, 185, 129, 0.012)');
    emeraldGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
    ctx.fillStyle = emeraldGrad;
    ctx.fillRect(0, 0, width, height);

    // 4. Subtle Hairline Background Grid (Single Draw Call for Maximum FPS)
    ctx.beginPath();
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 5. Localized Illuminated Spotlight Grid & Micro-Dots under Cursor
    ctx.save();
    ctx.beginPath();
    ctx.arc(currX, currY, spotRadius, 0, Math.PI * 2);
    ctx.clip();

    // Radial gradient for illuminated lines in spotlight
    const spotGrad = ctx.createRadialGradient(currX, currY, 0, currX, currY, spotRadius);
    spotGrad.addColorStop(0, 'rgba(52, 211, 153, 0.15)'); // soft emerald
    spotGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.09)'); // soft cyan
    spotGrad.addColorStop(0.85, 'rgba(59, 130, 246, 0.03)'); // soft blue
    spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.strokeStyle = spotGrad;
    ctx.lineWidth = 1.2;

    const startX = Math.floor((currX - spotRadius) / gridSize) * gridSize;
    const endX = Math.ceil((currX + spotRadius) / gridSize) * gridSize;
    const startY = Math.floor((currY - spotRadius) / gridSize) * gridSize;
    const endY = Math.ceil((currY + spotRadius) / gridSize) * gridSize;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x, currY - spotRadius);
      ctx.lineTo(x, currY + spotRadius);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(currX - spotRadius, y);
      ctx.lineTo(currX + spotRadius, y);
    }
    ctx.stroke();

    // Glowing micro-dots at grid intersections inside spotlight
    ctx.fillStyle = spotGrad;
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        const d = Math.hypot(x - currX, y - currY);
        if (d < spotRadius) {
          ctx.beginPath();
          ctx.arc(x, y, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    rafId = requestAnimationFrame(render);
  }

  function start() {
    if (!isRunning && isTabVisible) {
      isRunning = true;
      rafId = requestAnimationFrame(render);
    }
  }

  function stop() {
    isRunning = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  start();

  // Cleanup helper
  return function cleanup() {
    stop();
    if (!isTouch) {
      window.removeEventListener('mousemove', onMouseMove);
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
    }
    window.removeEventListener('resize', onWindowResize);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    clearTimeout(resizeTimeout);
  };
}
