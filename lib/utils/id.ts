const createUuidFromBytes = (bytes: Uint8Array) => {
  const normalized = [...bytes]

  normalized[6] = (normalized[6] & 0x0f) | 0x40
  normalized[8] = (normalized[8] & 0x3f) | 0x80

  const hex = normalized.map((value) => value.toString(16).padStart(2, '0')).join('')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-')
}

const createFallbackUuid = () => {
  const cryptoObject = globalThis.crypto

  if (cryptoObject?.getRandomValues) {
    return createUuidFromBytes(cryptoObject.getRandomValues(new Uint8Array(16)))
  }

  return [Date.now().toString(36), Math.random().toString(36).slice(2, 10), Math.random().toString(36).slice(2, 10)].join('-')
}

export const createUniqueId = (prefix?: string) => {
  const value = globalThis.crypto?.randomUUID?.() ?? createFallbackUuid()
  return prefix ? `${prefix}-${value}` : value
}

export const createShortId = (length = 8) => {
  return createUniqueId().replace(/-/g, '').slice(0, length).toUpperCase()
}