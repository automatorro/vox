import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// The VAPID public key - must match the one stored as secret
const VAPID_PUBLIC_KEY = 'BEcjCKBnCzRYEcQwajjm29oWERVH9FhUzhbM_fqZXE8_GFk7kAju22N3E-N9ARXrgyyk9Ik4LKA_m30gc8GC4VM';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = (userId?: string) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check existing subscription on mount
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);
      reg.pushManager.getSubscription().then((sub) => {
        setIsSubscribed(!!sub);
      });
    });

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!userId || !registration) return false;

    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Subscribe to push
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });

      const json = subscription.toJSON();
      const endpoint = json.endpoint!;
      const p256dh = json.keys!.p256dh;
      const auth = json.keys!.auth;

      // Save to database (upsert by endpoint)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          { user_id: userId, endpoint, p256dh, auth },
          { onConflict: 'endpoint' }
        );

      if (error) {
        console.error('Failed to save push subscription:', error);
        toast({
          title: 'Eroare',
          description: 'Nu s-a putut salva subscripția push.',
          variant: 'destructive',
        });
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription error:', err);
      return false;
    }
  }, [userId, registration]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!registration) return false;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return true;

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      setIsSubscribed(false);
      return true;
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      return false;
    }
  }, [registration]);

  // Send a push notification to the current user via the edge function
  const sendPush = useCallback(async (title: string, body: string, tag?: string) => {
    if (!userId) return;

    try {
      await supabase.functions.invoke('web-push-send', {
        body: { userId, title, body, tag },
      });
    } catch (err) {
      console.error('Failed to send push notification:', err);
    }
  }, [userId]);

  return {
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    sendPush,
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
  };
};
