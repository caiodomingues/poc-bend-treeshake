import Base

type Shape is Data:
  Shape.Circle{r: U32}

def Shape.area(sh: Shape) -> U32:
  match sh:
    case Shape.Circle{+r}:
      (r * r : U32)

def Place.word() -> U32: 5

def new() -> U32: 1

def class() -> U32: 2

def constructor() -> U32: 3

def __proto__() -> U32: 4

def unused_big() -> List<&2, U32>:
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

def default() -> U32: 6

def then() -> U32: 7
