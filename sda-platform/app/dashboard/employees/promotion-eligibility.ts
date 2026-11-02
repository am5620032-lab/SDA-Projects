export function getPromotionEligibilityDate(
  hireDate: string | null,
  lastPromotionDate: string | null,
  today = new Date().toISOString().slice(0, 10),
): string | null {
  const isValidDate = (value: string | null): value is string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const timestamp = Date.parse(`${value}T00:00:00Z`)
    return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
  }

  const referenceDate = isValidDate(lastPromotionDate)
    ? lastPromotionDate
    : isValidDate(hireDate)
      ? hireDate
      : null
  if (!referenceDate) return null

  const [year, month, day] = referenceDate.split('-').map(Number)
  const eligibilityDate = new Date(Date.UTC(year + 4, month - 1, day)).toISOString().slice(0, 10)
  return eligibilityDate <= today ? eligibilityDate : null
}
