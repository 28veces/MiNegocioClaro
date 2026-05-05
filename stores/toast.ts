import { defineStore } from 'pinia'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  title: string
  message: string
  variant: ToastVariant
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as ToastItem[],
    pendingItems: [] as ToastItem[]
  }),
  actions: {
    push(variant: ToastVariant, title: string, message: string) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      this.items.unshift({ id, title, message, variant })

      if (process.client) {
        setTimeout(() => this.dismiss(id), 5000)
      }

      return id
    },

    queue(variant: ToastVariant, title: string, message: string) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      this.pendingItems.unshift({ id, title, message, variant })
      return id
    },

    success(title: string, message: string) {
      this.push('success', title, message)
    },

    error(title: string, message: string) {
      this.push('error', title, message)
    },

    warning(title: string, message: string) {
      this.push('warning', title, message)
    },

    info(title: string, message: string) {
      this.push('info', title, message)
    },

    successAfterNavigation(title: string, message: string) {
      this.queue('success', title, message)
    },

    errorAfterNavigation(title: string, message: string) {
      this.queue('error', title, message)
    },

    flushPending() {
      if (!this.pendingItems.length) {
        return
      }

      this.items.unshift(...this.pendingItems)
      this.pendingItems = []

      if (process.client) {
        this.items.forEach((toast) => {
          setTimeout(() => this.dismiss(toast.id), 5000)
        })
      }
    },

    dismiss(id: string) {
      this.items = this.items.filter((item) => item.id !== id)
      this.pendingItems = this.pendingItems.filter((item) => item.id !== id)
    }
  }
})