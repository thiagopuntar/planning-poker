import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Home from './page'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

describe('Home', () => {
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useRouter as any).mockReturnValue({ push: mockPush })
    
    // Mock localStorage
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key]
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key])
      }),
    })
  })

  it('renders title and input', () => {
    render(<Home />)
    expect(screen.getByText('Planning Poker')).toBeInTheDocument()
    expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
  })

  it('disables Create Room button when input is empty', () => {
    render(<Home />)
    expect(screen.getByRole('button', { name: /create room/i })).toBeDisabled()
  })

  it('enables Create Room button when input is not empty', () => {
    render(<Home />)
    const input = screen.getByLabelText(/room name/i)
    fireEvent.change(input, { target: { value: 'New Room' } })
    expect(screen.getByRole('button', { name: /create room/i })).not.toBeDisabled()
  })

  it('calls supabase and redirects after room creation', async () => {
    const mockRoom = { id: 'room-123', name: 'New Room' }
    ;(supabase.from as any).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockRoom, error: null }),
        })),
      })),
    })

    render(<Home />)
    const input = screen.getByLabelText(/room name/i)
    fireEvent.change(input, { target: { value: 'New Room' } })
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('rooms')
      expect(mockPush).toHaveBeenCalledWith('/room/room-123')
      expect(localStorage.getItem('room_admin_room-123')).toBe('true')
    })
  })

  it('shows error message if room creation fails', async () => {
    ;(supabase.from as any).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Supabase Error' } }),
        })),
      })),
    })

    render(<Home />)
    const input = screen.getByLabelText(/room name/i)
    fireEvent.change(input, { target: { value: 'New Room' } })
    fireEvent.click(screen.getByRole('button', { name: /create room/i }))

    await waitFor(() => {
      expect(screen.getByText(/supabase error/i)).toBeInTheDocument()
    })
  })
})
