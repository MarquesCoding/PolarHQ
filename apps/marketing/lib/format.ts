const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export const formatDate = (iso: string) => {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number)
  return `${MONTHS[m - 1] ?? ""} ${d}, ${y}`
}
