'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRoomData } from './hooks/useRoomData';
import { useUserPresence } from './hooks/useUserPresence';
import { useRoomActions } from './hooks/useRoomActions';
import { RoomHeader } from './components/RoomHeader';
import { ActiveStoryCard } from './components/ActiveStoryCard';
import { StoryForm } from './components/StoryForm';
import { StoriesList } from './components/StoriesList';
import { ParticipantsList } from './components/ParticipantsList';
import { NameModal } from './components/NameModal';
import { Vote } from './types';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);

  // Custom Hooks
  const { 
    room, 
    stories, 
    dbParticipants, 
    votes, 
    loading, 
    error, 
    setStories, 
    setVotes,
    setDbParticipants 
  } = useRoomData(id);

  const {
    userId,
    userName,
    showNameModal,
    nameInput,
    setNameInput,
    participants,
    participantId,
    handleNameSubmit
  } = useUserPresence(id, setDbParticipants);

  useEffect(() => {
    if (!id) return;
    const adminStatus = localStorage.getItem(`room_admin_${id}`);
    if (adminStatus === 'true') {
      setIsAdmin(true);
    }
  }, [id]);

  const {
    newStoryTitle,
    setNewStoryTitle,
    isAddingStory,
    handleAddStory,
    handleDeleteStory,
    handleVote,
    updateStoryStatus
  } = useRoomActions({
    id,
    isAdmin,
    participantId,
    votes,
    setStories,
    setVotes
  });

  // Derived State
  const votingStory = stories.find(s => s.status === 'voting');
  const revealedStory = [...stories].reverse().find(s => s.status === 'revealed');
  const activeStory = votingStory || revealedStory;

  const getVoteForParticipant = (pId: string, sId: string) => {
    return votes.find(v => v.participant_id === pId && v.story_id === sId)?.vote_value;
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
        <RoomHeader 
          roomName={room.name}
          roomId={room.id}
          isAdmin={isAdmin}
          onCopyLink={handleCopyLink}
          copied={copied}
        />

        <section className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {activeStory && (
              <ActiveStoryCard 
                story={activeStory}
                isAdmin={isAdmin}
                participantId={participantId}
                votes={votes}
                dbParticipants={dbParticipants}
                onVote={handleVote}
                onUpdateStatus={updateStoryStatus}
                getVoteForParticipant={getVoteForParticipant}
              />
            )}

            {isAdmin && (
              <StoryForm 
                newStoryTitle={newStoryTitle}
                setNewStoryTitle={setNewStoryTitle}
                isAddingStory={isAddingStory}
                onAddStory={handleAddStory}
              />
            )}

            <StoriesList 
              stories={stories}
              isAdmin={isAdmin}
              onUpdateStatus={updateStoryStatus}
              onDeleteStory={handleDeleteStory}
            />
          </div>
          
          <div className="space-y-6">
            <ParticipantsList 
              participants={participants}
              dbParticipants={dbParticipants}
              userId={userId}
              votingStory={votingStory}
              revealedStory={revealedStory}
              votes={votes}
            />
          </div>
        </section>
      </div>

      {showNameModal && (
        <NameModal 
          nameInput={nameInput}
          setNameInput={setNameInput}
          onSubmit={handleNameSubmit}
        />
      )}
    </div>
  );
}
