export type CicloEstado = 'Abierto' | 'Cerrado';

export type IngresoTipo = 'Salario' | 'Prima' | 'Vacaciones' | 'Bonificacion' | 'Extraordinario' | 'Otro';
export type IngresoEstado = 'Esperado' | 'Confirmado' | 'Recibido' | 'Cancelado';

export type Prioridad = 'A' | 'B' | 'C' | 'D';

export type ObligacionTipo =
  | 'Arriendo'
  | 'ServicioPublico'
  | 'TarjetaCredito'
  | 'CreditoVehiculo'
  | 'PrestamoPersona'
  | 'Mascotas'
  | 'Alimentacion'
  | 'Otro';

export type GastoCategoria =
  | 'Mercado'
  | 'Gasolina'
  | 'Restaurante'
  | 'Cafe'
  | 'Efectivo'
  | 'Mascotas'
  | 'Transporte'
  | 'Salud'
  | 'Otro';

export type CompromisoEstado = 'Pendiente' | 'Parcial' | 'Pagado';
export type Vigencia = 'Pagado' | 'Vencido' | 'Corriente';

export type PagoFuente = 'Compromiso' | 'Deuda';

export type EstadoFinanciero = 'VERDE' | 'AMARILLO' | 'ROJO';
export type EstadoNF = 'SIN_NECESIDAD' | 'CUBIERTA_FONDO' | 'REQUIERE_CREDITO';
export type ModoCiclo = 'PLANIFICACION' | 'EJECUCION';

export const PRIORIDAD_LABELS: Record<Prioridad, string> = {
  A: 'Esencial',
  B: 'Financiero',
  C: 'Importante',
  D: 'Flexible',
};

export const PRIORIDAD_DESCRIPCIONES: Record<Prioridad, string> = {
  A: 'Si no pagas esto tendrás problemas inmediatos.',
  B: 'Impacta historial financiero o genera intereses.',
  C: 'Importante para calidad de vida.',
  D: 'Puede reducirse o aplazarse.',
};

export const PRIORIDAD_EJEMPLOS: Record<Prioridad, string> = {
  A: 'Arriendo, servicios, internet',
  B: 'Tarjetas, créditos, préstamos',
  C: 'Mascotas, salud, transporte',
  D: 'Compras, entretenimiento, restaurantes',
};

export const OBLIGACION_TIPOS: ObligacionTipo[] = [
  'Arriendo', 'ServicioPublico', 'TarjetaCredito', 'CreditoVehiculo',
  'PrestamoPersona', 'Mascotas', 'Alimentacion', 'Otro',
];

export const INGRESO_TIPOS: IngresoTipo[] = [
  'Salario', 'Prima', 'Vacaciones', 'Bonificacion', 'Extraordinario', 'Otro',
];

export const INGRESO_ESTADOS: IngresoEstado[] = ['Esperado', 'Confirmado', 'Recibido', 'Cancelado'];

export const GASTO_CATEGORIAS: GastoCategoria[] = [
  'Mercado', 'Gasolina', 'Restaurante', 'Cafe', 'Efectivo', 'Mascotas',
  'Transporte', 'Salud', 'Otro',
];
