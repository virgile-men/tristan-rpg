// Abstraction pour la base de données
// Compatible avec D1 (Cloudflare) et better-sqlite3 (local)

export interface DbResult<T> {
  results: T[];
  success: boolean;
}

export interface DbBinding {
  prepare(query: string): DbStatement;
  exec(query: string): Promise<void>;
  batch<T>(statements: DbStatement[]): Promise<DbResult<T>[]>;
}

export interface DbStatement {
  bind(...values: unknown[]): DbStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<DbResult<T>>;
  run(): Promise<{ success: boolean; meta: { changes: number } }>;
}

// Wrapper pour D1 (Cloudflare Workers)
export class D1Database implements DbBinding {
  constructor(private db: D1Database) {}

  prepare(query: string): DbStatement {
    return (this.db as any).prepare(query);
  }

  async exec(query: string): Promise<void> {
    await (this.db as any).exec(query);
  }

  async batch<T>(statements: DbStatement[]): Promise<DbResult<T>[]> {
    return (this.db as any).batch(statements);
  }
}

// Type pour le contexte Cloudflare Workers
export interface Env {
  DB: D1Database;
  ENVIRONMENT?: string;
}
