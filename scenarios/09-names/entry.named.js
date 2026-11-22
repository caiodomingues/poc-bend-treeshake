import D, { "Place.word" as word, "Shape.area" as area, new as n, class as c, constructor as k, __proto__ as p } from "./root.bend";
const NS = await import("./root.bend");
console.log(word(), area({ $: "Circle", r: 3 }), n(), c(), k(), p(), D.default(), D.then());
console.log("same functions:", D["Place.word"] === word && NS["Place.word"] === word, "| not named:", "then" in NS ? "then" : "-", Object.keys(NS).includes("default") ? "default is the object" : "?");
