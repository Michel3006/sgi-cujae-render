"use client"

import type React from "react"
import "./Table.css"

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
}

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  onRowClick?: (item: T) => void
}

export function Table<T extends { id: string }>({ data, columns, onRowClick }: TableProps<T>) {
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                No hay datos disponibles
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={item.id} onClick={() => onRowClick?.(item)} className={onRowClick ? "table-row-clickable" : ""}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {column.render ? column.render(item) : String((item as any)[column.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
