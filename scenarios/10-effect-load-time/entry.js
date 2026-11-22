import R from "./root.bend";
console.log(R.pick(), "| effect file ran at load:", (globalThis.PING_LOADED ?? 0) > 0);
