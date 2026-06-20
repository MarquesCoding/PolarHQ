/** Human-readable byte size (e.g. "1.4 GB"). */
export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/** Byte size split into its scaled value, unit and decimal precision — for animating with NumberFlow. */
export const bytesParts = (bytes: number): { value: number; unit: string; decimals: number } => {
  if (bytes <= 0) return { value: 0, unit: "B", decimals: 0 }
  const units = ["B", "KB", "MB", "GB", "TB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  const decimals = value >= 10 || exponent === 0 ? 0 : 1
  return { value: Number(value.toFixed(decimals)), unit: units[exponent]!, decimals }
}
