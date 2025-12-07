declare module 'sql.js' {
  interface SqlJsStatic {
    Database: typeof Database;
  }

  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface ParamsObject {
    [key: string]: any;
  }

  interface ParamsCallback {
    (obj: ParamsObject): void;
  }

  interface Statement {
    bind(params?: any[] | ParamsObject): boolean;
    step(): boolean;
    getAsObject(params?: ParamsObject): ParamsObject;
    get(params?: any[]): any[];
    free(): boolean;
    reset(): void;
    run(params?: any[] | ParamsObject): void;
  }

  class Database {
    constructor(data?: ArrayLike<number> | Buffer | null);
    run(sql: string, params?: any[] | ParamsObject): Database;
    exec(sql: string, params?: any[] | ParamsObject): QueryExecResult[];
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
  export { Database, SqlJsStatic, QueryExecResult, Statement };
}
