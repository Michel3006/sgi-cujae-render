"use client"

import type React from "react"
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react"
import { createPortal } from "react-dom"
import "./OptionsMenu.css"

interface OptionsMenuProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  options?: Array<{
    label: string
    onClick: () => void
    className?: string
  }>
}

const MENU_MIN_WIDTH = 168
const VIEWPORT_PAD = 8
const GAP = 4
const PORTAL_Z_INDEX = 10_050

export const OptionsMenu: React.FC<OptionsMenuProps> = ({ onView, onEdit, onDelete, options }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number; maxHeight: number }>({
    top: 0,
    left: 0,
    maxHeight: 280,
  })

  const itemCount = useMemo(() => {
    if (options && options.length > 0) return options.length
    return [onView, onEdit, onDelete].filter(Boolean).length
  }, [options, onView, onEdit, onDelete])

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const width = Math.max(dropdownRef.current?.offsetWidth ?? MENU_MIN_WIDTH, MENU_MIN_WIDTH)

    let left = rect.right - width
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - width - VIEWPORT_PAD))

    const naturalHeight = dropdownRef.current?.offsetHeight || itemCount * 44 + 12
    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_PAD
    const spaceAbove = rect.top - GAP - VIEWPORT_PAD

    let top = rect.bottom + GAP
    let maxHeight = Math.min(280, Math.max(spaceBelow, 80))

    const preferAbove = naturalHeight > spaceBelow && spaceAbove > spaceBelow

    if (preferAbove) {
      maxHeight = Math.min(280, Math.max(spaceAbove, 80))
      top = Math.max(VIEWPORT_PAD, rect.top - Math.min(naturalHeight, maxHeight) - GAP)
    }

    if (top + Math.min(naturalHeight, maxHeight) > window.innerHeight - VIEWPORT_PAD) {
      maxHeight = Math.max(80, window.innerHeight - top - VIEWPORT_PAD)
    }

    setCoords({ top, left, maxHeight })
  }, [itemCount])

  useLayoutEffect(() => {
    if (!isOpen) return

    computePosition()
    const raf = requestAnimationFrame(() => computePosition())

    return () => cancelAnimationFrame(raf)
  }, [isOpen, computePosition, itemCount, options, onView, onEdit, onDelete])

  useEffect(() => {
    if (!isOpen) return
    const handleReposition = () => computePosition()
    window.addEventListener("scroll", handleReposition, true)
    window.addEventListener("resize", handleReposition)
    return () => {
      window.removeEventListener("scroll", handleReposition, true)
      window.removeEventListener("resize", handleReposition)
    }
  }, [isOpen, computePosition])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen])

  const dropdownContent = (
    <>
      {options && options.length > 0 ? (
        options.map((option, index) => (
          <button
            key={index}
            type="button"
            role="menuitem"
            className={`options-menu-item ${option.className || ""}`}
            onClick={() => {
              option.onClick()
              setIsOpen(false)
            }}
          >
            {option.label}
          </button>
        ))
      ) : (
        <>
          {onView && (
            <button
              type="button"
              role="menuitem"
              className="options-menu-item"
              onClick={() => {
                onView()
                setIsOpen(false)
              }}
            >
              Ver detalles
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              className="options-menu-item"
              onClick={() => {
                onEdit()
                setIsOpen(false)
              }}
            >
              Modificar
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              className="options-menu-item delete"
              onClick={() => {
                onDelete()
                setIsOpen(false)
              }}
            >
              Eliminar
            </button>
          )}
        </>
      )}
    </>
  )

  const portalTarget = typeof document !== "undefined" ? document.body : null

  return (
    <div className="options-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="options-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Opciones"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        ⋮
      </button>
      {isOpen && portalTarget
        ? createPortal(
            <div
              ref={dropdownRef}
              className="options-menu-dropdown options-menu-dropdown--portal"
              style={{
                top: coords.top,
                left: coords.left,
                minWidth: MENU_MIN_WIDTH,
                maxHeight: coords.maxHeight,
                zIndex: PORTAL_Z_INDEX,
              }}
              role="menu"
            >
              {dropdownContent}
            </div>,
            portalTarget,
          )
        : null}
    </div>
  )
}
