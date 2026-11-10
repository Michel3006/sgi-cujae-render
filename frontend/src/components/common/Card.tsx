import type React from "react"
import "./Card.css"

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: "sm" | "md" | "lg"
}

export const Card: React.FC<CardProps> = ({ children, className = "", padding = "md" }) => {
  return <div className={`card card-padding-${padding} ${className}`}>{children}</div>
}
