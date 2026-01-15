import Database from '@tauri-apps/plugin-sql';

/**
 * Database Service with Web Fallback
 * Uses SQLite in Tauri, and LocalStorage in the browser.
 */

class DbService {
  private db: Database | null = null;
  private dbPath = 'sqlite:project_maker.db';
  private isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

  /**
   * Initialize the database
   */
  async init() {
    console.log(`[DbService] Initializing. Mode: ${this.isTauri ? 'Tauri (SQLite)' : 'Browser (LocalStorage)'}`);

    if (this.isTauri) {
      if (this.db) return this.db;
      try {
        this.db = await Database.load(this.dbPath);
        await this.runMigrations();
        return this.db;
      } catch (error) {
        console.error('[DbService] SQLite Init Error:', error);
        throw error;
      }
    }

    // Browser fallback doesn't need "init" as localStorage is always there
    return null;
  }

  private async runMigrations() {
    if (!this.db) return;

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        description TEXT,
        settings TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS features (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        complexity TEXT NOT NULL,
        keyPoints TEXT,
        acceptanceCriteria TEXT,
        suggestedTests TEXT,
        dependencies TEXT,
        automationStatus TEXT NOT NULL,
        automationLogs TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        orderIndex INTEGER DEFAULT 0,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  /**
   * Execute a query (SELECT)
   */
  async query<T>(sql: string, bindValues: any[] = []): Promise<T[]> {
    console.log(`[DbService] QUERY: ${sql}`, bindValues);

    if (this.isTauri) {
      const db = await this.init();
      return await db!.select<T[]>(sql, bindValues);
    }

    // --- Web Fallback Logic ---
    const table = sql.match(/FROM\s+(\w+)/i)?.[1];
    if (!table) return [];

    const data = JSON.parse(localStorage.getItem(`db_${table}`) || '[]');

    // Simple filter for "WHERE projectId = ?"
    if (sql.includes('WHERE projectId = ?') && bindValues.length > 0) {
      return data.filter((item: any) => item.projectId === bindValues[0]) as T[];
    }

    // Simple filter for "WHERE id = ?"
    if (sql.includes('WHERE id = ?') && bindValues.length > 0) {
      return data.filter((item: any) => item.id === bindValues[0]) as T[];
    }

    return data as T[];
  }

  /**
   * Execute a command (INSERT, UPDATE, DELETE)
   */
  async execute(sql: string, bindValues: any[] = []) {
    console.log(`[DbService] EXECUTE: ${sql}`, bindValues);

    if (this.isTauri) {
      const db = await this.init();
      return await db!.execute(sql, bindValues);
    }

    // --- Web Fallback Logic ---
    const isInsert = sql.startsWith('INSERT');
    const isUpdate = sql.startsWith('UPDATE');
    const isDelete = sql.startsWith('DELETE');
    const table = sql.match(/(?:INTO|UPDATE|FROM)\s+(\w+)/i)?.[1];

    if (!table) return;

    let data = JSON.parse(localStorage.getItem(`db_${table}`) || '[]');

    if (isInsert) {
      // Map bindValues to columns based on table
      let newItem: any = {};
      if (table === 'projects') {
        newItem = { id: bindValues[0], name: bindValues[1], path: bindValues[2], description: bindValues[3], settings: bindValues[4], createdAt: bindValues[5], updatedAt: bindValues[6] };
      } else if (table === 'features') {
        newItem = { id: bindValues[0], projectId: bindValues[1], title: bindValues[2], description: bindValues[3], status: bindValues[4], priority: bindValues[5], complexity: bindValues[6], keyPoints: bindValues[7], acceptanceCriteria: bindValues[8], suggestedTests: bindValues[9], dependencies: bindValues[10], automationStatus: bindValues[11], automationLogs: bindValues[12], createdAt: bindValues[13], updatedAt: bindValues[14], orderIndex: bindValues[15] };
      } else if (table === 'settings') {
        data = data.filter((item: any) => item.id !== bindValues[0]); // Replace logic
        newItem = { id: bindValues[0], value: bindValues[1] };
      }
      data.push(newItem);
    } else if (isUpdate) {
      const id = bindValues[bindValues.length - 1]; // Usually ID is last in updates
      data = data.map((item: any) => (item.id === id ? { ...item, ...this.parseUpdateValues(sql, bindValues) } : item));
    } else if (isDelete) {
      const id = bindValues[0];
      data = data.filter((item: any) => item.id !== id);
    }

    localStorage.setItem(`db_${table}`, JSON.stringify(data));
    return { lastInsertId: 0, rowsAffected: 1 };
  }

  private parseUpdateValues(sql: string, values: any[]) {
    // Very crude parser for mock updates
    return {};
  }

  serialize(data: any): string { return JSON.stringify(data); }
  deserialize<T>(data: string | null): T {
    if (!data) return [] as any;
    try { return typeof data === 'string' ? JSON.parse(data) : data; }
    catch { return data as any; }
  }
}

export const dbService = new DbService();
export default dbService;
