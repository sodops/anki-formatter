import { onCLS, onLCP, onFCP, onTTFB, onINP, Metric } from 'web-vitals';

// Send metrics to analytics endpoint
function sendToAnalytics(metric: Metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // Always use fetch with credentials so Supabase auth cookies are sent.
  // navigator.sendBeacon does NOT send cookies, causing 401 errors.
  fetch('/api/analytics', {
    body,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    keepalive: true,
  }).catch(() => {
    // Silently ignore analytics failures — don't block the user
  });
}

// Report all available web vitals
export function reportWebVitals() {
  try {
    onCLS(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics);
  } catch (err) {
    console.error('Failed to report web vitals:', err);
  }
}
