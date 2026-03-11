interface RoomHeaderProps {
  roomName: string;
  roomId: string;
  isAdmin: boolean;
  onCopyLink: () => void;
  copied: boolean;
}

export function RoomHeader({ roomName, roomId, isAdmin, onCopyLink, copied }: RoomHeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6 gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {roomName}
          </h1>
          {isAdmin && (
            <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
              Admin
            </span>
          )}
        </div>
        <p className="text-zinc-500 dark:text-zinc-500 text-sm">
          Room ID: <span className="font-mono">{roomId}</span>
        </p>
      </div>
      <div className="flex gap-3">
        <button 
          onClick={onCopyLink}
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
          onClick={onCopyLink}
          className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
        >
          Add Participant
        </button>
      </div>
    </header>
  );
}
