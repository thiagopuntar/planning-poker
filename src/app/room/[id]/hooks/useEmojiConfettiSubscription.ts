import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { EmojiConfettiEvent } from '../types';

type EmojiConfettiCallback = (emoji: string) => void;

export function useEmojiConfettiSubscription(roomId: string, callback: EmojiConfettiCallback) {
  const callbackRef = useRef(callback);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!roomId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`room-events-${roomId}`)
      .on('broadcast', { event: 'emoji_confetti' }, ({ payload }: { payload: EmojiConfettiEvent }) => {
        if (payload?.type !== 'emoji_confetti') return;
        if (typeof payload.emoji !== 'string') return;
        callbackRef.current(payload.emoji);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [roomId]);
}
