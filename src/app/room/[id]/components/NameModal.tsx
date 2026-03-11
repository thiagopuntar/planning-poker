import { FormEvent } from 'react';

interface NameModalProps {
  nameInput: string;
  setNameInput: (name: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function NameModal({ nameInput, setNameInput, onSubmit }: NameModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-8 border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2 text-center">
          Welcome to the Room
        </h2>
        <p className="text-zinc-500 dark:text-zinc-500 text-sm text-center mb-6 leading-relaxed">
          Enter your name to start estimating stories with your team.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
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
  );
}
