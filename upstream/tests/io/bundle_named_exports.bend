# A module's own defs are also named exports, under their Bend names, so a
# page that imports one by name ships only what it reaches; the default
# object stays as it was, and `default` and `then` are not named exports.
import Base

def Bundle.named_exports() -> IO(U32):
  import "./bundle_named_exports.js"

def main() -> IO(Unit):
  do IO<Unit>:
    value : U32 <- Bundle.named_exports()
    IO.print(U32.show(value))

#|0
