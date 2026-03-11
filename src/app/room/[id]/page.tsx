'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Room {
  id: string;
  name: string;
  created_at: string;
}

interface Story {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'voting' | 'revealed';
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Story form state
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [isAddingStory, setIsAddingStory] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Check if this user is the admin (from localStorage)
    const adminStatus = localStorage.getItem(`room_admin_${id}`);
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }

    async function fetchRoomAndStories() {
      try {
        // Fetch room
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', id)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        // Fetch stories
        const { data: storiesData, error: storiesError } = await supabase
          .from('stories')
          .select('*')
          .eq('room_id', id)
          .order('created_at', { ascending: true });

        if (storiesError) throw storiesError;
        setStories(storiesData || []);

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Could not find this room.');
      } finally {
        setLoading(false);
      }
    }

    fetchRoomAndStories();

    // Subscribe to stories for real-time updates
    const channel = supabase
      .channel(`room-stories-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: `room_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newStory = payload.new as Story;
            setStories((current) => {
              // Avoid duplicates if we already added it manually
              if (current.find(s => s.id === newStory.id)) return current;
              return [...current, newStory];
            });
          } else if (payload.eventType === 'UPDATE') {
            setStories((current) =>
              current.map((s) => (s.id === payload.new.id ? (payload.new as Story) : s))
            );
          } else if (payload.eventType === 'DELETE') {
            setStories((current) => current.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleAddStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryTitle.trim() || !id) return;

    setIsAddingStory(true);
    try {
      const { data, error } = await supabase
        .from('stories')
        .insert([{ room_id: id, title: newStoryTitle.trim() }])
        .select()
        .single();

      if (error) throw error;
      
      // Update local state immediately for the creator for better UX
      if (data) {
        setStories((current) => {
          if (current.find(s => s.id === data.id)) return current;
          return [...current, data as Story];
        });
      }
      
      setNewStoryTitle('');
    } catch (err: any) {
      console.error('Error adding story:', err);
      alert(err.message || 'Failed to add story.');
    } finally {
      setIsAddingStory(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black font-sans text-zinc-600 dark:text-zinc-400">
        Loading room details...
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
            <div className="flex items-center gap-2 mb-1">
               <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {room.name}
              </h1>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                   Admin
                </span>
              )}
            </div>
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
             {isAdmin && (
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                   <h3 className="font-bold mb-4 text-zinc-900 dark:text-zinc-50 uppercase text-xs tracking-widest">
                      Create Story
                   </h3>
                   <form onSubmit={handleAddStory} className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Story title (e.g. CORE-123)"
                        className="flex-1 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
                        value={newStoryTitle}
                        onChange={(e) => setNewStoryTitle(e.target.value)}
                        disabled={isAddingStory}
                      />
                      <button 
                        type="submit"
                        disabled={isAddingStory || !newStoryTitle.trim()}
                        className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                      >
                         Add
                      </button>
                   </form>
                </div>
             )}

             <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                   <h3 className="font-bold text-zinc-900 dark:text-zinc-50 uppercase text-[10px] tracking-widest">
                      User Stories
                   </h3>
                </div>
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                   {stories.length === 0 ? (
                      <div className="p-12 flex items-center justify-center">
                         <p className="text-zinc-400 dark:text-zinc-600 text-center italic text-sm">
                           No stories created yet. {isAdmin ? 'Add one above!' : ''}
                         </p>
                      </div>
                   ) : (
                      stories.map((story) => (
                         <div key={story.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all group">
                            <div>
                               <p className="font-medium text-zinc-900 dark:text-zinc-50">{story.title}</p>
                               <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-tight">
                                  {story.status}
                               </span>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                               <button className="px-3 py-1 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded text-xs font-bold">
                                  Vote
                               </button>
                            </div>
                         </div>
                      ))
                   )}
                </div>
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
