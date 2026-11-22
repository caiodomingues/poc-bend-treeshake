import Base
import ./lib.bend as L

def shapes() -> List<&2, L.Shape>: [L.Shape.Circle{2}, L.Shape.Square{3}]

def total() -> U32: (L.area(L.Shape.Circle{2}) + L.area(L.Shape.Square{3}) : U32)

def bumped(x: U32) -> U32: L.apply(y => (y + 1 : U32), x)

def adder(n: U32) -> U32 -> U32: x => (x + n : U32)
