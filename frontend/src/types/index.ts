// User and Authentication Types
export interface ICredentials {
  username: string
  password: string
}

export interface IAuthResponse {
  token: string
  user: IUser
}

export interface IUserRegistrationData {
  nombre: string
  apellidos: string
  numeroIdentidad: string
  correoElectronico: string
  nombreUsuario: string
  contrasena: string
  confirmarContrasena: string
}

export interface IPasswordChangeData {
  oldPassword: string
  newPassword: string
  confirmNewPassword: string
}

export interface IPasswordRecoveryData {
  nombreUsuario: string
}

export type UserRole =
  | "admin"
  | "integrant"
  | "consejo"
  | "responsable_proyecto"
  | "responsable_grupo"
  | "integrante_proyecto"
  | "integrante_grupo"
  | "consejo_cientifico"
  | "autor_registro"
  | "publicador"
  | "usuario"

export interface IUser {
  id: string
  nombre: string
  apellidos: string
  numeroIdentidad: string
  correoElectronico: string
  nombreUsuario: string
  roles: UserRole[]
  foto?: string
  categoriaDocente?: "asistente" | "titular" | "consultante" | "adiestrado" | "instructor"
  categoriaCientifica?: "master" | "doctor" | "ingeniero"
  clasificacionGeneral?: "profesor" | "estudiante"
  estadoSuperacion?: "doctorante" | "maestrante" | "otro"
  facultad?: string
  area?: string
  departamento?: string
  esExterno: boolean
  esAdministrador: boolean
  telefono?: string
  lugarTrabajo?: string
  fondoTiempo?: string
  pais?: string
  curriculum?: string
}

export interface IRole {
  id: string
  nombre: string
  descripcion: string
}

// Group Types
export interface IGroup {
  id: string
  nombre: string
  descripcion: string
  responsable: IUser | undefined // Made responsable optional to fix TypeScript error
  tematicas: string[]
  facultad: string
  area?: string
  departamento?: string
  fechaCreacion: string
  fechaActualizacion: string
  totalIntegrantes: number
}

export interface IGroupData {
  nombre: string
  descripcion: string
  responsableId: string
  tematicas: string[]
  facultad: string
  area?: string
  departamento?: string
}

export interface IGroupFilter {
  nombre?: string
  facultad?: string
  responsable?: string
  misGrupos?: boolean
}

export interface IGroupMember {
  id: string
  usuario: IUser
  rol: UserRole
  evaluacion?: "no_evaluado" | "mal" | "regular" | "bien" | "excelente"
  descripcionEvaluacion?: string
  cargo?: string
  dedicacion?: string
  fechaIngreso: string
}

export interface IGroupMemberEvaluation {
  miembroId: string
  evaluacion: "no_evaluado" | "mal" | "regular" | "bien" | "excelente"
  descripcion: string
}

export interface IDirectoryUser {
  id: string
  nombre: string
  apellidos: string
  numeroIdentidad: string
  correoElectronico: string
  facultad: string
  departamento?: string
}

// Project Types
export interface IProject {
  id: string
  nombre: string
  descripcion: string
  responsable: IUser | undefined  // Made responsable optional to fix TypeScript error
  tematica: string
  programa: string
  tipoProyecto?: string // New field for project type
  esPriorizado: boolean
  estaAprobado: boolean
  estado: "propuesta" | "activo" | "finalizado" | "cancelado"
  estadoNombre: string
  fechaInicio: string
  fechaFin?: string
  objetivos?: string
  tareas?: string
  detallesCientificos?: string
  otrosDatos?: string
  criterioConsejo?: string
}

export interface IProjectData {
  nombre: string
  descripcion: string
  responsableId: string
  tematica: string
  programa: string
  tipoProyecto?: string // New field for project type
  esPriorizado: boolean
  estado: "propuesta" | "activo" | "finalizado" | "cancelado"
  estadoNombre: string
  fechaInicio: string
  fechaFin?: string
  objetivos?: string
  tareas?: string
  detallesCientificos?: string
  otrosDatos?: string
}

export interface IProjectFilter {
  nombre?: string
  responsable?: string
  programa?: string
  estado?: string
  misProyectos?: boolean
}

export interface IProjectMember {
  id: string
  usuario: IUser
  tienePermisoAdministrativo: boolean
  fechaIngreso: string
}

export interface IResponsible {
  usuario: IUser
  fechaAsignacion: string
}

// Record Types
export type RecordType =
  | "articulo"
  | "libro"
  | "monografia"
  | "norma"
  | "patente"
  | "software"
  | "evento"
  | "premio"
  | "tesis"

export interface IRecord {
  id: string
  tipo: RecordType
  tipoRegistro?: string // Added tipoRegistro field for dropdown
  titulo: string
  descripcion: string
  autores: IAuthor[]
  año: number
  mes?: number
  fechaReporte: string
  resumen?: string
  palabrasClave?: string[]
  pais?: string
  archivoAdjunto?: string
  metadata?: Record<string, number | null>
}

export interface IArticle extends IRecord {
  tipo: "articulo"
  revista: string
  baseDatos?: string
  issn?: string
  volumen?: string
  numero?: string
  paginas?: string
  doi?: string
  memoriaEvento?: string
}

export interface IBook extends IRecord {
  tipo: "libro"
  editorial: string
  isbn?: string
  capitulo?: string
  tipoLibro?: string
  numeroVolumen?: string
  serie?: string
  organizacion?: string
  doi?: string
  esCapitulo: boolean
  paginas?: string
  tituloCapitulo?: string
}

export interface IMonografia extends IRecord {
  tipo: "monografia"
  editorial: string
  isbn?: string
  registroCENDA?: string
  doi?: string
  paginas?: string
}

export interface INorma extends IRecord {
  tipo: "norma"
  numeroRegistro: string
  paginas?: string
}

export interface IPatente extends IRecord {
  tipo: "patente"
  estado: "tramite" | "concedida" | "rechazada"
  numeroRegistro?: string
  numeroCertificado?: string
  idioma?: string
  fueConcedida: boolean
  institucion?: string
}

export interface ISoftware extends IRecord {
  tipo: "software"
  estado: "desarrollo" | "terminado" | "registrado"
  registroCENDA?: string
  proyectoRelacionadoId?: string
  fueConcedido: boolean
  esMultimedia: boolean
  institucion?: string
  idioma?: string
}

export interface IEvento extends IRecord {
  tipo: "evento"
  nombreEvento: string
  issn?: string
  organizador?: string
  tipoEvento?: string
}

export interface IPremio extends IRecord {
  tipo: "premio"
  tipoPremio: string
  institucionOtorgante: string
}

export interface ITesis extends IRecord {
  tipo: "tesis"
  tipoTesis: "licenciatura" | "maestria" | "doctorado"
  tesisPadreId?: string
  proyectoRelacionadoId?: string
  tipoEspecifico?: string
  tutores?: ITutor[]
}

export interface IRecordData {
  tipo: RecordType
  titulo: string
  descripcion: string
  año: number
  mes?: number
  resumen?: string
  palabrasClave?: string[]
  pais?: string
  [key: string]: any
}

export interface IRecordFilter {
  tipo?: RecordType
  titulo?: string
  autor?: string
  año?: number
  misRegistros?: boolean
}

export interface IAuthor {
  id: string
  usuario?: IUser
  nombre: string
  apellidos: string
  esExterno: boolean
  esPrincipal: boolean
  orden: number
}

export interface ITutor {
  id: string
  usuario?: IUser
  nombre: string
  apellidos: string
  esExterno: boolean
}

// Dashboard Types
export interface IDashboardSummary {
  misRegistros: number
  misProyectos: number
  misGrupos: number
  registrosPendientes: number
  proyectosActivos: number
  gruposActivos: number
}

export interface IStatisticData {
  label: string
  value: number
  percentage?: number
}

export interface IReportRequest {
  tipo: "produccion" | "proyectos" | "grupos"
  formato: "pdf" | "xlsx" | "rtf"
  filtros: Record<string, any>
}

// Audit Log Types for bitácora system
export interface IAuditLog {
  id: string
  usuario: IUser
  fecha: string
  hora: string
  tipoAccion: "crear" | "modificar" | "eliminar" | "consultar"
  origen: string
  metodo: "GET" | "POST" | "PUT" | "DELETE"
  ruta: string
  codigo: number
  mensaje: string
  detalles?: Record<string, any>
}

// Statistics Types for reports module
export interface IStatisticsTabular {
  grupos: {
    total: number
    porFacultad: Record<string, number>
    integrantesPorGrupo: Record<string, number>
  }
  registros: {
    total: number
    porTipo: Record<RecordType, number>
    porcentajeAportePorTipo: Record<RecordType, number>
  }
  proyectos: {
    total: number
    porFacultad: Record<string, number>
    integrantesPorProyecto: Record<string, number>
  }
}

export interface IStatisticsGraphical {
  gruposTotales: number
  gruposPorFacultad: IStatisticData[]
  gruposConMasResultados: IStatisticData[]
  gruposConMasArticulos: IStatisticData[]
  gruposConMasProyectos: IStatisticData[]
  gruposConMasEstudiantes: IStatisticData[]
  indicadoresRegistrosPorAño: Record<number, Record<RecordType, number>>
  indicadoresProyectosPorAño: Record<number, number>
}
