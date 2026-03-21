/**
 * Simple utility to manage a persistent user ID for Planning Poker.
 * Since we don't use full Supabase Auth, this ID acts as a "secret" 
 * for Row Level Security (RLS) policies.
 */
export function getPersistentUserId(): string {
  if (typeof window === 'undefined') return '';
  
  let id = localStorage.getItem('poker_user_id');
  if (!id || id.length < 30) {
    id = crypto.randomUUID();
    localStorage.setItem('poker_user_id', id);
  }
  return id;
}
