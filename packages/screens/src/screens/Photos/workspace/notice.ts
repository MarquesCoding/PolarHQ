type Listener = (message: string) => void

const listeners = new Set<Listener>()

/** Show a transient success message inside the Photos bottom chrome (morphs the size/sort pill),
 *  instead of a floating toast. No-op if the workspace chrome isn't mounted. */
export const photoNotice = (message: string): void => {
  for (const listener of listeners) listener(message)
}

export const onPhotoNotice = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
