import { router, type Href } from 'expo-router';

export function goBackOrReplace(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Leaves the auth flow. The flow is a modal opened from a tab, so dismissing it
 * returns to whatever the user was doing; opening a sign-in URL directly has no
 * modal to dismiss, hence the fallback route.
 */
export function closeAuthFlow(fallback: Href = '/upload') {
  if (router.canDismiss()) {
    router.dismissAll();
    return;
  }
  router.replace(fallback);
}
