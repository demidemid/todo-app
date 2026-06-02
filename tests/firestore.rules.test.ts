import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

const projectId = 'todo-app-rules-test'
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8')
const hasFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST)

const dashboardPayload = (overrides: Record<string, unknown> = {}) => ({
  entityType: 'dashboard',
  userId: 'owner-1',
  name: 'Shared dashboard',
  order: 0,
  columns: [{ id: 'todo', name: 'To do', order: 0, isDone: false }],
  sharedWith: ['recipient-1'],
  sharedWithEmails: ['recipient@example.com'],
  createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
  updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
  ...overrides,
})

const todoPayload = (overrides: Record<string, unknown> = {}) => ({
  entityType: 'todo',
  userId: 'owner-1',
  title: 'Task',
  description: '',
  status: 'todo',
  boardId: 'shared-board',
  columnId: 'todo',
  weight: 1,
  comments: [],
  createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
  updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
  ...overrides,
})

const describeRules = hasFirestoreEmulator ? describe : describe.skip

describeRules('firestore rules', () => {
  let testEnv: RulesTestEnvironment

  beforeAll(async () => {
    const host = process.env.FIRESTORE_EMULATOR_HOST as string

    const [emulatorHost, port] = host.split(':')

    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        host: emulatorHost,
        port: Number(port),
        rules,
      },
    })
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()

      await setDoc(doc(db, 'users', 'owner-1'), {
        email: 'owner@example.com',
        updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
      })

      await setDoc(doc(db, 'users', 'recipient-1'), {
        email: 'recipient@example.com',
        updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
      })

      await setDoc(doc(db, 'users', 'outsider-1'), {
        email: 'outsider@example.com',
        updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
      })

      await setDoc(doc(db, 'todos', 'shared-board'), dashboardPayload())
      await setDoc(doc(db, 'todos', 'owner-todo'), todoPayload())
      await setDoc(
        doc(db, 'todos', 'owner-legacy-todo'),
        {
          entityType: 'todo',
          userId: 'owner-1',
          title: 'Legacy owner task',
          description: '',
          status: 'todo',
          columnId: 'todo',
          weight: 10,
          comments: [],
          createdAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
          updatedAt: Timestamp.fromDate(new Date('2026-01-01T00:00:00Z')),
        }
      )
      await setDoc(
        doc(db, 'todos', 'recipient-todo'),
        todoPayload({ userId: 'recipient-1', title: 'Recipient task', weight: 2 })
      )
      await setDoc(
        doc(db, 'todos', 'private-board'),
        dashboardPayload({
          userId: 'outsider-1',
          sharedWith: [],
          sharedWithEmails: [],
          name: 'Private board',
        })
      )
      await setDoc(
        doc(db, 'todos', 'private-todo'),
        todoPayload({ userId: 'outsider-1', boardId: 'private-board', title: 'Private task' })
      )
    })
  })

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup()
    }
  })

  it('allows a recipient to query shared dashboards by uid membership', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertSucceeds(
      getDocs(query(collection(db, 'todos'), where('sharedWith', 'array-contains', 'recipient-1')))
    )
  })

  it('allows a recipient to query shared dashboards by email membership', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    const snapshot = await assertSucceeds(
      getDocs(query(collection(db, 'todos'), where('sharedWithEmails', 'array-contains', 'recipient@example.com')))
    )

    expect(snapshot.docs.map((item) => item.id)).toContain('shared-board')
  })

  it('allows recipient direct read of a shared dashboard', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    const snapshot = await assertSucceeds(getDoc(doc(db, 'todos', 'shared-board')))
    expect(snapshot.exists()).toBe(true)
  })

  it('allows recipient to create a todo on a shared dashboard with their own userId', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertSucceeds(
      setDoc(
        doc(db, 'todos', 'recipient-created'),
        todoPayload({ userId: 'recipient-1', title: 'Recipient created' })
      )
    )
  })

  it('rejects creating a todo on a shared dashboard with spoofed userId', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertFails(
      setDoc(doc(db, 'todos', 'spoofed'), todoPayload({ userId: 'owner-1', title: 'Spoofed task' }))
    )
  })

  it('allows a shared member to read todos from both participants on the shared board', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    const snapshot = await assertSucceeds(
      getDocs(query(collection(db, 'todos'), where('boardId', '==', 'shared-board')))
    )

    expect(snapshot.docs.map((item) => item.id).sort()).toEqual(['owner-todo', 'recipient-todo'])
  })

  it('allows a shared member to add comments to a todo they did not create', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertSucceeds(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        comments: [
          {
            id: 'comment-1',
            todoId: 'owner-todo',
            userId: 'recipient-1',
            userEmail: 'recipient@example.com',
            text: 'Shared board comment',
            createdAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
          },
        ],
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('rejects shared member editing non-comment fields on a todo they did not create', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertFails(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        title: 'Hijacked title',
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('allows a shared member to add files to a todo they did not create', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertSucceeds(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        files: [
          {
            id: 'file-1',
            name: 'spec.pdf',
            path: 'todos/owner-todo/file-1-spec.pdf',
            url: 'https://example.com/spec.pdf',
            size: 1234,
            contentType: 'application/pdf',
            uploadedBy: 'recipient-1',
            uploadedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
          },
        ],
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('allows a shared member to move a todo they did not create across columns', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertSucceeds(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        status: 'in_progress',
        columnId: 'in_progress',
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('allows a shared member to create checklist on a todo they did not create', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertSucceeds(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        checklist: {
          title: 'check list',
          items: [
            {
              id: 'item-1',
              title: 'item',
              checked: false,
            },
          ],
        },
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('allows a shared member to edit checklist items on a todo they did not create', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertSucceeds(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        checklist: {
          title: 'check list',
          items: [
            {
              id: 'item-1',
              title: 'edited item',
              checked: true,
            },
          ],
        },
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('allows a shared member to update due date and reminder fields on a shared todo', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertSucceeds(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        dueDate: '2026-06-05',
        remindOneDayBefore: true,
        reminderScheduledAt: '2026-06-04T09:00:00.000Z',
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('allows the owner to update due date and reminder fields with a partial payload', async () => {
    const db = testEnv.authenticatedContext('owner-1', { email: 'owner@example.com' }).firestore()

    await assertSucceeds(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        dueDate: '2026-06-05',
        remindOneDayBefore: true,
        reminderScheduledAt: '2026-06-04T09:00:00.000Z',
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('allows owner due date updates on legacy todos without boardId', async () => {
    const db = testEnv.authenticatedContext('owner-1', { email: 'owner@example.com' }).firestore()

    await assertSucceeds(
      updateDoc(doc(db, 'todos', 'owner-legacy-todo'), {
        dueDate: '2026-06-05',
        remindOneDayBefore: false,
        reminderScheduledAt: null,
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('rejects shared member changing title while uploading files to another users todo', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertFails(
      updateDoc(doc(db, 'todos', 'owner-todo'), {
        title: 'Renamed through file update',
        files: [
          {
            id: 'file-2',
            name: 'doc.txt',
            path: 'todos/owner-todo/file-2-doc.txt',
            url: 'https://example.com/doc.txt',
            size: 10,
            contentType: 'text/plain',
            uploadedBy: 'recipient-1',
            uploadedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
          },
        ],
        updatedAt: Timestamp.fromDate(new Date('2026-01-03T00:00:00Z')),
      })
    )
  })

  it('rejects direct reads of unrelated private todos', async () => {
    const db = testEnv.authenticatedContext('recipient-1', { email: 'recipient@example.com' }).firestore()

    await assertFails(getDoc(doc(db, 'todos', 'private-todo')))
  })

  it('rejects all todo reads for unauthenticated users', async () => {
    const db = testEnv.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(db, 'todos', 'shared-board')))
    await assertFails(
      getDocs(query(collection(db, 'todos'), where('sharedWith', 'array-contains', 'recipient-1')))
    )
  })
})
