export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  if (timeoutMs <= 0) {
    return promise
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer) {
      clearTimeout(timer)
    }
  }
}
