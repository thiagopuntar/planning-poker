import { FormEvent } from 'react';

interface StoryFormProps {
  newStoryTitle: string;
  setNewStoryTitle: (title: string) => void;
  isAddingStory: boolean;
  onAddStory: (e: FormEvent) => void;
}

export function StoryForm({ newStoryTitle, setNewStoryTitle, isAddingStory, onAddStory }: StoryFormProps) {
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <h3 className="font-bold mb-4 text-zinc-900 dark:text-zinc-50 uppercase text-xs tracking-widest">
        Create Story
      </h3>
      <form onSubmit={onAddStory} className="flex gap-2">
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
  );
}
