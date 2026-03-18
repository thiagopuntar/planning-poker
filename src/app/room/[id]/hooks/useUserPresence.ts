import { useState, useEffect, FormEvent, Dispatch, SetStateAction } from 'react';
import { supabase } from '@/lib/supabase';
import { OnlineUser, Participant } from '../types';

interface UseUserPresenceProps {
  id: string;
  setDbParticipants?: Dispatch<SetStateAction<Participant[]>>;
}

export function useUserPresence(id: string, setDbParticipants?: Dispatch<SetStateAction<Participant[]>>) {
  const [userName, setUserName] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [participants, setParticipants] = useState<OnlineUser[]>([]);
  const [participantId, setParticipantId] = useState<string | null>(null);

  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('poker_user_id');
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

  const handleNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;

    localStorage.setItem('poker_user_name', trimmedName);
    setUserName(trimmedName);
    setShowNameModal(false);
  };

  useEffect(() => {
    if (!id || !userName || !userId) return;

    const joinRoom = async () => {
      const { data: existingParticipant } = await supabase
        .from('participants')
        .select('id, name, user_id')
        .eq('room_id', id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingParticipant) {
        setParticipantId(existingParticipant.id);
        
        // Update name if it's different
        if (existingParticipant.name !== userName) {
          await supabase
            .from('participants')
            .update({ name: userName })
            .eq('id', existingParticipant.id);
          
          if (setDbParticipants) {
            setDbParticipants(current => 
              current.map(p => p.id === existingParticipant.id ? { ...p, name: userName } : p)
            );
          }
        }

        if (setDbParticipants) {
          setDbParticipants(current => {
            if (current.some(p => p.id === existingParticipant.id)) return current;
            return [...current, { ...existingParticipant, name: userName }];
          });
        }
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
      if (data) {
        setParticipantId(data.id);
        if (setDbParticipants) {
          setDbParticipants(current => {
            if (current.some(p => p.id === data.id)) return current;
            return [...current, data];
          });
        }
      }
    };

    joinRoom();
  }, [id, userName, userId, setDbParticipants]);

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
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      supabase
        .from('participants')
        .delete()
        .eq('id', participantId)
        .then();
    };
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

  return { 
    userId, 
    userName, 
    showNameModal, 
    nameInput, 
    setNameInput, 
    participants, 
    participantId, 
    handleNameSubmit 
  };
}
