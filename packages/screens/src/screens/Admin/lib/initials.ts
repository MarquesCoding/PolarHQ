/** First letters of the first two words of a name, uppercased, for avatar fallbacks. */
export const initials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
