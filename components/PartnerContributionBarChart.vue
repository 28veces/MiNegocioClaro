<script setup lang="ts">
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import { formatCurrency } from '~/composables/useBusinessSummary'
import type { BusinessPartnerContributionSummary } from '~/composables/useBusinessSummary'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const props = defineProps<{
  items: BusinessPartnerContributionSummary[]
  currency: string
}>()

const PARTNER_PALETTE: [number, number, number][] = [
  [99, 102, 241],   // indigo
  [16, 185, 129],   // emerald
  [245, 158, 11],   // amber
  [236, 72, 153],   // pink
  [59, 130, 246],   // blue
  [168, 85, 247],   // purple
  [20, 184, 166],   // teal
  [249, 115, 22],   // orange
]

const partnerColor = (index: number, alpha: number) => {
  const [r, g, b] = PARTNER_PALETTE[index % PARTNER_PALETTE.length]
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const chartData = computed(() => {
  return {
    labels: props.items.map((item) => item.label),
    datasets: [
      {
        label: 'Gastos',
        data: props.items.map((item) => item.expense),
        backgroundColor: props.items.map((item, index) => {
          return item.isUnassigned ? 'rgba(251, 113, 133, 0.85)' : partnerColor(index, 0.85)
        }),
        borderRadius: 12,
        borderSkipped: false
      },
      {
        label: 'Inversiones',
        data: props.items.map((item) => item.investment),
        backgroundColor: props.items.map((item, index) => {
          return item.isUnassigned ? 'rgba(244, 114, 182, 0.75)' : partnerColor(index, 0.5)
        }),
        borderRadius: 12,
        borderSkipped: false
      }
    ]
  }
})

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: 'rgba(231, 229, 228, 0.82)'
      }
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          return `${context.dataset.label}: ${formatCurrency(Number(context.parsed.y ?? 0), props.currency)}`
        }
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color: 'rgba(231, 229, 228, 0.82)'
      },
      grid: {
        display: false
      }
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: 'rgba(214, 211, 209, 0.72)',
        callback: (value) => formatCurrency(Number(value), props.currency)
      },
      grid: {
        color: 'rgba(255, 255, 255, 0.08)'
      }
    }
  }
}
</script>

<template>
  <div class="h-80 w-full">
    <ClientOnly>
      <Bar :data="chartData" :options="chartOptions" />
    </ClientOnly>
  </div>
</template>