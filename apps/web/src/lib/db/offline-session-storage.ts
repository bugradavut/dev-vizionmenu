import { openDB, IDBPDatabase } from 'idb'

class OfflineSessionStorage {
  private dbName = 'offline-sessions-db'
  private version = 1
  private db: IDBPDatabase<any> | null = null

  async init() {
    if (this.db) return this.db

    this.db = await openDB(this.dbName, this.version, {
      upgrade(db: any) {
        // Create offline sessions store
        if (!db.objectStoreNames.contains('offlineSessions')) {
          const store = db.createObjectStore('offlineSessions', { keyPath: 'id' })
          store.createIndex('by-synced', 'synced')
          store.createIndex('by-branch', 'branch_id')
        }
      },
    })

    return this.db
  }

  async getCurrentSession(branchId: string) {
    const db = await this.init()
    const tx = db.transaction('offlineSessions', 'readonly')
    const store = tx.objectStore('offlineSessions')
    const index = store.index('by-branch')

    const sessions = await index.getAll(branchId)
    // Find active session (not deactivated)
    return sessions.find(s => !s.deactivated_at) || null
  }

  async createSession(sessionData: {
    branch_id: string
    device_info: any
    user_agent: string | null
  }) {
    const db = await this.init()
    const session = {
      id: crypto.randomUUID(),
      branch_id: sessionData.branch_id,
      activated_at: new Date().toISOString(),
      deactivated_at: null,
      orders_created: 0,
      device_info: sessionData.device_info,
      user_agent: sessionData.user_agent,
      synced: false,
      created_at: new Date().toISOString(),
    }

    await db.put('offlineSessions', session)
    console.log('[OfflineSessionStorage] Session created locally:', session.id)
    return session
  }

  async deactivateSession(branchId: string) {
    const db = await this.init()
    const session = await this.getCurrentSession(branchId)

    if (!session) {
      console.warn('[OfflineSessionStorage] No active session to deactivate')
      return null
    }

    const updatedSession = {
      ...session,
      deactivated_at: new Date().toISOString(),
    }

    await db.put('offlineSessions', updatedSession)
    console.log('[OfflineSessionStorage] Session deactivated locally:', session.id)
    return updatedSession
  }

  async incrementOrdersCreated(branchId: string) {
    const db = await this.init()
    const session = await this.getCurrentSession(branchId)

    if (!session) {
      console.warn('[OfflineSessionStorage] No active session to increment orders')
      return null
    }

    const updatedSession = {
      ...session,
      orders_created: session.orders_created + 1,
    }

    await db.put('offlineSessions', updatedSession)
    console.log('[OfflineSessionStorage] Orders incremented:', updatedSession.orders_created)
    return updatedSession
  }

  async getUnsyncedSessions() {
    const db = await this.init()
    const tx = db.transaction('offlineSessions', 'readonly')
    const store = tx.objectStore('offlineSessions')

    // Get all sessions and filter for unsynced (can't use index.getAll(false) - invalid key)
    const allSessions = await store.getAll()
    return allSessions.filter(session => !session.synced)
  }

  async markAsSynced(sessionId: string) {
    const db = await this.init()
    const session = await db.get('offlineSessions', sessionId)

    if (!session) return

    await db.put('offlineSessions', {
      ...session,
      synced: true,
    })

    console.log('[OfflineSessionStorage] Session marked as synced:', sessionId)
  }

  async deleteSession(sessionId: string) {
    const db = await this.init()
    await db.delete('offlineSessions', sessionId)
    console.log('[OfflineSessionStorage] Session deleted:', sessionId)
  }

  async getAllSessions() {
    const db = await this.init()
    return await db.getAll('offlineSessions')
  }

  async clearSyncedSessions() {
    const db = await this.init()
    const synced = await db.getAllFromIndex('offlineSessions', 'by-synced', true)

    for (const session of synced) {
      await db.delete('offlineSessions', session.id)
    }

    console.log('[OfflineSessionStorage] Cleared synced sessions:', synced.length)
  }
}

export const offlineSessionStorage = new OfflineSessionStorage()
