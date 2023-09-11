import { Database } from "@bdsx/2913simpledb";
import { events } from "bdsx/event";

const db = Database.connect("./playerTest");

class Player extends Database.tableClass {
    @Database.field(Database.TEXT, {
        PRIMARY_KEY: true,
        NOTNULL: true,
    })
    xuid: string;
    @Database.field(Database.TEXT)
    name: string;
    @Database.field(Database.INTEGER)
    level: number;
}

const players = db.createTable(Player, true);

events.playerJoin.on((ev)=>{
    const xuid = ev.player.getXuid();
    const name = ev.player.getName();
    const level = ev.player.getExperienceLevel();

    if (!players.hasData({xuid: xuid})) {
        const player = new Player();
        player.xuid = xuid;
        player.name = name;
        player.level = level;

        players.insert(player);
    } else {
        players.update({level: level}, {xuid: xuid});
    }
});
