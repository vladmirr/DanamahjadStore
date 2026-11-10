/**
 * Ultra-Modern Interactive Spotlight & Animated Grid Background
 * Plug-and-play Vanilla JS Module for Dana Mahjad Dashboard
 *
 * Usage:
 *   initDashboardBackground();
 */
(function (global) {
  function initDashboardBackground(options) {
    options = options || {};
    var canvasId = options.canvasId || 'dashboard-bg';
    var canvas = document.getElementById(canvasId);

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = canvasId;
      document.body.prepend(canvas);
    }

    var ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return function () {};

    var isTouch =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0) ||
        (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));

    var dpr = isTouch ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    var gridSize = options.gridSize || 38;
    var spotRadius = options.spotlightRadius || (isTouch ? 180 : 230);

    var width = window.innerWidth;
    var height = window.innerHeight;

    var currX = width * 0.5;
    var currY = height * 0.35;
    var targetX = currX;
    var targetY = currY;

    var rafId = null;
    var isRunning = false;
    var isTabVisible = !document.hidden;

    function resize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);
    }

    resize();

    function onMouseMove(e) {
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

    var resizeTimeout = null;
    function onWindowResize() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 100);
    }
    window.addEventListener('resize', onWindowResize, { passive: true });

    function onVisibilityChange() {
      isTabVisible = !document.hidden;
      if (isTabVisible && !isRunning) {
        start();
      } else if (!isTabVisible && isRunning) {
        stop();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    function render(now) {
      if (!isRunning || !isTabVisible || !ctx) return;

      if (isTouch) {
        var t = now * 0.0005;
        targetX = width * 0.5 + Math.sin(t) * (width * 0.25);
        targetY = height * 0.38 + Math.cos(t * 1.2) * (height * 0.16);
        currX += (targetX - currX) * 0.04;
        currY += (targetY - currY) * 0.04;
      } else {
        currX += (targetX - currX) * 0.075;
        currY += (targetY - currY) * 0.075;
      }

      // 1. Deep Midnight Slate Canvas Base (#07090e)
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, width, height);

      // 2. Ambient Corner Gradients
      var trGrad = ctx.createRadialGradient(width, 0, 0, width, 0, width * 0.7);
      trGrad.addColorStop(0, 'rgba(30, 41, 59, 0.18)');
      trGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = trGrad;
      ctx.fillRect(0, 0, width, height);

      var blGrad = ctx.createRadialGradient(0, height, 0, 0, height, width * 0.6);
      blGrad.addColorStop(0, 'rgba(15, 23, 42, 0.22)');
      blGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = blGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Dynamic Interactive Dual Glow
      var bx = currX + 45;
      var by = currY + 30;
      var blueGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 540);
      blueGrad.addColorStop(0, 'rgba(59, 130, 246, 0.12)');
      blueGrad.addColorStop(0.35, 'rgba(37, 99, 235, 0.05)');
      blueGrad.addColorStop(0.7, 'rgba(30, 58, 138, 0.015)');
      blueGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = blueGrad;
      ctx.fillRect(0, 0, width, height);

      var gx = currX - 35;
      var gy = currY - 25;
      var emeraldGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, 460);
      emeraldGrad.addColorStop(0, 'rgba(16, 185, 129, 0.085)');
      emeraldGrad.addColorStop(0.35, 'rgba(6, 182, 212, 0.045)');
      emeraldGrad.addColorStop(0.75, 'rgba(16, 185, 129, 0.012)');
      emeraldGrad.addColorStop(1, 'rgba(7, 9, 14, 0)');
      ctx.fillStyle = emeraldGrad;
      ctx.fillRect(0, 0, width, height);

      // 4. Hairline Background Grid
      ctx.beginPath();
      for (var x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (var y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 5. Localized Illuminated Spotlight Grid & Micro-Dots
      ctx.save();
      ctx.beginPath();
      ctx.arc(currX, currY, spotRadius, 0, Math.PI * 2);
      ctx.clip();

      var spotGrad = ctx.createRadialGradient(currX, currY, 0, currX, currY, spotRadius);
      spotGrad.addColorStop(0, 'rgba(52, 211, 153, 0.15)');
      spotGrad.addColorStop(0.45, 'rgba(56, 189, 248, 0.09)');
      spotGrad.addColorStop(0.85, 'rgba(59, 130, 246, 0.03)');
      spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.strokeStyle = spotGrad;
      ctx.lineWidth = 1.2;

      var startX = Math.floor((currX - spotRadius) / gridSize) * gridSize;
      var endX = Math.ceil((currX + spotRadius) / gridSize) * gridSize;
      var startY = Math.floor((currY - spotRadius) / gridSize) * gridSize;
      var endY = Math.ceil((currY + spotRadius) / gridSize) * gridSize;

      ctx.beginPath();
      for (var sx = startX; sx <= endX; sx += gridSize) {
        ctx.moveTo(sx, currY - spotRadius);
        ctx.lineTo(sx, currY + spotRadius);
      }
      for (var sy = startY; sy <= endY; sy += gridSize) {
        ctx.moveTo(currX - spotRadius, sy);
        ctx.lineTo(currX + spotRadius, sy);
      }
      ctx.stroke();

      ctx.fillStyle = spotGrad;
      for (var dx = startX; dx <= endX; dx += gridSize) {
        for (var dy = startY; dy <= endY; dy += gridSize) {
          var d = Math.hypot(dx - currX, dy - currY);
          if (d < spotRadius) {
            ctx.beginPath();
            ctx.arc(dx, dy, 1.4, 0, Math.PI * 2);
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

  global.initDashboardBackground = initDashboardBackground;
})(typeof window !== 'undefined' ? window : this);
