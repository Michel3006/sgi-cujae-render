import type React from 'react'
import { Input } from './Input'
import {
  findCountryContext,
  getIdentityFormatHint,
  validateIdentityByCountry,
  type IdentityCountryContext,
} from '../../utils/identityValidation'

export type IdentityCountryOption = {
  id_country?: number
  id?: number
  name: string
  code?: string | null
}

export type IdentityDocumentFieldProps = {
  countries: IdentityCountryOption[]
  countryId: number | null
  onCountryIdChange: (countryId: number | null) => void
  identity: string
  onIdentityChange: (identity: string) => void
  onClearErrors?: () => void
  countryError?: string | null
  identityError?: string | null
  required?: boolean
  disabled?: boolean
  countryLabel?: string
  identityLabel?: string
}

export const validateIdentityField = (
  identity: string,
  countryId: number | null,
  countries: IdentityCountryOption[],
): { countryError: string | null; identityError: string | null } => {
  if (countryId == null) {
    return {
      countryError: 'Debe seleccionar la nacionalidad',
      identityError: null,
    }
  }
  const ctx = findCountryContext(countryId, countries)
  const identityError = validateIdentityByCountry(identity, ctx)
  return { countryError: null, identityError }
}

export const IdentityDocumentField: React.FC<IdentityDocumentFieldProps> = ({
  countries,
  countryId,
  onCountryIdChange,
  identity,
  onIdentityChange,
  onClearErrors,
  countryError,
  identityError,
  required = true,
  disabled = false,
  countryLabel = 'Nacionalidad',
  identityLabel = 'Documento de identidad',
}) => {
  const ctx: IdentityCountryContext = findCountryContext(countryId, countries)
  const hint = countryId != null ? getIdentityFormatHint(ctx) : 'Seleccione primero la nacionalidad'

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onClearErrors?.()
    const value = e.target.value
    onCountryIdChange(value ? parseInt(value, 10) : null)
  }

  const handleIdentityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onClearErrors?.()
    onIdentityChange(e.target.value)
  }

  return (
    <div className="identity-document-field">
      <div className="form-group">
        <label htmlFor="identity-country-select">
          {countryLabel}
          {required ? ' *' : ''}
        </label>
        <select
          id="identity-country-select"
          className={`input ${countryError ? 'input-error' : ''}`}
          value={countryId ?? ''}
          onChange={handleCountryChange}
          disabled={disabled}
          aria-invalid={Boolean(countryError)}
          aria-describedby={countryError ? 'identity-country-error' : undefined}
        >
          <option value="">Seleccione un país</option>
          {countries.map((country) => {
            const id = country.id_country ?? country.id
            return (
              <option key={id} value={id}>
                {country.name}
              </option>
            )
          })}
        </select>
        {countryError && (
          <span id="identity-country-error" className="input-error-text" role="alert">
            {countryError}
          </span>
        )}
      </div>
      <div className="form-group">
        <Input
          label={`${identityLabel}${required ? ' *' : ''}`}
          value={identity}
          onChange={handleIdentityChange}
          placeholder={hint}
          disabled={disabled || countryId == null}
          error={identityError ?? undefined}
          helperText={!identityError ? hint : undefined}
          autoComplete="off"
          aria-describedby="identity-format-hint"
        />
      </div>
    </div>
  )
}
