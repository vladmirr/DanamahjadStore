/**
 * Sliding Active Indicator Pill Navigation (iOS / Dynamic Island Style)
 * Supports RTL and LTR layouts, window resize, and icon micro-animations.
 *
 * Usage:
 *   initSlidingNav();
 */
(function (global) {
  function initSlidingNav(containerSelector, indicatorSelector) {
    var container = document.querySelector(containerSelector || '.nav-pill-container');
    if (!container) return;

    var indicator = container.querySelector(indicatorSelector || '.nav-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'nav-indicator';
      container.prepend(indicator);
    }

    function updateIndicator(activeBtn) {
      if (!activeBtn) return;
      var containerRect = container.getBoundingClientRect();
      var btnRect = activeBtn.getBoundingClientRect();

      var leftOffset = btnRect.left - containerRect.left;
      var width = btnRect.width;

      indicator.style.width = width + 'px';
      indicator.style.transform = 'translateX(' + leftOffset + 'px)';
    }

    var buttons = container.querySelectorAll('.nav-item');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b) {
          b.classList.remove('nav-item-active');
        });
        btn.classList.add('nav-item-active');
        updateIndicator(btn);
      });
    });

    // Initial position
    var initialActive = container.querySelector('.nav-item-active') || buttons[0];
    if (initialActive) {
      updateIndicator(initialActive);
    }

    // Window resize observer
    window.addEventListener('resize', function () {
      var activeBtn = container.querySelector('.nav-item-active');
      if (activeBtn) {
        updateIndicator(activeBtn);
      }
    });

    return {
      update: updateIndicator,
    };
  }

  global.initSlidingNav = initSlidingNav;
})(typeof window !== 'undefined' ? window : this);

