'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Room {
  id: string;
  name: string;
  created_at: string;
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRoom() {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRoom(data);
      } catch (err: any) {
        console.error('Error fetching room:', err);
        setError(err.message || 'Could not find this room.');
      } finally {
        setLoading(false);
      }
    }

    fetchRoom();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black font-sans">
        <p className="text-zinc-600 dark:text-zinc-400">Loading room details...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black font-sans text-center px-4">
        <h1 className="text-2xl font-bold text-red-500 mb-2">Room Not Found</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error || "This room doesn't exist or was deleted."}</p>
        <a href="/" className="px-6 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all font-medium">
          Go Back Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black font-sans p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-1">
              {room.name}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-500 text-sm">
              Room ID: <span className="font-mono">{room.id}</span>
            </p>
          </div>
          <div className="flex gap-3">
             <button className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 transition-all">
                Copy Link
             </button>
             <button className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all">
                Add Participant
             </button>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
             <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[300px] flex items-center justify-center">
                <p className="text-zinc-400 dark:text-zinc-600 text-center italic">
                  Story list and voting area will go here...
                </p>
             </div>
          </div>
          <div className="space-y-6">
             <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="font-bold mb-4 text-zinc-900 dark:text-zinc-50 uppercase text-xs tracking-widest">
                   Participants
                </h3>
                <p className="text-zinc-400 dark:text-zinc-600 italic text-sm">
                  No participants yet...
                </p>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
}
