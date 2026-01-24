import { Database } from '@hocuspocus/extension-database';
import pg from 'pg';

const { Pool } = pg;

/**
 * PostgreSQL persistence extension for Hocuspocus
 * Stores Yjs documents in the yjs_documents table
 */
export class PostgresExtension extends Database {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    super({
      fetch: async ({ documentName }) => {
        return this.fetchDocument(documentName);
      },
      store: async ({ documentName, state }) => {
        return this.storeDocument(documentName, state);
      },
    });

    this.pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection on startup
    this.pool.query('SELECT 1')
      .then(() => console.log('[Postgres] Connected to database'))
      .catch((err) => {
        console.error('[Postgres] Failed to connect:', err.message);
        process.exit(1);
      });
  }

  private async fetchDocument(documentName: string): Promise<Uint8Array | null> {
    try {
      const result = await this.pool.query<{ data: Buffer }>(
        'SELECT data FROM yjs_documents WHERE name = $1',
        [documentName]
      );

      if (result.rows.length === 0) {
        console.log(`[Postgres] Document not found: ${documentName}`);
        return null;
      }

      console.log(`[Postgres] Fetched document: ${documentName}`);
      return new Uint8Array(result.rows[0].data);
    } catch (error) {
      console.error(`[Postgres] Error fetching document ${documentName}:`, error);
      throw error;
    }
  }

  private async storeDocument(documentName: string, state: Uint8Array): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO yjs_documents (name, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (name)
         DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [documentName, Buffer.from(state)]
      );

      console.log(`[Postgres] Stored document: ${documentName} (${state.byteLength} bytes)`);
    } catch (error) {
      console.error(`[Postgres] Error storing document ${documentName}:`, error);
      throw error;
    }
  }

  async destroy(): Promise<void> {
    await this.pool.end();
    console.log('[Postgres] Connection pool closed');
  }
}
