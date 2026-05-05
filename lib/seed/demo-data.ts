import type { AppUser, Business, FinancialEntry, Partner, Person } from '~/types/domain'

export interface DemoUserSeed extends AppUser {
  password: string
}

export const demoUsers: DemoUserSeed[] = [
  {
    id: 'user-admin-01',
    name: 'Ana Teresa',
    email: 'admin@teamveces.local',
    role: 'admin',
    password: 'demo123'
  },
  {
    id: 'user-view-01',
    name: 'Mateo Rivas',
    email: 'viewer@teamveces.local',
    role: 'user',
    password: 'demo123'
  },
  {
    id: 'user-partner-01',
    name: 'Luisa Campos',
    email: 'partner@teamveces.local',
    role: 'partner',
    password: 'demo123'
  }
]

export const demoBusinesses: Business[] = [
  {
    id: 'biz-cacao-01',
    name: 'Finca El Bosque',
    kind: 'Cultivo de cacao',
    location: 'Arauca',
    description: 'Unidad productiva con foco en cacao tecnificado y compras de equipamiento de riego.',
    currency: 'COP',
    createdAt: '2026-01-10T09:00:00.000Z'
  },
  {
    id: 'biz-cafe-01',
    name: 'Café Altura',
    kind: 'Beneficio de café',
    location: 'Huila',
    description: 'Negocio de recolección, beneficio y venta de café pergamino con trazabilidad de gastos.',
    currency: 'COP',
    createdAt: '2026-02-02T11:30:00.000Z'
  }
]

export const demoPersons: Person[] = [
  {
    id: 'person-admin-01',
    firstName: 'Ana',
    lastName: 'Teresa',
    documentNumber: '100100001',
    email: 'admin@teamveces.local',
    linkedUserId: 'user-admin-01',
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-01-05T08:00:00.000Z'
  },
  {
    id: 'person-view-01',
    firstName: 'Mateo',
    lastName: 'Rivas',
    documentNumber: '100100002',
    email: 'viewer@teamveces.local',
    linkedUserId: 'user-view-01',
    createdAt: '2026-01-05T08:05:00.000Z',
    updatedAt: '2026-01-05T08:05:00.000Z'
  },
  {
    id: 'person-partner-01',
    firstName: 'Luisa',
    lastName: 'Campos',
    documentNumber: '100100003',
    email: 'partner@teamveces.local',
    linkedUserId: 'user-partner-01',
    createdAt: '2026-01-05T08:10:00.000Z',
    updatedAt: '2026-01-05T08:10:00.000Z'
  },
  {
    id: 'person-02',
    firstName: 'Diego',
    lastName: 'López',
    documentNumber: '100100004',
    createdAt: '2026-01-06T08:10:00.000Z',
    updatedAt: '2026-01-06T08:10:00.000Z'
  },
  {
    id: 'person-03',
    firstName: 'Karen',
    lastName: 'Téllez',
    documentNumber: '100100005',
    createdAt: '2026-01-06T08:15:00.000Z',
    updatedAt: '2026-01-06T08:15:00.000Z'
  },
  {
    id: 'person-04',
    firstName: 'Santiago',
    lastName: 'Rojas',
    documentNumber: '100100006',
    createdAt: '2026-01-06T08:20:00.000Z',
    updatedAt: '2026-01-06T08:20:00.000Z'
  },
  {
    id: 'person-05',
    firstName: 'Diana',
    lastName: 'Muñoz',
    documentNumber: '100100007',
    createdAt: '2026-01-06T08:25:00.000Z',
    updatedAt: '2026-01-06T08:25:00.000Z'
  }
]

export const demoPartners: Partner[] = [
  {
    id: 'partner-01',
    businessId: 'biz-cacao-01',
    personId: 'person-partner-01',
    userId: 'user-partner-01',
    share: 45,
    contributionFocus: 'Coordinación operativa y compra de insumos',
    createdAt: '2026-01-10T09:10:00.000Z'
  },
  {
    id: 'partner-02',
    businessId: 'biz-cacao-01',
    personId: 'person-02',
    share: 35,
    contributionFocus: 'Capital de trabajo y maquinaria',
    createdAt: '2026-01-10T09:11:00.000Z'
  },
  {
    id: 'partner-03',
    businessId: 'biz-cacao-01',
    personId: 'person-03',
    share: 20,
    contributionFocus: 'Comercialización local',
    createdAt: '2026-01-10T09:12:00.000Z'
  },
  {
    id: 'partner-04',
    businessId: 'biz-cafe-01',
    personId: 'person-04',
    share: 60,
    contributionFocus: 'Producción y compra de materia prima',
    createdAt: '2026-02-02T11:40:00.000Z'
  },
  {
    id: 'partner-05',
    businessId: 'biz-cafe-01',
    personId: 'person-05',
    share: 40,
    contributionFocus: 'Logística y red comercial',
    createdAt: '2026-02-02T11:42:00.000Z'
  }
]

export const demoEntries: FinancialEntry[] = [
  {
    id: 'entry-01',
    businessId: 'biz-cacao-01',
    type: 'investment',
    category: 'Capital inicial',
    amount: 18000000,
    note: 'Aporte inicial de socios para adecuación del lote.',
    date: '2026-01-12',
    recordedBy: 'Ana Teresa',
    createdAt: '2026-01-12T10:00:00.000Z'
  },
  {
    id: 'entry-02',
    businessId: 'biz-cacao-01',
    type: 'expense',
    category: 'Nómina temporal',
    amount: 950000,
    note: 'Pago de jornales para limpieza y siembra.',
    date: '2026-01-18',
    recordedBy: 'Luisa Campos',
    createdAt: '2026-01-18T12:10:00.000Z'
  },
  {
    id: 'entry-03',
    businessId: 'biz-cacao-01',
    type: 'expense',
    category: 'Fertilizantes',
    amount: 1200000,
    note: 'Compra de insumos para mantenimiento de cultivo.',
    date: '2026-01-25',
    recordedBy: 'Luisa Campos',
    createdAt: '2026-01-25T08:20:00.000Z'
  },
  {
    id: 'entry-04',
    businessId: 'biz-cacao-01',
    type: 'asset',
    category: 'Sistema de riego',
    amount: 3400000,
    note: 'Adquisición de bomba y mangueras.',
    date: '2026-02-03',
    recordedBy: 'Ana Teresa',
    createdAt: '2026-02-03T15:00:00.000Z'
  },
  {
    id: 'entry-05',
    businessId: 'biz-cacao-01',
    type: 'sale',
    category: 'Venta de grano seco',
    amount: 8200000,
    note: 'Primera salida de cacao seco a comprador local.',
    date: '2026-03-18',
    recordedBy: 'Luisa Campos',
    createdAt: '2026-03-18T14:00:00.000Z'
  },
  {
    id: 'entry-06',
    businessId: 'biz-cacao-01',
    type: 'sale',
    category: 'Venta de cacao premium',
    amount: 6900000,
    note: 'Lote vendido a comprador especializado.',
    date: '2026-04-05',
    recordedBy: 'Luisa Campos',
    createdAt: '2026-04-05T17:00:00.000Z'
  },
  {
    id: 'entry-07',
    businessId: 'biz-cafe-01',
    type: 'investment',
    category: 'Capital operativo',
    amount: 9500000,
    note: 'Inyección de capital para compra de café pergamino.',
    date: '2026-02-05',
    recordedBy: 'Ana Teresa',
    createdAt: '2026-02-05T09:30:00.000Z'
  },
  {
    id: 'entry-08',
    businessId: 'biz-cafe-01',
    type: 'expense',
    category: 'Fertilizantes',
    amount: 600000,
    note: 'Apoyo a proveedores aliados para lote priorizado.',
    date: '2026-02-11',
    recordedBy: 'Mateo Rivas',
    createdAt: '2026-02-11T11:10:00.000Z'
  },
  {
    id: 'entry-09',
    businessId: 'biz-cafe-01',
    type: 'sale',
    category: 'Venta de café pergamino',
    amount: 4100000,
    note: 'Primera comercialización de lote lavado.',
    date: '2026-03-01',
    recordedBy: 'Mateo Rivas',
    createdAt: '2026-03-01T13:50:00.000Z'
  },
  {
    id: 'entry-10',
    businessId: 'biz-cafe-01',
    type: 'asset',
    category: 'Malla de secado',
    amount: 1500000,
    note: 'Compra de infraestructura ligera para poscosecha.',
    date: '2026-03-10',
    recordedBy: 'Ana Teresa',
    createdAt: '2026-03-10T16:00:00.000Z'
  },
  {
    id: 'entry-11',
    businessId: 'biz-cafe-01',
    type: 'expense',
    category: 'Transporte',
    amount: 430000,
    note: 'Envío del lote a centro de acopio.',
    date: '2026-03-20',
    recordedBy: 'Mateo Rivas',
    createdAt: '2026-03-20T08:45:00.000Z'
  },
  {
    id: 'entry-12',
    businessId: 'biz-cafe-01',
    type: 'sale',
    category: 'Venta a tostador',
    amount: 5600000,
    note: 'Negociación final con tostador regional.',
    date: '2026-04-14',
    recordedBy: 'Mateo Rivas',
    createdAt: '2026-04-14T17:10:00.000Z'
  }
]