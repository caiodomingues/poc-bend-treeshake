import R from "./root.bend";
const k = Object.keys(R).find((k) => k.endsWith(":used"));
console.log("keys:", Object.keys(R).sort().join(","));
console.log("imported def through the default object:", k ? R[k]() : "not exported");
