import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Room, Story, Vote, Participant } from '../types';

export function useRoomData(id: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [dbParticipants, setDbParticipants] = useState<Participant[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchInitialData = async () => {
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
    };

    fetchInitialData();

    // Subscribe to stories
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
            
            // If revealed, re-fetch votes to ensure completeness
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

    // Subscribe to participants
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

    // Subscribe to votes
    const votesChannel = supabase
      .channel(`room-votes-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newVote = payload.new as Vote;
            setVotes((current) => {
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

  return { room, stories, dbParticipants, votes, loading, error, setStories, setVotes };
}
