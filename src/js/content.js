// Enhanced content script with visual modes and intensity support
(function() {
  'use strict';

  const HOSTNAME = window.location.hostname;
  let currentSettings = {
    enabled: false,
    mode: 'grayscale',
    intensity: 100
  };

  // Wildcard matching function for whitelist patterns
  function matchesWhitelistPattern(hostname, pattern) {
    // Direct match
    if (hostname === pattern) {
      return true;
    }

    // Wildcard pattern matching
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2); // Remove "*."
      // Match exact domain or any subdomain
      return hostname === domain || hostname.endsWith('.' + domain);
    }

    return false;
  }

  // Check if hostname matches any pattern in whitelist
  function isWhitelisted(hostname, whitelist) {
    return whitelist.some(pattern => matchesWhitelistPattern(hostname, pattern));
  }

  // Sites that need special handling
  const PROBLEMATIC_SITES = [
    'pandora.com',
    'spotify.com',
    'netflix.com',
    'youtube.com',
    'twitch.tv'
  ];

  // Check if current site needs special handling
  const isProblematicSite = PROBLEMATIC_SITES.some(site => HOSTNAME.includes(site));

  // Initialize on page load
  initializeContent();

  async function initializeContent() {
    // Check if site is whitelisted
    const storage = await browser.storage.local.get(['grayscaleEnabled', 'visualMode', 'intensity', 'whitelist']);
    const whitelist = storage.whitelist || [];

    console.log('Grayscale Focus Debug:', {
      hostname: HOSTNAME,
      whitelist: whitelist,
      isWhitelisted: isWhitelisted(HOSTNAME, whitelist)
    });

    if (isWhitelisted(HOSTNAME, whitelist)) {
      console.log('Site is whitelisted, not applying effects');
      return; // Don't apply any effects to whitelisted sites
    }

    currentSettings = {
      enabled: storage.grayscaleEnabled || false,
      mode: storage.visualMode || 'grayscale',
      intensity: storage.intensity || 100
    };

    console.log('Current settings:', currentSettings);

    if (currentSettings.enabled) {
      applyVisualEffect();
    }
  }

  // Listen for messages from popup/background script
  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    // Always check whitelist first before applying any effects
    const storage = await browser.storage.local.get(['whitelist']);
    const whitelist = storage.whitelist || [];

    if (isWhitelisted(HOSTNAME, whitelist)) {
      console.log('Message received but site is whitelisted, ignoring:', message.action);
      sendResponse({success: true, whitelisted: true});
      return;
    }

    switch (message.action) {
      case 'toggleGrayscale':
        currentSettings.enabled = message.enabled;
        currentSettings.mode = message.mode || currentSettings.mode;
        currentSettings.intensity = message.intensity || currentSettings.intensity;

        if (message.enabled) {
          applyVisualEffect();
        } else {
          removeVisualEffect();
        }
        break;

      case 'updateVisualMode':
        currentSettings.mode = message.mode;
        currentSettings.intensity = message.intensity || currentSettings.intensity;
        if (currentSettings.enabled) {
          applyVisualEffect();
        }
        break;

      case 'updateIntensity':
        currentSettings.intensity = message.intensity;
        currentSettings.mode = message.mode || currentSettings.mode;
        if (currentSettings.enabled) {
          applyVisualEffect();
        }
        break;

      case 'checkWhitelist':
        // Re-initialize to check if site should be whitelisted
        initializeContent();
        break;
    }

    sendResponse({success: true});
  });

  // Listen for storage changes (including whitelist updates)
  browser.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.whitelist) {
      const newWhitelist = changes.whitelist.newValue || [];

      if (isWhitelisted(HOSTNAME, newWhitelist)) {
        // Site was added to whitelist - remove effects
        removeVisualEffect();
      } else {
        // Site was removed from whitelist - re-initialize
        await initializeContent();
      }
    }
  });

  function applyVisualEffect() {
    // Remove any existing style first
    removeVisualEffect();

    // Create dynamic style element
    const style = document.createElement('style');
    style.id = 'grayscale-focus-style';

    const intensityFactor = currentSettings.intensity / 100;
    let filterValue = '';

    // Generate filter based on visual mode
    switch (currentSettings.mode) {
      case 'grayscale':
        filterValue = `grayscale(${intensityFactor})`;
        break;
      case 'sepia':
        filterValue = `sepia(${intensityFactor})`;
        break;
      case 'blur':
        filterValue = `blur(${intensityFactor * 2}px)`;
        break;
      case 'contrast':
        filterValue = `contrast(${1 - (intensityFactor * 0.8)})`;
        break;
      case 'desaturate':
        filterValue = `saturate(${1 - intensityFactor})`;
        break;
      case 'invert':
        filterValue = `invert(${intensityFactor})`;
        break;
      default:
        filterValue = `grayscale(${intensityFactor})`;
    }

    if (isProblematicSite) {
      // Use more conservative approach for problematic sites
      style.textContent = `
        /* Conservative approach - target main containers only */
        body {
          filter: ${filterValue} !important;
        }

        /* Ensure media elements still work */
        video, audio, canvas {
          filter: none !important;
        }

        /* Preserve interactive elements' hover states */
        button:hover, [role="button"]:hover, a:hover {
          filter: ${filterValue} brightness(1.1) !important;
        }
      `;
    } else {
      // Standard approach for most sites
      style.textContent = `
        html {
          filter: ${filterValue} !important;
        }
      `;
    }

    document.head.appendChild(style);
    document.documentElement.classList.add('visual-focus-mode');
    document.documentElement.setAttribute('data-visual-mode', currentSettings.mode);

    // Handle iframes more carefully
    handleIframes(true);
  }

  function removeVisualEffect() {
    // Remove injected style
    const style = document.getElementById('grayscale-focus-style');
    if (style) {
      style.remove();
    }

    // Remove class and attributes
    document.documentElement.classList.remove('visual-focus-mode');
    document.documentElement.removeAttribute('data-visual-mode');

    // Handle iframes
    handleIframes(false);
  }

  function handleIframes(enable) {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      try {
        if (iframe.contentDocument) {
          if (enable) {
            iframe.contentDocument.documentElement.classList.add('visual-focus-mode');
            iframe.contentDocument.documentElement.setAttribute('data-visual-mode', currentSettings.mode);
          } else {
            iframe.contentDocument.documentElement.classList.remove('visual-focus-mode');
            iframe.contentDocument.documentElement.removeAttribute('data-visual-mode');
          }
        }
      } catch (e) {
        // Cross-origin iframe, can't access - ignore silently
      }
    });
  }

  // Handle dynamic content and SPAs
  const observer = new MutationObserver((mutations) => {
    if (currentSettings.enabled) {
      // Re-apply visual effect if it was enabled and new content was added
      if (!document.documentElement.classList.contains('visual-focus-mode')) {
        applyVisualEffect();
      }
    }
  });

  // Start observing
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

})();
