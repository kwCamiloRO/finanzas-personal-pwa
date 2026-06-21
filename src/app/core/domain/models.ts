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
}

export interface Compromiso {
  id: string;
  obligacionId: string;
  periodo: string;       // CicloID
  valorProyectado: number;
  valorReal: number;
  fechaVencimiento?: Date;
  estado?: CompromisoEstado; // opcional - se deriva
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
