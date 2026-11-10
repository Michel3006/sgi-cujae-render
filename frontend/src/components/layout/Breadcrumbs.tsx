import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"
import type { BreadcrumbItem } from "./navigationConfig"
import "./Breadcrumbs.css"

type BreadcrumbsProps = {
  items: BreadcrumbItem[]
}

export const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  if (items.length === 0) return null

  return (
    <nav className="app-breadcrumbs" aria-label="Ruta de navegación">
      <ol className="app-breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="app-breadcrumbs__item">
              {index > 0 ? (
                <ChevronRight className="app-breadcrumbs__separator" size={14} aria-hidden />
              ) : null}
              {item.path && !isLast ? (
                <Link to={item.path} className="app-breadcrumbs__link">
                  {item.label}
                </Link>
              ) : (
                <span className="app-breadcrumbs__current" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
