import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StoriesList } from './StoriesList'
import { Story } from '../types'

const mockStories: Story[] = [
  { id: '1', title: 'Story 1', description: null, status: 'pending' },
  { id: '2', title: 'Story 2', description: null, status: 'voting' },
  { id: '3', title: 'Story 3', description: null, status: 'revealed' },
]

describe('StoriesList', () => {
  const defaultProps = {
    stories: [],
    isAdmin: false,
    onUpdateStatus: vi.fn(),
    onDeleteStory: vi.fn(),
  }

  it('renders empty message when no stories exist', () => {
    render(<StoriesList {...defaultProps} />)
    expect(screen.getByText(/no stories created yet/i)).toBeInTheDocument()
  })

  it('renders empty message with admin hint when no stories and is admin', () => {
    render(<StoriesList {...defaultProps} isAdmin={true} />)
    expect(screen.getByText(/add one above/i)).toBeInTheDocument()
  })

  it('renders list of stories', () => {
    render(<StoriesList {...defaultProps} stories={mockStories} />)
    expect(screen.getByText('Story 1')).toBeInTheDocument()
    expect(screen.getByText('Story 2')).toBeInTheDocument()
    expect(screen.getByText('Story 3')).toBeInTheDocument()
  })

  it('shows Start Voting button for admin when story is not voting', () => {
    render(<StoriesList {...defaultProps} stories={[mockStories[0]]} isAdmin={true} />)
    // Buttons are initially hidden (opacity-0), but Testing Library can find them
    expect(screen.getByRole('button', { name: /start voting/i })).toBeInTheDocument()
  })

  it('does not show Start Voting button for admin when story is already voting', () => {
    render(<StoriesList {...defaultProps} stories={[mockStories[1]]} isAdmin={true} />)
    expect(screen.queryByRole('button', { name: /start voting/i })).not.toBeInTheDocument()
  })

  it('calls onUpdateStatus when Start Voting is clicked', () => {
    const onUpdateStatus = vi.fn()
    render(<StoriesList {...defaultProps} stories={[mockStories[0]]} isAdmin={true} onUpdateStatus={onUpdateStatus} />)
    fireEvent.click(screen.getByRole('button', { name: /start voting/i }))
    expect(onUpdateStatus).toHaveBeenCalledWith('1', 'voting')
  })

  it('shows Delete button for admin', () => {
    render(<StoriesList {...defaultProps} stories={[mockStories[0]]} isAdmin={true} />)
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('calls onDeleteStory when Delete is clicked', () => {
    const onDeleteStory = vi.fn()
    render(<StoriesList {...defaultProps} stories={[mockStories[0]]} isAdmin={true} onDeleteStory={onDeleteStory} />)
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDeleteStory).toHaveBeenCalledWith('1')
  })

  it('does not show action buttons for non-admins', () => {
    render(<StoriesList {...defaultProps} stories={[mockStories[0]]} isAdmin={false} />)
    expect(screen.queryByRole('button', { name: /start voting/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})
