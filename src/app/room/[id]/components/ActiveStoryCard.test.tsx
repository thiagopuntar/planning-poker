import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActiveStoryCard } from './ActiveStoryCard'
import { Story, Vote, Participant } from '../types'

const mockStory: Story = {
  id: 'story-1',
  title: 'Test Story',
  description: 'Test Description',
  status: 'voting',
}

const mockVotes: Vote[] = [
  { id: 'vote-1', story_id: 'story-1', participant_id: 'p-1', vote_value: '5' },
  { id: 'vote-2', story_id: 'story-1', participant_id: 'p-2', vote_value: '8' },
]

const mockParticipants: Participant[] = [
  { id: 'p-1', name: 'User 1', user_id: 'u-1' },
  { id: 'p-2', name: 'User 2', user_id: 'u-2' },
]

describe('ActiveStoryCard', () => {
  const defaultProps = {
    story: mockStory,
    isAdmin: false,
    participantId: 'p-1',
    votes: mockVotes,
    dbParticipants: mockParticipants,
    onVote: vi.fn(),
    onUpdateStatus: vi.fn(),
    getVoteForParticipant: vi.fn().mockReturnValue('5'),
  }

  it('renders story title', () => {
    render(<ActiveStoryCard {...defaultProps} />)
    expect(screen.getByText('Test Story')).toBeInTheDocument()
  })

  it('renders voting status message when status is voting', () => {
    render(<ActiveStoryCard {...defaultProps} />)
    expect(screen.getByText(/current voting/i)).toBeInTheDocument()
  })

  it('renders reveal votes button for admin when status is voting', () => {
    render(<ActiveStoryCard {...defaultProps} isAdmin={true} />)
    expect(screen.getByRole('button', { name: /reveal votes/i })).toBeInTheDocument()
  })

  it('calls onUpdateStatus when reveal votes button is clicked', () => {
    const onUpdateStatus = vi.fn()
    render(<ActiveStoryCard {...defaultProps} isAdmin={true} onUpdateStatus={onUpdateStatus} />)
    fireEvent.click(screen.getByRole('button', { name: /reveal votes/i }))
    expect(onUpdateStatus).toHaveBeenCalledWith('story-1', 'revealed')
  })

  it('renders voting cards when status is voting', () => {
    render(<ActiveStoryCard {...defaultProps} />)
    const card5 = screen.getByRole('button', { name: '5' })
    expect(card5).toBeInTheDocument()
    expect(card5).toHaveClass('bg-zinc-900') // Selected state
  })

  it('calls onVote when a card is clicked', () => {
    const onVote = vi.fn()
    render(<ActiveStoryCard {...defaultProps} onVote={onVote} />)
    fireEvent.click(screen.getByRole('button', { name: '8' }))
    expect(onVote).toHaveBeenCalledWith('story-1', '8')
  })

  it('renders revealed results when status is revealed', () => {
    const revealedStory: Story = { ...mockStory, status: 'revealed' }
    render(<ActiveStoryCard {...defaultProps} story={revealedStory} />)
    expect(screen.getByText(/voting results/i)).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
  })

  it('calculates average correctly when status is revealed', () => {
    const revealedStory: Story = { ...mockStory, status: 'revealed' }
    render(<ActiveStoryCard {...defaultProps} story={revealedStory} />)
    // Average of 5 and 8 is 6.5
    expect(screen.getByText('6.5')).toBeInTheDocument()
  })

  it('renders reset & re-vote button for admin when status is revealed', () => {
    const revealedStory: Story = { ...mockStory, status: 'revealed' }
    render(<ActiveStoryCard {...defaultProps} story={revealedStory} isAdmin={true} />)
    expect(screen.getByRole('button', { name: /reset & re-vote/i })).toBeInTheDocument()
  })

  it('calls onUpdateStatus to reset voting when reset & re-vote is clicked', () => {
    const onUpdateStatus = vi.fn()
    const revealedStory: Story = { ...mockStory, status: 'revealed' }
    render(<ActiveStoryCard {...defaultProps} story={revealedStory} isAdmin={true} onUpdateStatus={onUpdateStatus} />)
    fireEvent.click(screen.getByRole('button', { name: /reset & re-vote/i }))
    expect(onUpdateStatus).toHaveBeenCalledWith('story-1', 'voting')
  })
})
