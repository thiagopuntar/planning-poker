import { Story, Vote, Participant, CARD_VALUES } from '../types';

interface ActiveStoryCardProps {
  story: Story;
  isAdmin: boolean;
  participantId: string | null;
  votes: Vote[];
  dbParticipants: Participant[];
  onVote: (storyId: string, value: string) => void;
  onUpdateStatus: (storyId: string, status: Story['status']) => void;
  getVoteForParticipant: (pId: string, sId: string) => string | undefined;
}

export function ActiveStoryCard({ 
  story, 
  isAdmin, 
  participantId, 
  votes, 
  dbParticipants, 
  onVote, 
  onUpdateStatus,
  getVoteForParticipant
}: ActiveStoryCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-zinc-900 dark:bg-zinc-50" />
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2 block">
            {story.status === 'voting' ? 'Current Voting' : 'Voting Results'}
          </span>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{story.title}</h2>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {story.status === 'voting' ? (
              <button 
                onClick={() => onUpdateStatus(story.id, 'revealed')}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-xs font-bold hover:scale-105 transition-all"
              >
                Reveal Votes
              </button>
            ) : (
              <button 
                onClick={() => onUpdateStatus(story.id, 'voting')}
                className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
              >
                Reset & Re-vote
              </button>
            )}
          </div>
        )}
      </div>

      {story.status === 'voting' ? (
        <div className="flex flex-wrap gap-3 justify-center mt-8">
          {!participantId && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
              <div className="bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg text-xs font-medium text-zinc-500 animate-pulse">
                Syncing session...
              </div>
            </div>
          )}
          {CARD_VALUES.map((val) => {
            const currentVote = participantId ? getVoteForParticipant(participantId, story.id) : null;
            const isSelected = currentVote === val;
            return (
              <button
                key={val}
                onClick={() => onVote(story.id, val)}
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
          {votes.filter(v => v.story_id === story.id).map((v) => {
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
          {votes.filter(v => v.story_id === story.id).length === 0 && (
            <p className="text-zinc-400 italic text-sm py-4">No votes were cast.</p>
          )}
        </div>
      )}
    </div>
  );
}
