//
// _______        _______    __     _____     ______    ___      ___                                                      ________          ___      __________
// |      \      /      |   |__|    |    \    |    |    \  \    /  /    ___________     ___________       __________    _|        |__      /   |    |  ____    |
// |       \    /       |    __     |     \   |    |     \  \  /  /     |   _______|    |   _______|     |  ____    |   |           |     /_   |    |__|  |    |
// |        \__/        |   |  |    |      \  |    |      \  \/  /      |  |_______     |  |_______      |__|   /   |   |_          |       |  |       ___|    |
// |     |\      /|     |   |  |    |   |\  \ |    |       |    |       |   _______|    |   _______|           /   /      |______   |       |  |     _|___     |
// |     | \____/ |     |   |  |    |   | \  \|    |       |    |       |  |_______     |  |_______       ____/   /__            |  |    ___|  |__  |  |__|    |
// |_____|        |_____|   |__|    |___|  \_______|       |____|       |__________|    |__________|     |___________|           |__|   |_________| |__________|
//
//

import  "colors";
import { existsSync, mkdir, readFile, unlink } from "fs";
import * as _ from "lodash";
import * as Path from "path";
const sqlite = require("sqlite-sync");
const eventBDSX = require("bdsx/event");

type TableT = typeof Database.tableClass;

export class Database {
    protected path: string;
    protected db: any;
    protected sqlite: any;
    protected closed = false;

    protected _getFileName<C extends TableT>(clz: C): string {
        return clz[Database.identifier] || clz.name;
    }

    static connect(path: string): Database {
        const database = new Database();
        database.sqlite = new sqlite.constructor();

        if (path.includes("/")) {
            const paths = path.split("/");
            let pth = "";
            _.forEach(paths, (v, i) => {
                // if (v === ".")
                if (i < paths.length - 1) {
                    pth += `/${v}`;
                    if (!existsSync(pth)) mkdir(pth, () => {});
                }
            });
        }
        if (path.startsWith("./") || path.startsWith("../")) database.path = Path.join(process.cwd(), path + ".db");
        else database.path = path + ".db";

        database.db = database.sqlite.connect(database.path);
        console.log("[Database] connected".gray + ` - ${database.db.file}`.green);

        if (eventBDSX?.events) eventBDSX.events.serverStop.on(() => {
            database.close();
        });

        return database;
    }

    createTable<C extends TableT>(tableClass: C, IfNotExists = false, callback?: () => {}): Database.Table<C> {
        let exists = "";
        if (IfNotExists) exists = " IF NOT EXISTS";

        let Fields: string[] = [];
        const name = this._getFileName(tableClass);
        const structure = tableClass.getStructure();
        if (!structure) throw `[database] ${name} doesn't have fields`;

        structure.forEach((field, key) => {
            if (typeof field === "object") {
                const field_ = field[0];
                const option = field[1];

                const NOTNULL = option.NOTNULL === true ? " NOT NULL" : "";
                const UNIQUE = option.UNIQUE === true ? " UNIQUE" : "";
                const PRIMARY_KEY = option.PRIMARY_KEY === true ? " PRIMARY KEY" : "";
                const AUTOINCREMENT = option.AUTOINCREMENT === true ? " AUTOINCREMENT" : "";

                Fields.push(`${key} ${field_}${NOTNULL}${UNIQUE}${PRIMARY_KEY}${AUTOINCREMENT}`);
            } else Fields.push(`${key} ${field}`);
        });

        const query = `CREATE TABLE${exists} ${name} (${Fields.join(", ")});`;
        const result1 = this.run(`SELECT sql FROM sqlite_master WHERE name='${name}'`) as { sql: string }[];

        if (result1.length >= 1 && result1[0].sql !== `CREATE TABLE ${name} (${Fields.join(", ")})`) {
            const table = this.getTable(tableClass);
            const values = table.values();

            this.deleteTable(tableClass);
            this.run(query, callback);

            console.log("[Database] table's field changed.".gray + ` Remake table '${name}'`.yellow);

            _.forEach(values, (value) => {
                this.insert(name, value);
            });
        } else this.run(query, callback);

        (Fields as any) = null;

        return this.getTable(tableClass);
    }

    getTable<C extends TableT>(tableClass: C): Database.Table<C> {
        const name = this._getFileName(tableClass);
        const result = this.run(`SELECT COUNT(*) FROM sqlite_master WHERE name='${name}';`);
        if (result.error) throw result.error;

        let has = false;
        for (const key in result[0]) {
            has = result[0][key] === 1;
        }

        if (has) {
            const js = new Database.Table(this, name);
            js.cls = tableClass;

            return js as Database.Table<C>;
        } else throw Error("Can't load the table");
    }

    deleteTable(table: TableT | string): any[] | any | null {
        let name = "";
        if (typeof table === "string") name = table;
        else name = table.name;

        const result = this.run(`SELECT COUNT(*) FROM sqlite_master WHERE name='${name}';`);
        if (result.error) throw result.error;

        let has = false;
        for (const key in result[0]) {
            has = result[0][key] === 1;
        }

        if (has) {
            return this.run(`DROP TABLE ${name}`);
        }
        return null;
    }

    run(sql: string, options?: any[] | Function, callback?: () => {}): any[] | any {
        return this.db.run(sql, options, callback);
    }

    runAsync(sql: string, options?: any[] | Function, callback?: () => {}): any[] | any {
        return this.db.runAsync(sql, options, callback);
    }

    insert(table: Database.tableClass | string, data: any, callback?: () => {}): number | any {
        let name = (table as any).name;
        if (typeof table === "string") name = table;

        for (const key in data) {
            if (typeof data[key] === "object") data[key] = "JSON-" + JSON.stringify(data[key]);
            else if (typeof data[key] == "boolean") data[key] = String(data[key]);
        }

        const result = this.db.insert(name, data, callback);

        if (result.error) throw result.error;

        return result;
    }

    update(table: Database.tableClass | string, data: any, clause?: any | Function, callback?: () => {}): boolean | any {
        let name = (table as any).name;
        if (typeof table === "string") name = table;
        for (const key in data) {
            if (typeof data[key] === "object") data[key] = "JSON-" + JSON.stringify(data[key]);
            else if (typeof data[key] == "boolean") data[key] = String(data[key]);
        }

        const result = this.db.update(name, data, clause, callback);

        if (result.error) throw result.error;

        return result;
    }

    delete(table: Database.tableClass | string, clause?: any | Function, callback?: () => {}): boolean | any {
        let name = (table as any).name;
        if (typeof table === "string") name = table;

        const result = this.db.delete(name, clause, callback);

        if (result.error) throw result.error;

        return result;
    }

    hasData(table: Database.tableClass | string, where: any): boolean {
        let name = (table as any).name;
        if (typeof table === "string") name = table;

        let selects: string[] = [];
        for (const key in where) {
            selects.push(`${key} = ${where[key]}`);
        }
        const result = this.db.run(`SELECT EXISTS (SELECT * FROM ${name} WHERE ${selects.join(" AND ")})`);

        if (result.error) throw result.error;

        let forReturn = false;
        for (const key in result[0]) {
            forReturn = result[0][key] === 1;
        }

        (selects as any) = null;

        return forReturn;
    }

    close(): void {
        if (this.closed) return;

        this.db.close();
        this.closed = true;
        console.log("[Database] closed".gray + ` - ${this.path}`.red);
    }
}

export namespace Database {
    export const identifier = Symbol("Database.Identifier");
    export const TEXT = "TEXT";
    export type TEXT = string;

    export const INTEGER = "INTEGER";
    export type INTEGER = number;

    // export const BLOB = "BLOB";
    // export type BLOB = ;

    export const BOOLEAN = "TEXT";
    export type BOOLEAN = boolean;

    export const NUMERIC = "NUMERIC";
    export type NUMERIC = number;

    export const REAL = "REAL";
    export type REAL = number;

    export const JSON_TEXT = "JSON_TEXT";
    export type JSON_TEXT = Record<string, any>;

    export type fieldType = TEXT | INTEGER | NUMERIC | REAL | JSON_TEXT | BOOLEAN;

    type StructureMap = Map<
        string,
        | fieldType
        | [
              fieldType,
              {
                  NOTNULL?: boolean;
                  UNIQUE?: boolean;
                  PRIMARY_KEY?: boolean;
                  AUTOINCREMENT?: boolean;
              },
          ]
    >;
    export class tableClass {
        constructor(..._args: any[]) {}
        static [Database.identifier]?: string;
        static getStructure(): StructureMap | undefined {
            const structure = classStructure.get(this.prototype.constructor);
            return structure;
        }
    }

    export class Table<CLAZZ extends TableT, T extends tableClass = InstanceType<CLAZZ>> {
        cls: CLAZZ;
        constructor(public db: Database, public name: string) {}

        values(): T[] {
            const result = this.db.run(`SELECT * FROM ${this.name};`);

            if (result.error) throw result.error;

            _.forEach(result as Record<string, any>[], (v) => {
                for (const key in v) {
                    const value = v[key];
                    if (typeof value !== "string") continue;
                    if (value === "JSON-null") v[key] = null;
                    if (value === "JSON-undefined") v[key] = undefined;
                    else if (value.startsWith("JSON-")) v[key] = JSON.parse(value.replace("JSON-", ""));
                    else if (value === "true") v[key] = true;
                    else if (value === "false") v[key] = false;
                }
                Object.setPrototypeOf(v, this.cls.prototype);
            });

            return result as T[];
        }

        get(where: Record<string, any>): T | undefined {
            let wheres: string[] = [];
            for (const key in where) {
                wheres.push(`${key} = '${where[key]}'`);
            }
            const result = this.db.run(`SELECT * FROM ${this.name} WHERE ${wheres.join(" AND ")};`);

            (wheres as any) = null;

            if (result.error) throw result.error;

            if (result.length < 1) return;

            const forReturn = result[0];
            if (forReturn != null) {
                for (const key in forReturn) {
                    const value = forReturn[key];
                    if (typeof value !== "string") continue;
                    if (value === "JSON-null") forReturn[key] = null;
                    if (value === "JSON-undefined") forReturn[key] = undefined;
                    else if (value.startsWith("JSON-")) forReturn[key] = JSON.parse(value.replace("JSON-", ""));
                    else if (value === "true") forReturn[key] = true;
                    else if (value === "false") forReturn[key] = false;
                }
                Object.setPrototypeOf(forReturn, this.cls.prototype);
            }
            return forReturn;
        }

        insertFromFile(path: string): void {
            if (existsSync(path))
                try {
                    readFile(path, "utf8", (err, data) => {
                        if (err == null) {
                            const json = JSON.parse(data);
                            if (!Array.isArray(json)) return;

                            _.forEach(json, (v) => {
                                this.insert(v);
                            });
                            console.log(`[Database] insert from '${path}' at Table '${this.name}'.`.gray);
                        }
                        unlink(path, () => {});
                    });
                } catch {}
        }

        insert(data: T, callback?: () => {}): number | any {
            return this.db.insert(this.name, data, callback);
        }

        update(data: T | any, clause?: any | Function, callback?: () => {}): boolean | any {
            return this.db.update(this.name, data, clause, callback);
        }

        delete(clause?: any | Function, callback?: () => {}): boolean | any {
            return this.db.delete(this.name, clause, callback);
        }

        hasData(where: any): boolean {
            return this.db.hasData(this.name, where);
        }
    }

    export const classStructure = new Map<
        Function,
        Map<
            string,
            | fieldType
            | [
                  fieldType,
                  {
                      NOTNULL?: boolean;
                      UNIQUE?: boolean;
                      PRIMARY_KEY?: boolean;
                      AUTOINCREMENT?: boolean;
                  },
              ]
        >
    >();

    export function field(
        type: fieldType,
        options?: {
            NOTNULL?: boolean | undefined;
            UNIQUE?: boolean | undefined;
            PRIMARY_KEY?: boolean | undefined;
            AUTOINCREMENT?: boolean;
        },
    ) {
        return <K extends string>(obj: Record<K, fieldType | null>, key: K): void => {
            let data = new Map<
                string,
                | fieldType
                | [
                      fieldType,
                      {
                          NOTNULL?: boolean;
                          UNIQUE?: boolean;
                          PRIMARY_KEY?: boolean;
                          AUTOINCREMENT?: boolean;
                      },
                  ]
            >();
            const structure = classStructure.get(obj.constructor);
            if (structure) data = structure;

            if (options) data.set(key, [type, options]);
            else data.set(key, type);

            classStructure.set(obj.constructor, data);
        };
    }
}
