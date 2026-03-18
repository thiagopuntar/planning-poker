import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { StoryForm } from './StoryForm'

describe('StoryForm', () => {
  const defaultProps = {
    newStoryTitle: '',
    setNewStoryTitle: vi.fn(),
    isAddingStory: false,
    onAddStory: vi.fn(),
  }

  it('renders input and add button', () => {
    render(<StoryForm {...defaultProps} />)
    expect(screen.getByPlaceholderText(/story title/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('disables button when input is empty', () => {
    render(<StoryForm {...defaultProps} newStoryTitle="" />)
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
  })

  it('enables button when input is not empty', () => {
    render(<StoryForm {...defaultProps} newStoryTitle="Story 1" />)
    expect(screen.getByRole('button', { name: /add/i })).not.toBeDisabled()
  })

  it('calls setNewStoryTitle when input value changes', () => {
    const setNewStoryTitle = vi.fn()
    render(<StoryForm {...defaultProps} setNewStoryTitle={setNewStoryTitle} />)
    const input = screen.getByPlaceholderText(/story title/i)
    fireEvent.change(input, { target: { value: 'New Story' } })
    expect(setNewStoryTitle).toHaveBeenCalledWith('New Story')
  })

  it('calls onAddStory when form is submitted', () => {
    const onAddStory = vi.fn((e) => e.preventDefault())
    render(<StoryForm {...defaultProps} newStoryTitle="Story 1" onAddStory={onAddStory} />)
    fireEvent.submit(screen.getByRole('button', { name: /add/i }).closest('form')!)
    expect(onAddStory).toHaveBeenCalled()
  })

  it('disables input and button while adding story', () => {
    render(<StoryForm {...defaultProps} newStoryTitle="Story 1" isAddingStory={true} />)
    expect(screen.getByPlaceholderText(/story title/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
  })
})
