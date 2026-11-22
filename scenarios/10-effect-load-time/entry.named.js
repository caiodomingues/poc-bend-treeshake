import { pick } from "./root.bend";
console.log(pick(), "| effect file ran at load:", (globalThis.PING_LOADED ?? 0) > 0);
