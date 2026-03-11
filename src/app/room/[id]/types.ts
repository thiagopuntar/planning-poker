export interface Room {
  id: string;
  name: string;
  created_at: string;
}

export interface Story {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'voting' | 'revealed';
}

export interface Vote {
  id: string;
  story_id: string;
  participant_id: string;
  vote_value: string;
}

export interface Participant {
  id: string;
  name: string;
  user_id: string;
}

export interface OnlineUser {
  userId: string;
  name: string;
  participantId?: string;
  online_at: string;
}

export const CARD_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
