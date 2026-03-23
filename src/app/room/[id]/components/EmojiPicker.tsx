'use client';

import { sendEmojiConfetti } from '../services/realtime';
import { triggerEmojiConfetti } from '../services/emojiConfetti';

const EMOJIS = ['👍', '👎', '🎉', '🔥', '💀', '😂'] as const;

interface EmojiPickerProps {
  roomId: string;
  userId: string;
}

export function EmojiPicker({ roomId, userId }: EmojiPickerProps) {
  const handleEmojiClick = async (emoji: string) => {
    if (!roomId || !userId) return;
    triggerEmojiConfetti(emoji);
    try {
      await sendEmojiConfetti(emoji, roomId, userId);
    } catch (error) {
      console.error('Failed to send emoji confetti event:', error);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-3 py-2 shadow-sm backdrop-blur">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleEmojiClick(emoji)}
          className="h-10 w-10 rounded-lg text-xl transition-transform transition-colors hover:scale-110 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-600"
          aria-label={`Send ${emoji} confetti`}
          title={`Send ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
