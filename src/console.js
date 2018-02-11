function writeToStream(stream, ...messages) {
  let first = true
  for (const message of messages) {
    if (!first) {
      first = false
      process.stdout.write(" ")
    }
    process.stdout.write(message)
  }
}

export function write(...messages) {
  writeToStream(process.stdout, ...messages)
}

export function writeLn(...messages) {
  writeToStream(process.stdout, ...messages, "\n")
}

export function writeErr(...messages) {
  writeToStream(process.stderr, ...messages)
}

export function writeErrLn(...messages) {
  writeToStream(process.stderr, ...messages, "\n")
}
