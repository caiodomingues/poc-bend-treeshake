import Base
import ./b.bend as B
import ./c.bend as C

def both() -> U32: (B.left() + C.right() : U32)
