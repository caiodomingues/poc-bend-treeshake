import R from "./root.bend";
console.log(JSON.stringify(R.shapes()));
console.log(R.total(), R.bumped(41), R.adder(2)(40), R.bumped()(1));
