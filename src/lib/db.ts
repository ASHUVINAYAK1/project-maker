import { invoke } from '@tauri-apps/api/core';

/**
 * Database Service with SQL Server (Native Bridge) and Web Fallback
 * Orchestrates cloud persistence with Multi-tenancy support.
 */
class DbService {
  private isTauri = !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;

  // For now, these will be hardcoded. Later they will come from Auth.
  private currentUserId = 'default-user-uuid';
  private currentTenantId = 'default-tenant-uuid';

  /**
   * Initialize the database and run cloud migrations
   */
  async init() {
    console.log(`[DbService] Initializing. Mode: ${this.isTauri ? 'Tauri (SQL Server Bridge)' : 'Browser (LocalStorage)'}`);
    if (this.isTauri) {
      try {
        await this.runMigrations();
        await this.seedDefaultData();
        console.log('[DbService] Cloud migrations completed.');
      } catch (err) {
        console.error('[DbService] Native Init Failed.', err);
        throw err; // Re-throw so App.tsx knows it failed
      }
    }
  }

  private async runMigrations() {
    if (!this.isTauri) return;

    console.log('[DbService] Running migrations...');

    // Use sys.tables which is more reliable in Azure SQL
    const migrations = [
      // Tenants
      `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tenants')
       CREATE TABLE Tenants (
         id NVARCHAR(50) PRIMARY KEY,
         name NVARCHAR(255) NOT NULL,
         createdAt DATETIME2 DEFAULT GETDATE(),
         updatedAt DATETIME2 DEFAULT GETDATE()
       )`,

      // Users
      `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
       CREATE TABLE Users (
         id NVARCHAR(50) PRIMARY KEY,
         email NVARCHAR(255) NOT NULL UNIQUE,
         name NVARCHAR(255),
         tenantId NVARCHAR(50) NOT NULL,
         createdAt DATETIME2 DEFAULT GETDATE(),
         updatedAt DATETIME2 DEFAULT GETDATE(),
         CONSTRAINT FK_User_Tenant FOREIGN KEY (tenantId) REFERENCES Tenants(id)
       )`,

      // Projects
      `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Projects')
       CREATE TABLE Projects (
         id NVARCHAR(50) PRIMARY KEY,
         name NVARCHAR(255) NOT NULL,
         path NVARCHAR(MAX) NOT NULL,
         description NVARCHAR(MAX),
         settings NVARCHAR(MAX),
         tenantId NVARCHAR(50) NOT NULL,
         userId NVARCHAR(50) NOT NULL,
         createdAt DATETIME2 DEFAULT GETDATE(),
         updatedAt DATETIME2 DEFAULT GETDATE(),
         CONSTRAINT FK_Project_Tenant FOREIGN KEY (tenantId) REFERENCES Tenants(id),
         CONSTRAINT FK_Project_User FOREIGN KEY (userId) REFERENCES Users(id)
       )`,

      // Features
      `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Features')
       CREATE TABLE Features (
         id NVARCHAR(50) PRIMARY KEY,
         projectId NVARCHAR(50) NOT NULL,
         title NVARCHAR(255) NOT NULL,
         description NVARCHAR(MAX),
         status NVARCHAR(50) NOT NULL,
         priority NVARCHAR(50) NOT NULL,
         complexity NVARCHAR(50) NOT NULL,
         keyPoints NVARCHAR(MAX),
         acceptanceCriteria NVARCHAR(MAX),
         suggestedTests NVARCHAR(MAX),
         dependencies NVARCHAR(MAX),
         automationStatus NVARCHAR(50) NOT NULL,
         automationLogs NVARCHAR(MAX),
         orderIndex INT DEFAULT 0,
         createdAt DATETIME2 DEFAULT GETDATE(),
         updatedAt DATETIME2 DEFAULT GETDATE(),
         CONSTRAINT FK_Feature_Project FOREIGN KEY (projectId) REFERENCES Projects(id) ON DELETE CASCADE
       )`,

      // Settings
      `IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Settings')
       CREATE TABLE Settings (
         id NVARCHAR(50) PRIMARY KEY,
         value NVARCHAR(MAX) NOT NULL
       )`
    ];

    for (const sql of migrations) {
      try {
        await invoke('execute_sql', { sql, params: [] });
      } catch (err) {
        console.error(`[DbService] Migration failed for SQL: ${sql.substring(0, 50)}...`, err);
        throw err;
      }
    }
  }

  /**
   * Seed default tenant and user if they don't exist
   */
  private async seedDefaultData() {
    console.log('[DbService] Seeding default data...');
    // Check if default tenant exists
    const tenants = await this.query<any>('SELECT * FROM Tenants WHERE id = ?', [this.currentTenantId]);
    if (tenants.length === 0) {
      await this.execute('INSERT INTO Tenants (id, name) VALUES (?, ?)', [this.currentTenantId, 'Default Workspace']);
    }

    // Check if default user exists
    const users = await this.query<any>('SELECT * FROM Users WHERE id = ?', [this.currentUserId]);
    if (users.length === 0) {
      await this.execute('INSERT INTO Users (id, email, name, tenantId) VALUES (?, ?, ?, ?)',
        [this.currentUserId, 'admin@example.com', 'Administrator', this.currentTenantId]);
    }
  }

  getTenantId() { return this.currentTenantId; }
  getUserId() { return this.currentUserId; }

  /**
   * Run a SELECT query
   */
  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    if (this.isTauri) {
      try {
        return await invoke<T[]>('query_sql', { sql, params });
      } catch (error) {
        console.error(`[DbService] QUERY ERROR: ${sql}`, error);
        throw error;
      }
    }
    return [];
  }

  /**
   * Run an EXECUTE command
   */
  async execute(sql: string, params: any[] = []) {
    if (this.isTauri) {
      try {
        const rowsAffected = await invoke<number>('execute_sql', { sql, params });
        return { rowsAffected };
      } catch (error) {
        console.error(`[DbService] EXECUTE ERROR: ${sql}`, error);
        throw error;
      }
    }
    return { rowsAffected: 1 };
  }

  serialize(data: any): string { return JSON.stringify(data); }
  deserialize<T>(data: any): T {
    if (!data) return [] as any;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return data as any; }
    }
    return data as T;
  }
}

export const dbService = new DbService();
export default dbService;
