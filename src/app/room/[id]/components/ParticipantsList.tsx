import { OnlineUser, Participant, Story, Vote } from '../types';

interface ParticipantsListProps {
  participants: OnlineUser[];
  dbParticipants: Participant[];
  userId: string;
  votingStory: Story | undefined;
  revealedStory: Story | undefined;
  votes: Vote[];
}

export function ParticipantsList({ 
  participants, 
  dbParticipants, 
  userId, 
  votingStory, 
  revealedStory, 
  votes 
}: ParticipantsListProps) {
  return (
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
          participants.map((p) => {
            // Find the database participant record that matches this online user
            // We prioritize matching by participantId from presence, then by userId
            const dbP = dbParticipants.find(dp => dp.id === p.participantId) || 
                       dbParticipants.find(dp => dp.user_id === p.userId);
            
            if (!dbP) return null;

            const hasVoted = votingStory && votes.some(v => v.participant_id === dbP.id && v.story_id === votingStory.id);
            const revealedVote = revealedStory && votes.find(v => v.participant_id === dbP.id && v.story_id === revealedStory.id);

            return (
              <div key={p.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {p.name} {p.userId === userId ? '(You)' : ''}
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
  );
}
