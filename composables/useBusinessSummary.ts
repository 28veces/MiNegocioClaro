import type { BusinessSummary, FinancialEntry, Partner, Person, PortfolioSummary } from '~/types/domain'
import { entryTypeSupportsAssignment, getPersonFullName } from '~/types/domain'

export interface BusinessPartnerContributionSummary {
  key: string
  label: string
  expense: number
  investment: number
  total: number
  isUnassigned?: boolean
}

const currencyFormatter = (currency: string) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  })
}

export const buildBusinessSummary = (businessId: string, entries: FinancialEntry[]): BusinessSummary => {
  let totalInvested = 0
  let totalExpenses = 0
  let totalSales = 0
  let totalAssets = 0
  let latestEntryAt: string | null = null

  for (const entry of entries) {
    if (entry.type === 'investment') {
      totalInvested += entry.amount
    }

    if (entry.type === 'expense') {
      totalExpenses += entry.amount
    }

    if (entry.type === 'sale') {
      totalSales += entry.amount
    }

    if (entry.type === 'asset') {
      totalAssets += entry.amount
      totalInvested += entry.amount
    }

    if (!latestEntryAt || entry.date > latestEntryAt) {
      latestEntryAt = entry.date
    }
  }

  const netProfit = totalSales - totalExpenses - totalAssets
  const roi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : null

  return {
    businessId,
    totalInvested,
    totalExpenses,
    totalSales,
    totalAssets,
    netProfit,
    roi,
    latestEntryAt
  }
}

export const buildPortfolioSummary = (
  entriesByBusiness: Record<string, FinancialEntry[]>
): PortfolioSummary => {
  const summaries = Object.entries(entriesByBusiness).map(([businessId, entries]) => {
    return buildBusinessSummary(businessId, entries)
  })

  return summaries.reduce<PortfolioSummary>(
    (accumulator, summary) => {
      accumulator.businessCount += 1
      accumulator.profitableBusinesses += summary.netProfit > 0 ? 1 : 0
      accumulator.totalInvested += summary.totalInvested
      accumulator.totalExpenses += summary.totalExpenses
      accumulator.totalSales += summary.totalSales
      accumulator.totalAssets += summary.totalAssets
      accumulator.netProfit += summary.netProfit
      return accumulator
    },
    {
      businessCount: 0,
      profitableBusinesses: 0,
      totalInvested: 0,
      totalExpenses: 0,
      totalSales: 0,
      totalAssets: 0,
      netProfit: 0
    }
  )
}

export const buildBusinessPartnerContributionSummary = (
  entries: FinancialEntry[],
  partners: Partner[],
  peopleById: Record<string, Person>
) => {
  const order: string[] = []
  const buckets = new Map<string, BusinessPartnerContributionSummary>()

  const ensureBucket = (key: string, label: string, isUnassigned = false) => {
    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        label,
        expense: 0,
        investment: 0,
        total: 0,
        isUnassigned
      })
      order.push(key)
    }

    return buckets.get(key) as BusinessPartnerContributionSummary
  }

  for (const partner of partners) {
    const person = peopleById[partner.personId]
    ensureBucket(partner.personId, person ? getPersonFullName(person) : 'Persona no disponible')
  }

  for (const entry of entries) {
    if (!entryTypeSupportsAssignment(entry.type)) {
      continue
    }

    if (!entry.assignments?.length) {
      const bucket = ensureBucket('unassigned', 'Sin asignación', true)

      if (entry.type === 'expense') {
        bucket.expense += entry.amount
      }

      if (entry.type === 'investment') {
        bucket.investment += entry.amount
      }

      bucket.total = bucket.expense + bucket.investment
      continue
    }

    for (const assignment of entry.assignments) {
      const person = peopleById[assignment.personId]
      const bucket = ensureBucket(
        assignment.personId,
        person ? getPersonFullName(person) : 'Persona no disponible'
      )

      if (entry.type === 'expense') {
        bucket.expense += assignment.amount
      }

      if (entry.type === 'investment') {
        bucket.investment += assignment.amount
      }

      bucket.total = bucket.expense + bucket.investment
    }
  }

  return order.map((key) => {
    const bucket = buckets.get(key) as BusinessPartnerContributionSummary

    return {
      ...bucket,
      expense: Number(bucket.expense.toFixed(2)),
      investment: Number(bucket.investment.toFixed(2)),
      total: Number(bucket.total.toFixed(2))
    }
  })
}

export const formatCurrency = (value: number, currency = 'COP') => {
  return currencyFormatter(currency).format(value)
}

export const formatPercent = (value: number | null) => {
  if (value === null) {
    return 'Sin base'
  }

  const signal = value > 0 ? '+' : ''
  return `${signal}${value.toFixed(1)}%`
}

export const formatEntryDate = (value: string | null) => {
  if (!value) {
    return 'Sin movimientos'
  }

  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(value))
}