import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NameModal } from './NameModal'

describe('NameModal', () => {
  const defaultProps = {
    nameInput: '',
    setNameInput: vi.fn(),
    onSubmit: vi.fn(),
  }

  it('renders modal title and label', () => {
    render(<NameModal {...defaultProps} />)
    expect(screen.getByText(/welcome to the room/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
  })

  it('disables Join Room button when input is empty', () => {
    render(<NameModal {...defaultProps} nameInput="" />)
    expect(screen.getByRole('button', { name: /join room/i })).toBeDisabled()
  })

  it('enables Join Room button when input is not empty', () => {
    render(<NameModal {...defaultProps} nameInput="John Doe" />)
    expect(screen.getByRole('button', { name: /join room/i })).not.toBeDisabled()
  })

  it('calls setNameInput when name value changes', () => {
    const setNameInput = vi.fn()
    render(<NameModal {...defaultProps} setNameInput={setNameInput} />)
    const input = screen.getByLabelText(/your name/i)
    fireEvent.change(input, { target: { value: 'John Doe' } })
    expect(setNameInput).toHaveBeenCalledWith('John Doe')
  })

  it('calls onSubmit when form is submitted', () => {
    const onSubmit = vi.fn((e) => e.preventDefault())
    render(<NameModal {...defaultProps} nameInput="John Doe" onSubmit={onSubmit} />)
    fireEvent.submit(screen.getByRole('button', { name: /join room/i }).closest('form')!)
    expect(onSubmit).toHaveBeenCalled()
  })
})
