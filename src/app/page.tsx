'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('rooms')
        .insert([{ name: roomName }])
        .select()
        .single();

      if (supabaseError) throw supabaseError;

      if (data) {
        router.push(`/room/${data.id}`);
      }
    } catch (err: any) {
      console.error('Error creating room:', err);
      setError(err.message || 'Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-4">
      <main className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col gap-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Planning Poker
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Create a room to start estimating stories with your team.
          </p>
        </div>

        <form onSubmit={handleCreateRoom} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="room-name"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Room Name
            </label>
            <input
              id="room-name"
              type="text"
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="e.g., Sprint 42 Planning"
              className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !roomName.trim()}
            className="w-full flex h-12 items-center justify-center gap-2 rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Room'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Fast, simple, and real-time.
          </p>
        </div>
      </main>
    </div>
  );
}
