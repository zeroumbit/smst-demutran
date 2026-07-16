import { supabase } from '@/lib/supabase';

const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string | undefined;

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const getSubscriptionKeys = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  return {
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
  };
};

export async function syncPushSubscription() {
  if (!publicKey) return { enabled: false, reason: 'missing-public-key' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { enabled: false, reason: 'unsupported' };
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return { enabled: false, reason: 'permission-not-granted' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const keys = getSubscriptionKeys(subscription);
  if (!keys.p256dh || !keys.auth) {
    return { enabled: false, reason: 'missing-keys' };
  }

  const { error } = await supabase.rpc('registrar_push_subscription', {
    p_endpoint: subscription.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: navigator.userAgent,
    p_plataforma: navigator.platform,
  });

  if (error) throw error;

  return { enabled: true, endpoint: subscription.endpoint };
}

export async function removePushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await supabase.rpc('remover_push_subscription', {
    p_endpoint: subscription.endpoint,
  });
  await subscription.unsubscribe();
}
