import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RoomPage from './page'
import { useParams } from 'next/navigation'
import { useRoomData } from './hooks/useRoomData'
import { useUserPresence } from './hooks/useUserPresence'
import { useRoomActions } from './hooks/useRoomActions'
import { Vote } from './types'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
}))

vi.mock('./hooks/useRoomData', () => ({
  useRoomData: vi.fn(),
}))

vi.mock('./hooks/useUserPresence', () => ({
  useUserPresence: vi.fn(),
}))

vi.mock('./hooks/useRoomActions', () => ({
  useRoomActions: vi.fn(),
}))

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

describe('RoomPage', () => {
  const roomId = 'test-room-id'
  const mockRoom = { id: roomId, name: 'Test Room' }
  const mockStories = [{ id: 's1', title: 'Story 1', status: 'pending' }]
  const mockParticipants = [{ userId: 'u1', name: 'User 1', participantId: 'p1' }]
  const mockDbParticipants = [{ id: 'p1', name: 'User 1', user_id: 'u1' }]
  const mockVotes: Vote[] = []

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useParams
    vi.mocked(useParams).mockReturnValue({ id: roomId })
    
    // Mock useRoomData
    vi.mocked(useRoomData).mockReturnValue({
      room: mockRoom,
      stories: mockStories,
      dbParticipants: mockDbParticipants,
      votes: mockVotes,
      loading: false,
      error: null,
      setStories: vi.fn(),
      setVotes: vi.fn(),
      setDbParticipants: vi.fn(),
    } as any)

    // Mock useUserPresence
    vi.mocked(useUserPresence).mockReturnValue({
      userId: 'u1',
      showNameModal: false,
      nameInput: '',
      setNameInput: vi.fn(),
      participants: mockParticipants,
      participantId: 'p1',
      handleNameSubmit: vi.fn(),
    } as any)

    // Mock useRoomActions
    vi.mocked(useRoomActions).mockReturnValue({
      newStoryTitle: '',
      setNewStoryTitle: vi.fn(),
      isAddingStory: false,
      handleAddStory: vi.fn(),
      handleDeleteStory: vi.fn(),
      handleVote: vi.fn(),
      updateStoryStatus: vi.fn(),
    } as any)
    
    // Mock localStorage
    const localStorageMock = (() => {
      let store: Record<string, string> = {}
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value.toString()
        }),
        clear: vi.fn(() => {
          store = {}
        }),
      }
    })()
    vi.stubGlobal('localStorage', localStorageMock)
  })

  it('renders loading state', () => {
    vi.mocked(useRoomData).mockReturnValue({
      loading: true,
      stories: [],
      dbParticipants: [],
      votes: [],
    } as any)
    
    render(<RoomPage />)
    expect(screen.getByText(/loading room details/i)).toBeInTheDocument()
  })

  it('renders error state when room not found', () => {
    vi.mocked(useRoomData).mockReturnValue({
      loading: false,
      error: 'Room not found',
      room: null,
      stories: [],
      dbParticipants: [],
      votes: [],
    } as any)
    
    render(<RoomPage />)
    expect(screen.getByRole('heading', { name: /room not found/i })).toBeInTheDocument()
    expect(screen.getByText('Room not found')).toBeInTheDocument()
  })

  it('renders room details for non-admin', () => {
    render(<RoomPage />)
    
    expect(screen.getByText(mockRoom.name)).toBeInTheDocument()
    expect(screen.getByText(roomId)).toBeInTheDocument()
    
    // Should not see Admin badge (rendered in RoomHeader)
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument()
    
    // Should not see StoryForm (only for admins)
    expect(screen.queryByText(/create story/i)).not.toBeInTheDocument()
  })

  it('renders room details and admin controls for admin', async () => {
    // Set admin status in mock localStorage
    vi.mocked(localStorage.getItem).mockImplementation((key) => {
      if (key === `room_admin_${roomId}`) return 'true'
      return null
    })

    render(<RoomPage />)
    
    // Wait for the admin badge to appear (it's set via useEffect)
    await waitFor(() => {
      expect(screen.getByText(/admin/i)).toBeInTheDocument()
    })
    
    // Should see StoryForm
    expect(screen.getByText(/create story/i)).toBeInTheDocument()
  })

  it('shows NameModal when showNameModal is true', () => {
    vi.mocked(useUserPresence).mockReturnValue({
      showNameModal: true,
      nameInput: '',
      setNameInput: vi.fn(),
      participants: mockParticipants,
      handleNameSubmit: vi.fn(),
    } as any)
    
    render(<RoomPage />)
    // Check for NameModal content
    expect(screen.getByPlaceholderText(/jane smith/i)).toBeInTheDocument()
    expect(screen.getByText(/join room/i)).toBeInTheDocument()
  })

  it('handles copy link button click', async () => {
    render(<RoomPage />)
    
    const copyButton = screen.getByRole('button', { name: /copy link/i })
    fireEvent.click(copyButton)
    
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    
    // Should show "Copied!" status
    await waitFor(() => {
      expect(screen.getByText(/copied!/i)).toBeInTheDocument()
    })
    
    // Optional: wait for it to revert back
    await waitFor(() => {
      expect(screen.getByText(/copy link/i)).toBeInTheDocument()
    }, { timeout: 2500 })
  })

  it('renders active story card when there is a voting story', () => {
    const votingStory = { id: 's1', title: 'Story 1', status: 'voting' }
    vi.mocked(useRoomData).mockReturnValue({
      room: mockRoom,
      stories: [votingStory],
      dbParticipants: mockDbParticipants,
      votes: [],
      loading: false,
    } as any)
    
    render(<RoomPage />)
    
    // ActiveStoryCard should be rendered
    expect(screen.getByRole('heading', { name: 'Story 1' })).toBeInTheDocument()
    expect(screen.getByText(/current voting/i)).toBeInTheDocument()
  })
})
