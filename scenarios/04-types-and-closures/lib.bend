import Base

type Shape is Data:
  Shape.Circle{r: U32}
  Shape.Square{s: U32}

def area(sh: Shape) -> U32:
  match sh:
    case Shape.Circle{+r}:
      (r * r * 3 : U32)
    case Shape.Square{+s}:
      (s * s : U32)

def apply(f: U32 -> U32, x: U32) -> U32: f(x)

def never_called(sh: Shape) -> Shape: sh
