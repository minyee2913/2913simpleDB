
import { events } from "bdsx/event";

console.log('[plugin:Plugin] allocated');

events.serverOpen.on(()=>{
    console.log('[plugin:Plugin] launching');
});

events.serverClose.on(()=>{
    console.log('[plugin:Plugin] closed');
});

