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
  const [copied, setCopied] = useState(false);
  
  // User name and presence state
  const [userName, setUserName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [participants, setParticipants] = useState<{ userId: string; name: string }[]>([]);
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('poker_user_id');
      if (!id) {
        id = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('poker_user_id', id);
      }
      return id;
    }
    return '';
  });

  useEffect(() => {
    const savedName = localStorage.getItem('poker_user_name');
    if (savedName) {
      setUserName(savedName);
    } else {
      setShowNameModal(true);
    }
  }, []);

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

    const fetchRoomAndStories = async () => {
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

  useEffect(() => {
    if (!id || !userName) return;

    const channel = supabase.channel(`room-presence-${id}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: any[] = [];
        Object.keys(state).forEach((key) => {
          users.push(...state[key]);
        });
        // Deduplicate by userId
        const uniqueUsers = Array.from(new Map(users.map(u => [u.userId, u])).values());
        setParticipants(uniqueUsers as any);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            name: userName,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [id, userName, userId]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;

    localStorage.setItem('poker_user_name', trimmedName);
    setUserName(trimmedName);
    setShowNameModal(false);
  };

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

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Are you sure you want to delete this story?')) return;

    try {
      // Optimistically remove from local state
      setStories((current) => current.filter((s) => s.id !== storyId));

      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) {
        // Rollback if there's an error
        const { data: rollbackData } = await supabase
          .from('stories')
          .select('*')
          .eq('room_id', id)
          .order('created_at', { ascending: true });
        
        if (rollbackData) setStories(rollbackData);
        throw error;
      }
    } catch (err: any) {
      console.error('Error deleting story:', err);
      alert(err.message || 'Failed to delete story.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
             <button 
               onClick={handleCopyLink}
               className={`px-4 py-2 border rounded-lg text-sm transition-all flex items-center gap-2 ${
                 copied 
                   ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' 
                   : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900'
               }`}
             >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Copied!
                  </>
                ) : 'Copy Link'}
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
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button className="px-3 py-1 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded text-xs font-bold transition-all hover:scale-105 active:scale-95">
                                  Vote
                               </button>
                               {isAdmin && (
                                  <button 
                                    onClick={() => handleDeleteStory(story.id)}
                                    className="px-3 py-1 border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 rounded text-xs font-bold transition-all hover:scale-105 active:scale-95"
                                  >
                                     Delete
                                  </button>
                               )}
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
          
          <div className="space-y-6">
             <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="font-bold mb-4 text-zinc-900 dark:text-zinc-50 uppercase text-xs tracking-widest flex items-center justify-between">
                   Participants
                   <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] text-zinc-500 font-mono">
                      {participants.length}
                   </span>
                </h3>
                <div className="space-y-3">
                   {participants.length === 0 ? (
                      <p className="text-zinc-400 dark:text-zinc-600 italic text-sm">
                        No participants yet...
                      </p>
                   ) : (
                      participants.map((p) => (
                        <div key={p.userId} className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400">
                              {p.name.charAt(0).toUpperCase()}
                           </div>
                           <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {p.name} {p.userId === userId ? '(You)' : ''}
                           </span>
                        </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        </section>
      </div>

      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2 text-center">
              Welcome to the Room
            </h2>
            <p className="text-zinc-500 dark:text-zinc-500 text-sm text-center mb-6 leading-relaxed">
              Enter your name to start estimating stories with your team.
            </p>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="user-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Your Name
                </label>
                <input
                  id="user-name"
                  type="text"
                  required
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g., Jane Smith"
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 transition-all text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="w-full h-11 flex items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 font-semibold transition-all hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Join Room
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
