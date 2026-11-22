import { shapes, total, bumped, adder } from "./root.bend";
console.log(JSON.stringify(shapes()));
console.log(total(), bumped(41), adder(2)(40), bumped()(1));
