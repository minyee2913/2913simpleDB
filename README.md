# 2913simpleDB
A database API based on SQlite-sync

## Features
- No risk of missing query
- Apply changes to fields in a table immediately
- can manage database easily
- It automatically closes db when server closed

# HOW TO USE?
- step 1. Install plugin
    <br> Install from `plugin-manager` or `npm command`
    ```sh
    npm i @bdsx/2913simpledb
    ```
- step 2. Connect database file
    ```ts
    import { Database } from "@bdsx/2913simpledb";

    /**
     * just write file name. script will automatically add '.db'
     */
    const db = Database.connect("./test"); // ->  ./test.db
    ```
- step 3. Create `TableClass`
    <br>You should make a class of table
    ```ts
    class TestTable extends Database.tableClass {

    }
    ```
- step 3. Define fields
    <br>You must put `@Database.field` front of a value
    ```ts
    class TestTable extends Database.tableClass {
        @Database.field(Database.TEXT)
        text: string;
        @Database.field(Database.INTEGER)
        int: number;
        @Database.field(Database.NUMERIC)
        num: number;
        @Database.field(Database.REAL)
        real: number;
        @Database.field(Database.BOOLEAN)
        bool: boolean;
    }
    ```
    We support json as `JSON_TEXT`.
    <br>It is converted to a string when saving and back to json when it loaded.
    ```ts
    class TestTable extends Database.tableClass {
        @Database.field(Database.JSON_TEXT)
        object: Record<string, any> = {
            name: "test",
            age: 17,
            isDead: false,
            data: {
                //...
            }
        }
    }
    ```
    You can optimize fields options
    ```ts
    class TestTable extends Database.tableClass {
        @Database.field(Database.TEXT, {
            PRIMARY_KEY: true,
            NOTNULL: true,
            AUTOINCREMENT: true,
            UNIQUE: true,
        })
        optimizedText: string;
    }
    ```
- step 3. Create Table in database
    <br>Put `TableClass` at database
    ```ts
    /**
     * @TableClass - tableClass
     * @boolean - Create only if it doesn't exist
     * @callback <optional> - callback data of sqlite-sync
    */
    const table = db.createTable(TestTable, true);
    ```
- step 4. Manage table and values
    <br>You can insert values like..
    ```ts
    const newValue = new TestTable();

    table.insert(newValue);
    ```
    You can get values..
    ```ts
    class TestTable extends Database.tableClass {
        @Database.field(Database.TEXT, {
            PRIMARY_KEY: true,
            NOTNULL: true,
        })
        id: string;
        @Database.field(Database.INTEGER)
    }//table definition

    const find = table.get({ id: "testId" }); //find value with id testId
    ```
    When you update values..
    ```ts
    const find = table.get({ id: "testId" });

    find.value1 = 10;

    //update value with id testId
    table.update(find, { id: "testId" }); //update All fields
    table.update({ value1: find.value1 }, { id: "testId" }); //update particular fields
    ```
    If you want to check table has data..
    ```ts
    if (table.hasData({ id: "testId" })) {
        console.log("table has testId!");
    } else {
        console.log("table doesn't have testId!");
    }
    ```
    When you get data from other json file..
    ```ts
    table.insertFromFile(/* file path */);
    ```
    When you want to delete value..
    ```ts
    table.delete({ id: "testId" });  //delete value with id testId
    ```
    When you want to get values as an array..
    ```ts
    const arr = table.values(); //return TestTable[];
    ```