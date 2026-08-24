(function (global) {
  'use strict';

  const LOCAL_HOSTS = Object.freeze(['localhost', '127.0.0.1', '::1']);

  function isLocalHost(hostname) {
    return LOCAL_HOSTS.includes(hostname);
  }

  function canUseCameraContext(isSecureContext, hostname) {
    return Boolean(isSecureContext) || isLocalHost(hostname);
  }

  function resolveQualityMode(currentQuality, fpsValue, isMobile, reducedMotion) {
    if (currentQuality === 'high' && fpsValue < 38) {
      return 'low';
    }
    if (currentQuality === 'low' && fpsValue > 52 && !isMobile && !reducedMotion) {
      return 'high';
    }
    return currentQuality;
  }

  function getCameraErrorMessage(error) {
    const name = typeof error === 'string' ? error : error?.name;

    switch (name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Camera permission denied. Please allow access and refresh.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera detected on this device.';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'Camera is busy. Close other camera apps and retry.';
      case 'SecurityError':
        return 'Camera requires HTTPS or localhost.';
      case 'OverconstrainedError':
        return 'Camera does not support the requested resolution.';
      default:
        return 'Camera failed. Check permission and device.';
    }
  }

  global.GesturePolicies = Object.freeze({
    LOCAL_HOSTS,
    isLocalHost,
    canUseCameraContext,
    resolveQualityMode,
    getCameraErrorMessage,
  });
})(window);
