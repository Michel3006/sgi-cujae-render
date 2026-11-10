const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortValue).sort((a, b) => {
      const left = JSON.stringify(a)
      const right = JSON.stringify(b)
      return left.localeCompare(right)
    })
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortValue(record[key])
        return acc
      }, {})
  }

  return value
}

/** Serializa un snapshot del formulario para comparar si hubo cambios en modo edición. */
export const serializeForDirtyCheck = (value: unknown): string =>
  JSON.stringify(sortValue(value))
