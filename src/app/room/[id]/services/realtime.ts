import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { EmojiConfettiEvent } from '../types';

let eventsChannel: RealtimeChannel | null = null;
let eventsChannelRoomId: string | null = null;
let eventsChannelReadyPromise: Promise<boolean> | null = null;

function getOrCreateEventsChannel(roomId: string): RealtimeChannel {
  if (eventsChannel && eventsChannelRoomId === roomId) {
    return eventsChannel;
  }

  if (eventsChannel) {
    supabase.removeChannel(eventsChannel);
  }

  eventsChannel = supabase.channel(`room-events-${roomId}`, {
    config: { broadcast: { ack: true } },
  });
  eventsChannelRoomId = roomId;
  eventsChannelReadyPromise = null;
  return eventsChannel;
}

function ensureChannelSubscribed(channel: RealtimeChannel): Promise<boolean> {
  if (eventsChannelReadyPromise) {
    return eventsChannelReadyPromise;
  }

  eventsChannelReadyPromise = new Promise<boolean>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve(false);
    }, 6000);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        window.clearTimeout(timeoutId);
        resolve(true);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        window.clearTimeout(timeoutId);
        resolve(false);
      }
    });
  });

  return eventsChannelReadyPromise;
}

export async function sendEmojiConfetti(emoji: string, roomId: string, userId: string) {
  if (!roomId || !userId) return 'error';

  const payload: EmojiConfettiEvent = {
    type: 'emoji_confetti',
    emoji,
    userId,
    timestamp: Date.now(),
  };

  const channel = getOrCreateEventsChannel(roomId);
  const isSubscribed = await ensureChannelSubscribed(channel);

  if (!isSubscribed) {
    console.warn('Could not subscribe to room events channel; skipping emoji broadcast.');
    return 'timed out';
  }

  return channel.send({
    type: 'broadcast',
    event: 'emoji_confetti',
    payload,
  });
}
