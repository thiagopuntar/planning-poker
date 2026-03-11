import { Story } from '../types';

interface StoriesListProps {
  stories: Story[];
  isAdmin: boolean;
  onUpdateStatus: (storyId: string, status: Story['status']) => void;
  onDeleteStory: (storyId: string) => void;
}

export function StoriesList({ stories, isAdmin, onUpdateStatus, onDeleteStory }: StoriesListProps) {
  return (
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
                    onClick={() => onUpdateStatus(story.id, 'voting')}
                    className="px-3 py-1 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded text-xs font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    Start Voting
                  </button>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => onDeleteStory(story.id)}
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
  );
}
