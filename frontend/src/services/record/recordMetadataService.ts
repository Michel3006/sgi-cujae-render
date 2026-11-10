import { apiClient } from '../api/client'

export interface NamedOption {
  id: number
  name: string
}

export interface CountryOption extends NamedOption {
  capital?: string | null
  code?: string | null
  id_country: number
}

export interface IntegrantOption {
  id_integrant: number
  name: string
  email: string | null
  work_center: string | null
}

export interface FacultyOption {
  id_faculty: number
  name: string
  fullname: string | null
}

export interface FacultyAreaOption {
  id_faculty_area: number
  id_faculty: number
  name: string
}

export interface ProjectTypeOption {
  id_project_type: number
  name: string
}

export interface ProjectStateOption {
  id_project_state: number
  name: string
}

export interface ProjectClassificationOption {
  id_project_classification: number
  name: string | null
  code: string
}

const mapNamedOption = (item: Record<string, any>, idKey: string): NamedOption => ({
  id: item[idKey],
  name: item.name,
})

export const recordMetadataService = {
  async getCountries(): Promise<CountryOption[]> {
    const response = await apiClient.get('/countries/')
    const countries = response.data ?? []
    return countries.map((country: CountryOption) => ({
      id: country.id_country,
      id_country: country.id_country,
      name: country.name,
      capital: country.capital ?? null,
      code: country.code ?? null,
    }))
  },

  async getPrizeTypes(): Promise<NamedOption[]> {
    const response = await apiClient.get('/prize-types/')
    return (response.data ?? []).map((item: any) => mapNamedOption(item, 'id_prize_type'))
  },

  async getThesisTypes(): Promise<NamedOption[]> {
    const response = await apiClient.get('/thesis-types/')
    return (response.data ?? []).map((item: any) => mapNamedOption(item, 'id_thesis_type'))
  },

  async getArticleTypes(): Promise<NamedOption[]> {
    const response = await apiClient.get('/article-types/')
    return (response.data ?? []).map((item: any) => mapNamedOption(item, 'id_article_type'))
  },

  async getNormTypes(): Promise<NamedOption[]> {
    const response = await apiClient.get('/norm-types/')
    return (response.data ?? []).map((item: any) => mapNamedOption(item, 'id_norm_type'))
  },

  async getEncounterTypes(): Promise<NamedOption[]> {
    const response = await apiClient.get('/encounter-types/')
    return (response.data ?? []).map((item: any) => mapNamedOption(item, 'id_encounter_type'))
  },

  async getIntegrants(search?: string): Promise<IntegrantOption[]> {
    const response = await apiClient.get('/integrants/', {
      params: search ? { search } : undefined,
    })
    const integrants = response.data ?? []
    return integrants.map((integrant: any) => ({
      id_integrant: integrant.id_integrant,
      name: integrant.name,
      email: integrant.email ?? null,
      work_center: integrant.work_center ?? null,
    }))
  },

  async getFaculties(): Promise<FacultyOption[]> {
    const response = await apiClient.get('/faculty/')
    const faculties = response.data ?? []
    return faculties.map((faculty: any) => ({
      id_faculty: faculty.id_faculty,
      name: faculty.name,
      fullname: faculty.fullname ?? null,
    }))
  },

  async getFacultyAreas(): Promise<FacultyAreaOption[]> {
    const response = await apiClient.get('/faculty-areas/')
    const areas = response.data ?? []
    return areas.map((area: any) => ({
      id_faculty_area: area.id_faculty_area,
      id_faculty: area.id_faculty,
      name: area.name,
    }))
  },

  async getProjectTypes(): Promise<ProjectTypeOption[]> {
    const response = await apiClient.get('/project-types/')
    const types = response.data ?? []
    return types.map((type: any) => ({
      id_project_type: type.id_project_type,
      name: type.name,
    }))
  },

  async getProjectStates(): Promise<ProjectStateOption[]> {
    const response = await apiClient.get('/project-states/')
    const states = response.data ?? []
    return states.map((state: any) => ({
      id_project_state: state.id_project_state,
      name: state.name,
    }))
  },

  async getProjectClassifications(): Promise<ProjectClassificationOption[]> {
    const response = await apiClient.get('/project-classifications/')
    const classifications = response.data ?? []
    return classifications.map((classification: any) => ({
      id_project_classification: classification.id_project_classification,
      name: classification.name,
      code: classification.code,
    }))
  },
}

