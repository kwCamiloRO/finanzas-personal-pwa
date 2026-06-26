import {
  CicloEstado, IngresoTipo, IngresoEstado, Prioridad, ObligacionTipo,
  GastoCategoria, CompromisoEstado, PagoFuente,
} from './enums';

export interface ConfigRow {
  parametro: string;
  valor: string;
  descripcion?: string;
}

export interface Ciclo {
  id: string;
  fechaPago: Date;
  estado: CicloEstado;
  notas?: string;
  // v2 — todos opcionales, se infieren si faltan
  fechaInicio?: Date;
  fechaFin?: Date;
  cicloAnteriorId?: string;
  cicloSiguienteId?: string;
  creadoAutomaticamente?: boolean;
  generadoDesdeConfiguracion?: boolean;
}

export interface Ingreso {
  id: string;
  fecha: Date;
  tipo: IngresoTipo;
  valor: number;
  estado: IngresoEstado;
  cicloId: string;
  observaciones?: string;
}

export interface Obligacion {
  id: string;
  nombre: string;
  tipo: ObligacionTipo;
  prioridad: Prioridad;
  recurrente: boolean;
  activa: boolean;
  valorEsperadoTipico?: number;
  // v2 — finalización auditada
  fechaFin?: Date;
  motivoFinalizacion?: string;
  estadoFinalizacion?: 'Activa' | 'Pausada' | 'Finalizada';
  // v2 — distribución de obligaciones flexibles a lo largo de N ciclos
  cuotasTotales?: number;
  cuotasRestantes?: number;
}

export interface Compromiso {
  id: string;
  obligacionId: string;
  periodo: string;
  valorProyectado: number;
  valorReal: number;
  fechaVencimiento?: Date;
  estado?: CompromisoEstado;
  // v2 — estado rápido del checklist (independiente del cálculo de saldoPendiente)
  // Valores adicionales: 'Omitida' significa "no la voy a pagar este ciclo".
  estadoRapido?: 'Pendiente' | 'Pagada' | 'Parcial' | 'Omitida';
}

export interface Pago {
  id: string;
  fecha: Date;
  fuente: PagoFuente;
  compromisoId?: string;
  deudaId?: string;
  monto: number;
  comentario?: string;
}

export interface Gasto {
  id: string;
  fecha: Date;
  categoria: GastoCategoria;
  valor: number;
  comentario?: string;
  cicloId: string;
}

export interface Deuda {
  id: string;
  persona: string;
  valorOriginal: number;
  prioridad: Prioridad;
  observaciones?: string;
}
