import { useEffect, useState } from "react"
import { groupService } from "../services/groupService"
import { projectService } from "../services/projectService"
import type { Group } from "../types/api/group"
import type { Project } from "../types/api/project"

const MIN_SEARCH_LENGTH = 2
const DEBOUNCE_MS = 400
const SEARCH_LIMIT = 20

type SearchHook<T> = {
  term: string
  setTerm: (value: string) => void
  results: T[]
  isLoading: boolean
  error: string | null
}

const createSearchHook = <T>(searchFn: (query: string) => Promise<T[]>): (() => SearchHook<T>) => {
  return () => {
    const [term, setTerm] = useState("")
    const [results, setResults] = useState<T[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      let isMounted = true
      const query = term.trim()

      if (query.length < MIN_SEARCH_LENGTH) {
        setResults([])
        setError(null)
        setIsLoading(false)
        return () => {
          isMounted = false
        }
      }

      const handler = setTimeout(async () => {
        try {
          setIsLoading(true)
          const data = await searchFn(query)
          if (isMounted) {
            setResults(data)
            setError(null)
          }
        } catch (err) {
          if (isMounted) {
            setError((err as Error).message || "Error en la búsqueda")
            setResults([])
          }
        } finally {
          if (isMounted) {
            setIsLoading(false)
          }
        }
      }, DEBOUNCE_MS)

      return () => {
        isMounted = false
        clearTimeout(handler)
      }
    }, [term])

    return { term, setTerm, results, isLoading, error }
  }
}

export const useGroupSearch = createSearchHook<Group>((query) =>
  groupService.getAllGroups({ search: query, limit: SEARCH_LIMIT }),
)

export const useProjectSearch = createSearchHook<Project>((query) =>
  projectService.getAllProjects({ search: query, limit: SEARCH_LIMIT }),
)
