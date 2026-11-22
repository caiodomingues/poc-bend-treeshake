import R from "./root.bend";
let n = 0, s = 0;
for (let l = R.one(); l.$ === "Con"; l = l.tail) { n++; s = (s + l.head) % 1000003; }
console.log(n, s);
