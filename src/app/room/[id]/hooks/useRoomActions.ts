import { useState, Dispatch, SetStateAction, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Story, Vote } from '../types';

interface UseRoomActionsProps {
  id: string;
  isAdmin: boolean;
  participantId: string | null;
  setStories: Dispatch<SetStateAction<Story[]>>;
  setVotes: Dispatch<SetStateAction<Vote[]>>;
}

export function useRoomActions({ 
  id, 
  isAdmin, 
  participantId, 
  setStories, 
  setVotes 
}: UseRoomActionsProps) {
  const [isAddingStory, setIsAddingStory] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');

  const handleAddStory = async (e: FormEvent) => {
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
      setStories((current) => current.filter((s) => s.id !== storyId));

      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) {
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

  const handleVote = async (storyId: string, value: string) => {
    if (!participantId) return;

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
      
      if (data) {
        setVotes(current => current.map(v => v.id === tempVote.id ? (data as Vote) : v));
      }
    } catch (err: any) {
      console.error('Error voting:', err);
      setVotes(current => current.filter(v => v.id !== tempVote.id));
      alert(err.message || 'Failed to submit vote.');
    }
  };

  const updateStoryStatus = async (storyId: string, status: Story['status']) => {
    if (!isAdmin) return;

    try {
      if (status === 'voting') {
        const { error: resetError } = await supabase
          .from('stories')
          .update({ status: 'pending' })
          .eq('room_id', id)
          .eq('status', 'voting');
        
        if (resetError) throw resetError;

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

  return { 
    newStoryTitle, 
    setNewStoryTitle, 
    isAddingStory, 
    handleAddStory, 
    handleDeleteStory, 
    handleVote, 
    updateStoryStatus 
  };
}
