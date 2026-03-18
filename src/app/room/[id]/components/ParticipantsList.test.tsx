import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ParticipantsList } from './ParticipantsList'
import { OnlineUser, Participant, Story, Vote } from '../types'

const mockOnlineUsers: OnlineUser[] = [
  { userId: 'u-1', name: 'User 1', online_at: new Date().toISOString() },
  { userId: 'u-2', name: 'User 2', online_at: new Date().toISOString() },
]

const mockDbParticipants: Participant[] = [
  { id: 'p-1', name: 'User 1', user_id: 'u-1' },
  { id: 'p-2', name: 'User 2', user_id: 'u-2' },
]

const mockStory: Story = {
  id: 's-1',
  title: 'Story 1',
  description: null,
  status: 'voting',
}

const mockVotes: Vote[] = [
  { id: 'v-1', story_id: 's-1', participant_id: 'p-1', vote_value: '5' },
]

describe('ParticipantsList', () => {
  const defaultProps = {
    participants: mockOnlineUsers,
    dbParticipants: mockDbParticipants,
    userId: 'u-1',
    votingStory: undefined,
    revealedStory: undefined,
    votes: [],
  }

  it('renders participants list with correct count', () => {
    render(<ParticipantsList {...defaultProps} />)
    expect(screen.getByText(/participants/i)).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText(/User 1 \(You\)/i)).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
  })

  it('renders empty message when no participants', () => {
    render(<ParticipantsList {...defaultProps} participants={[]} />)
    expect(screen.getByText(/no participants yet/i)).toBeInTheDocument()
  })

  it('shows voted indicator when user has voted and story is in voting', () => {
    render(<ParticipantsList {...defaultProps} votingStory={mockStory} votes={mockVotes} />)
    // The indicator is a div with a title "Voted" or just a class, but it has title="Voted"
    const indicator = screen.getByTitle('Voted')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveClass('animate-pulse')
  })

  it('shows revealed vote value when story is revealed', () => {
    const revealedStory: Story = { ...mockStory, status: 'revealed' }
    render(<ParticipantsList {...defaultProps} revealedStory={revealedStory} votes={mockVotes} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
