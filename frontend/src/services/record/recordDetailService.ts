import { apiClient } from "../api/client"
import type { RecordType } from "../../types/record/types"
import {
  ArticuloRegistro,
  LibroRegistro,
  MonografiaRegistro,
  NormaRegistro,
  PatenteRegistro,
  SoftwareRegistro,
  TesisRegistro,
  EventoRegistro,
  PremioRegistro,
  type Registro,
} from "../../types/recordList/Registros"

type RecordEndpointConfig = {
  endpoint: string
  Class: new (data: any) => Registro
}

const recordEndpointMap: Record<RecordType, RecordEndpointConfig> = {
  articulo: {
    endpoint: "/articles/",
    Class: ArticuloRegistro,
  },
  libro: {
    endpoint: "/books/",
    Class: LibroRegistro,
  },
  monografia: {
    endpoint: "/monographs/",
    Class: MonografiaRegistro,
  },
  norma: {
    endpoint: "/norms/",
    Class: NormaRegistro,
  },
  patente: {
    endpoint: "/patents/",
    Class: PatenteRegistro,
  },
  software: {
    endpoint: "/softwares/",
    Class: SoftwareRegistro,
  },
  tesis: {
    endpoint: "/theses/",
    Class: TesisRegistro,
  },
  evento: {
    endpoint: "/encounters/",
    Class: EventoRegistro,
  },
  premio: {
    endpoint: "/prizes/",
    Class: PremioRegistro,
  },
}

export const recordDetailService = {
  async getRecord(recordType: RecordType, recordId: string | number): Promise<Registro> {
    const config = recordEndpointMap[recordType]
    if (!config) {
      throw new Error(`Tipo de registro no soportado: ${recordType}`)
    }

    const response = await apiClient.get(`${config.endpoint}${recordId}/`)
    return new config.Class(response.data)
  },
}

