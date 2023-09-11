import { Database } from "@bdsx/2913simpledb";

const db = Database.connect("./test");

class TestTable extends Database.tableClass {
    @Database.field(Database.JSON_TEXT, {
        PRIMARY_KEY: true,
        NOTNULL: true,
        AUTOINCREMENT: true,
        UNIQUE: true,
    })
    text: string;
    @Database.field(Database.INTEGER)
    value1: number;
}

const table = db.createTable(TestTable, true);