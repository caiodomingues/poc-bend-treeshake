import Base

def Ping.go() -> IO(U32):
  import "./ping.js"

def used() -> U32: 7

def unused_io() -> IO(U32): Ping.go()

def unused_thunk() -> Unit -> IO(U32): u => Ping.go()
