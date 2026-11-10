import type { KeyboardEvent } from "react"
import type { Group } from "../../types/api/group"
import type { Project } from "../../types/api/project"
import { Input } from "../common/Input"
import { Button } from "../common/Button"

export type LinkedEntity = {
  id: number
  label: string
}

type EntitySearchProps<T> = {
  id: string
  label: string
  placeholder: string
  selected: LinkedEntity | null
  searchTerm: string
  onSearchTermChange: (value: string) => void
  results: T[]
  isLoading: boolean
  error: string | null
  disabled?: boolean
  getOptionId: (item: T) => number
  getOptionLabel: (item: T) => string
  getOptionHint?: (item: T) => string | null
  onSelect: (item: T) => void
  onClear: () => void
}

const EntitySearchField = <T,>({
  id,
  label,
  placeholder,
  selected,
  searchTerm,
  onSearchTermChange,
  results,
  isLoading,
  error,
  disabled = false,
  getOptionId,
  getOptionLabel,
  getOptionHint,
  onSelect,
  onClear,
}: EntitySearchProps<T>) => {
  const hasMinSearchLength = searchTerm.trim().length >= 2
  const showDropdown = !disabled && !selected && hasMinSearchLength

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && selected) {
      onClear()
    }
  }

  return (
    <div className="form-group full-width entity-search-field">
      <label htmlFor={id}>{label}</label>

      {selected ? (
        <div className="linked-entity-chip" role="status" aria-live="polite">
          <span className="linked-entity-chip__label">{selected.label}</span>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClear}
              aria-label={`Quitar ${label.toLowerCase()}`}
            >
              Quitar
            </Button>
          )}
        </div>
      ) : (
        <div className="entity-search-input-wrap">
          <Input
            id={id}
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            aria-label={placeholder}
            aria-autocomplete="list"
            aria-expanded={showDropdown}
            aria-controls={`${id}-listbox`}
          />
          {showDropdown && (
            <ul
              id={`${id}-listbox`}
              className="entity-search-dropdown"
              role="listbox"
              aria-label={`Resultados de ${label}`}
            >
              {isLoading && <li className="entity-search-dropdown__empty">Buscando...</li>}
              {error && <li className="entity-search-dropdown__error">{error}</li>}
              {!isLoading && !error && results.length === 0 && (
                <li className="entity-search-dropdown__empty">No se encontraron coincidencias</li>
              )}
              {!isLoading &&
                !error &&
                results.map((item) => {
                  const optionId = getOptionId(item)
                  const hint = getOptionHint?.(item)
                  const labelText = getOptionLabel(item)
                  return (
                    <li key={optionId} role="option" aria-selected={false}>
                      <button
                        type="button"
                        className="entity-search-dropdown__option"
                        onMouseDown={(event) => {
                          event.preventDefault()
                          onSelect(item)
                        }}
                      >
                        <span>{labelText || `ID ${optionId}`}</span>
                        {hint ? <span className="entity-search-dropdown__hint">{hint}</span> : null}
                      </button>
                    </li>
                  )
                })}
            </ul>
          )}
        </div>
      )}

      {!selected && (
        <small className="form-hint">Opcional. Escriba al menos 2 caracteres para buscar por nombre.</small>
      )}
    </div>
  )
}

type GroupProjectAssignFieldsProps = {
  selectedGroup: LinkedEntity | null
  selectedProject: LinkedEntity | null
  groupSearchTerm: string
  projectSearchTerm: string
  onGroupSearchTermChange: (value: string) => void
  onProjectSearchTermChange: (value: string) => void
  groupResults: Group[]
  projectResults: Project[]
  groupLoading: boolean
  projectLoading: boolean
  groupError: string | null
  projectError: string | null
  onSelectGroup: (group: Group) => void
  onSelectProject: (project: Project) => void
  onClearGroup: () => void
  onClearProject: () => void
  disabled?: boolean
}

export const GroupProjectAssignFields = ({
  selectedGroup,
  selectedProject,
  groupSearchTerm,
  projectSearchTerm,
  onGroupSearchTermChange,
  onProjectSearchTermChange,
  groupResults,
  projectResults,
  groupLoading,
  projectLoading,
  groupError,
  projectError,
  onSelectGroup,
  onSelectProject,
  onClearGroup,
  onClearProject,
  disabled = false,
}: GroupProjectAssignFieldsProps) => {
  return (
    <div className="form-section group-project-fields">
      <h3>Grupo y proyecto (opcional)</h3>
      <div className="form-grid group-project-fields__grid">
        <EntitySearchField
          id="record-group-search"
          label="Grupo de investigación"
          placeholder="Buscar grupo por nombre..."
          selected={selectedGroup}
          searchTerm={groupSearchTerm}
          onSearchTermChange={onGroupSearchTermChange}
          results={groupResults}
          isLoading={groupLoading}
          error={groupError}
          disabled={disabled}
          getOptionId={(group) => group.id_group}
          getOptionLabel={(group) => group.name}
          getOptionHint={(group) => group.subjects || null}
          onSelect={onSelectGroup}
          onClear={onClearGroup}
        />
        <EntitySearchField
          id="record-project-search"
          label="Proyecto de investigación"
          placeholder="Buscar proyecto por nombre..."
          selected={selectedProject}
          searchTerm={projectSearchTerm}
          onSearchTermChange={onProjectSearchTermChange}
          results={projectResults}
          isLoading={projectLoading}
          error={projectError}
          disabled={disabled}
          getOptionId={(project) => project.id_project}
          getOptionLabel={(project) => project.title}
          getOptionHint={(project) => project.code || project.thematic || null}
          onSelect={onSelectProject}
          onClear={onClearProject}
        />
      </div>
    </div>
  )
}
