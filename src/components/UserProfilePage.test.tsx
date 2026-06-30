import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { User } from 'firebase/auth'
import { UserProfilePage } from './UserProfilePage'

const docMock = vi.fn()
const onSnapshotMock = vi.fn()
const setDocMock = vi.fn()
const serverTimestampMock = vi.fn(() => 'server-ts')

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  serverTimestamp: () => serverTimestampMock(),
}))

vi.mock('../firebase', () => ({
  db: { mocked: true },
}))

const createUser = (email = 'user@example.com'): User => ({
  uid: 'user-1',
  email,
} as User)

describe('UserProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    docMock.mockReturnValue('user-doc-ref')
    onSnapshotMock.mockImplementation((_docRef, onNext) => {
      onNext({
        data: () => ({
          name: 'Alice',
          avatarId: 'fox',
        }),
      })
      return vi.fn()
    })
    setDocMock.mockResolvedValue(undefined)
  })

  it('loads profile data and saves updated name and avatar', async () => {
    const user = userEvent.setup()

    render(<UserProfilePage user={createUser()} onBack={vi.fn()} />)

    expect(await screen.findByDisplayValue('Alice')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), ' Alice Cooper ')
    await user.click(screen.getByTestId('profile-avatar-option-robot'))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalledWith(
        'user-doc-ref',
        {
          email: 'user@example.com',
          name: 'Alice Cooper',
          avatarId: 'robot',
          updatedAt: 'server-ts',
        },
        { merge: true },
      )
    })
  })
})
