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

interface Vote {
  id: string;
  story_id: string;
  participant_id: string;
  vote_value: string;
}

const CARD_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];

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
  const [participants, setParticipants] = useState<{ userId: string; name: string; participantId?: string }[]>([]);
  const [dbParticipants, setDbParticipants] = useState<{ id: string; name: string; user_id: string }[]>([]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  
  // Story form state
  const [newStoryTitle, setNewStoryTitle] = useState('');
  const [isAddingStory, setIsAddingStory] = useState(false);

  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('poker_user_id');
      // If it's not a UUID-like format (36 chars), generate a new one
      if (!id || id.length < 30) {
        id = crypto.randomUUID();
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
  // Active story is either the one currently being voted on OR the most recently revealed one
  const votingStory = stories.find(s => s.status === 'voting');
  const revealedStory = [...stories].reverse().find(s => s.status === 'revealed');
  const activeStory = votingStory || revealedStory;

  const getVoteForParticipant = (pId: string, sId: string) => {
    return votes.find(v => v.participant_id === pId && v.story_id === sId)?.vote_value;
  };

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
        const storiesList = storiesData || [];
        setStories(storiesList);

        // Fetch participants from DB
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('id, name, user_id')
          .eq('room_id', id);

        if (participantsError) throw participantsError;
        setDbParticipants(participantsData || []);

        // Fetch votes for these stories
        if (storiesList.length > 0) {
          const { data: votesData, error: votesError } = await supabase
            .from('votes')
            .select('*')
            .in('story_id', storiesList.map(s => s.id));
          
          if (votesError) throw votesError;
          setVotes(votesData || []);
        }

      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Could not find this room.');
      } finally {
        setLoading(false);
      }
    }

    fetchRoomAndStories();

    // Subscribe to stories for real-time updates
    const storiesChannel = supabase
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
              if (current.find(s => s.id === newStory.id)) return current;
              return [...current, newStory];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedStory = payload.new as Story;
            setStories((current) =>
              current.map((s) => (s.id === updatedStory.id ? updatedStory : s))
            );
            
            // If revealed, re-fetch votes to ensure completeness for all participants
            if (updatedStory.status === 'revealed') {
              supabase
                .from('votes')
                .select('*')
                .eq('story_id', updatedStory.id)
                .then(({ data }) => {
                  if (data) {
                    setVotes(current => {
                      const filtered = current.filter(v => v.story_id !== updatedStory.id);
                      return [...filtered, ...data];
                    });
                  }
                });
            }
          } else if (payload.eventType === 'DELETE') {
            setStories((current) => current.filter((s) => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to participants for real-time updates
    const participantsChannel = supabase
      .channel(`room-db-participants-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newP = payload.new as any;
            setDbParticipants(current => {
              const filtered = current.filter(p => p.id !== newP.id);
              return [...filtered, newP];
            });
          } else if (payload.eventType === 'DELETE') {
            setDbParticipants(current => current.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to votes for real-time updates
    const votesChannel = supabase
      .channel(`room-votes-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newVote = payload.new as Vote;
            setVotes((current) => {
              // Deduplicate by story_id and participant_id to avoid duplication with optimistic updates
              const filtered = current.filter(v => 
                !(v.story_id === newVote.story_id && v.participant_id === newVote.participant_id)
              );
              return [...filtered, newVote];
            });
          } else if (payload.eventType === 'DELETE') {
            setVotes((current) => current.filter((v) => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(votesChannel);
    };
  }, [id]);

  useEffect(() => {
    if (!id || !userName || !userId) return;

    const joinRoom = async () => {
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('room_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingParticipant) {
        setParticipantId(existingParticipant.id);
        return;
      }

      const { data, error } = await supabase
        .from('participants')
        .insert([{ 
          room_id: id, 
          user_id: userId, 
          name: userName 
        }])
        .select()
        .single();

      if (error) {
        console.error('Error joining participants table:', error);
        return;
      }
      if (data) setParticipantId(data.id);
    };

    joinRoom();
  }, [id, userName, userId]);

  // Separate effect for participant cleanup
  useEffect(() => {
    if (!participantId) return;

    // Cleanup function to remove participant from DB when leaving
    return () => {
      supabase
        .from('participants')
        .delete()
        .eq('id', participantId)
        .then();
    };
  }, [participantId]);

  // Handle window/tab close explicitly with keepalive fetch
  useEffect(() => {
    if (!participantId) return;

    const handleBeforeUnload = () => {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/participants?id=eq.${participantId}`, {
        method: 'DELETE',
        keepalive: true,
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          'Content-Type': 'application/json'
        }
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [participantId]);

  useEffect(() => {
    if (!id || !userName || !userId || !participantId) return;

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
            participantId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [id, userName, userId, participantId]);

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

  useEffect(() => {
    const votingStories = stories.filter(s => s.status === 'voting');
    if (votingStories.length > 0) {
      const votingStoryIds = new Set(votingStories.map(s => s.id));
      setVotes(current => {
        // We only want to clear votes if they were from a previous round
        // This is tricky because we don't know when they were cast
        // But the admin clears them in the DB when starting a vote
        // So we can just wait for the 'DELETE' events from the subscription
        return current;
      });
    }
  }, [stories]);

  const handleVote = async (storyId: string, value: string) => {
    if (!participantId) return;

    // Optimistic update
    const tempVote: Vote = {
      id: `temp-${Math.random()}`,
      story_id: storyId,
      participant_id: participantId,
      vote_value: value
    };

    setVotes(current => {
      const filtered = current.filter(v => !(v.participant_id === participantId && v.story_id === storyId));
      return [...filtered, tempVote];
    });

    try {
      const { data, error } = await supabase
        .from('votes')
        .upsert(
          {
            story_id: storyId,
            participant_id: participantId,
            vote_value: value,
          },
          {
            onConflict: 'story_id,participant_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      
      // Update the optimistic vote with the real one
      if (data) {
        setVotes(current => current.map(v => v.id === tempVote.id ? (data as Vote) : v));
      }
    } catch (err: any) {
      console.error('Error voting:', err);
      // Rollback optimistic update on error
      setVotes(current => current.filter(v => v.id !== tempVote.id));
      alert(err.message || 'Failed to submit vote.');
    }
  };

  const updateStoryStatus = async (storyId: string, status: Story['status']) => {
    if (!isAdmin) return;

    try {
      // If we are starting a new vote, make sure no other story is currently 'voting'
      if (status === 'voting') {
        const { error: resetError } = await supabase
          .from('stories')
          .update({ status: 'pending' })
          .eq('room_id', id)
          .eq('status', 'voting');
        
        if (resetError) throw resetError;

        // Also clear previous votes for this specific story when starting voting session
        await supabase
          .from('votes')
          .delete()
          .eq('story_id', storyId);
        
        setVotes(v => v.filter(vote => vote.story_id !== storyId));
      }

      const { data: updatedStory, error } = await supabase
        .from('stories')
        .update({ status })
        .eq('id', storyId)
        .select()
        .single();

      if (error) throw error;

      // If revealing, re-fetch votes immediately for the admin to see everything
      if (status === 'revealed' && updatedStory) {
        const { data: votesData } = await supabase
          .from('votes')
          .select('*')
          .eq('story_id', updatedStory.id);
        
        if (votesData) {
          setVotes(current => {
            const filtered = current.filter(v => v.story_id !== updatedStory.id);
            return [...filtered, ...votesData];
          });
        }
      }
      
    } catch (err: any) {
      console.error('Error updating story status:', err);
      alert(err.message || 'Failed to update status.');
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
             <button 
               onClick={handleCopyLink}
               className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
             >
                Add Participant
             </button>
          </div>
        </header>

        <section className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
             {activeStory && (
               <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-zinc-900 dark:bg-zinc-50" />
                 <div className="flex justify-between items-start mb-6">
                   <div>
                     <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2 block">
                       {activeStory.status === 'voting' ? 'Current Voting' : 'Voting Results'}
                     </span>
                     <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{activeStory.title}</h2>
                   </div>
                   {isAdmin && (
                     <div className="flex gap-2">
                       {activeStory.status === 'voting' ? (
                         <button 
                           onClick={() => updateStoryStatus(activeStory.id, 'revealed')}
                           className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-xs font-bold hover:scale-105 transition-all"
                         >
                           Reveal Votes
                         </button>
                       ) : (
                         <button 
                           onClick={() => updateStoryStatus(activeStory.id, 'voting')}
                           className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                         >
                           Reset & Re-vote
                         </button>
                       )}
                     </div>
                   )}
                 </div>

                 {activeStory.status === 'voting' ? (
                   <div className="flex flex-wrap gap-3 justify-center mt-8">
                     {!participantId && (
                       <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                         <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg text-xs font-medium text-zinc-500 animate-pulse">
                           Syncing session...
                         </div>
                       </div>
                     )}
                     {CARD_VALUES.map((val) => {
                       const currentVote = participantId ? getVoteForParticipant(participantId, activeStory.id) : null;
                       const isSelected = currentVote === val;
                       return (
                         <button
                           key={val}
                           onClick={() => handleVote(activeStory.id, val)}
                           disabled={!participantId}
                           className={`w-12 h-16 md:w-14 md:h-20 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                             isSelected 
                               ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-900 scale-110 shadow-lg' 
                               : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                           }`}
                         >
                           {val}
                         </button>
                       );
                     })}
                   </div>
                 ) : (
                   <div className="mt-8 flex flex-wrap gap-4 justify-center">
                     {votes.filter(v => v.story_id === activeStory.id).map((v) => {
                       const p = dbParticipants.find(p => p.id === v.participant_id);
                       return (
                         <div key={v.id} className="flex flex-col items-center gap-2">
                           <div className="w-14 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-2xl text-zinc-900 dark:text-zinc-50 shadow-inner">
                             {v.vote_value}
                           </div>
                           <span className="text-[10px] font-medium text-zinc-500 uppercase truncate max-w-[60px]">
                             {p?.name || 'User'}
                           </span>
                         </div>
                       );
                     })}
                     {votes.filter(v => v.story_id === activeStory.id).length === 0 && (
                       <p className="text-zinc-400 italic text-sm py-4">No votes were cast.</p>
                     )}
                   </div>
                 )}
               </div>
             )}

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
                               <span className={`text-[10px] uppercase font-bold tracking-tight ${
                                 story.status === 'voting' ? 'text-green-500' :
                                 story.status === 'revealed' ? 'text-blue-500' :
                                 'text-zinc-400 dark:text-zinc-500'
                               }`}>
                                  {story.status}
                               </span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               {isAdmin && story.status !== 'voting' && (
                                 <button 
                                   onClick={() => updateStoryStatus(story.id, 'voting')}
                                   className="px-3 py-1 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded text-xs font-bold transition-all hover:scale-105 active:scale-95"
                                 >
                                    Start Voting
                                 </button>
                               )}
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
                      dbParticipants
                        .filter(p => participants.some(op => op.userId === p.user_id))
                        .map((p) => {
                          const hasVoted = votingStory && votes.some(v => v.participant_id === p.id && v.story_id === votingStory.id);
                          const revealedVote = revealedStory && votes.find(v => v.participant_id === p.id && v.story_id === revealedStory.id);

                          return (
                            <div key={p.id} className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                    {p.name.charAt(0).toUpperCase()}
                                 </div>
                                 <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    {p.name} {p.user_id === userId ? '(You)' : ''}
                                 </span>
                               </div>
                               <div className="flex items-center gap-2">
                                  {hasVoted && !revealedStory && (
                                     <div className="w-6 h-8 bg-zinc-900 dark:bg-zinc-50 rounded border-2 border-zinc-200 dark:border-zinc-800 animate-pulse" title="Voted" />
                                  )}
                                  {revealedVote && (
                                     <div className="w-6 h-8 bg-white dark:bg-zinc-800 rounded border-2 border-zinc-900 dark:border-zinc-50 flex items-center justify-center font-bold text-xs text-zinc-900 dark:text-zinc-50">
                                        {revealedVote.vote_value}
                                     </div>
                                  )}
                               </div>
                            </div>
                          );
                        })
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
