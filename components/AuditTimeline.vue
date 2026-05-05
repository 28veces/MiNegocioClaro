<script setup lang="ts">
import type { AuditAction, AuditEvent } from '~/types/domain'

const props = withDefaults(
  defineProps<{
    events: AuditEvent[]
    emptyLabel?: string
  }>(),
  {
    emptyLabel: 'Todavía no hay actividad registrada.'
  }
)

const actionLabels: Record<AuditAction, string> = {
  created: 'Alta',
  updated: 'Edición',
  deleted: 'Eliminación',
  archived: 'Archivado',
  reactivated: 'Reactivación'
}

const formatTimestamp = (value: string) => {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value))
}

const getActionBadgeClass = (action: AuditAction) => {
  if (action === 'deleted' || action === 'archived') {
    return 'bg-rose-400/15 text-rose-200'
  }

  if (action === 'created' || action === 'reactivated') {
    return 'bg-leaf-400/15 text-leaf-200'
  }

  return 'bg-maize-400/15 text-maize-200'
}
</script>

<template>
  <div v-if="props.events.length" class="space-y-3">
    <div
      v-for="event in props.events"
      :key="event.id"
      class="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="font-medium text-stone-100">{{ event.title }}</p>
          <p class="mt-2 text-sm leading-6 text-stone-300">{{ event.description }}</p>
        </div>

        <div class="flex flex-col items-start gap-2 sm:items-end">
          <span
            class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
            :class="getActionBadgeClass(event.action)"
          >
            {{ actionLabels[event.action] }}
          </span>
          <p class="text-xs uppercase tracking-[0.2em] text-stone-400">{{ formatTimestamp(event.createdAt) }}</p>
        </div>
      </div>

      <p class="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">{{ event.actorName }}</p>
    </div>
  </div>

  <div v-else class="rounded-3xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-stone-400">
    {{ props.emptyLabel }}
  </div>
</template>