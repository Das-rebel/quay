// Type declarations for Bun-specific modules not yet in @types
declare module 'bun:sqlite' {
  export interface Statement {
    run(...params: unknown[]): void;
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
  }
  export class Database {
    constructor(path: string);
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
  }
}
