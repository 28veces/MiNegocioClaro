export default defineNuxtPlugin((nuxtApp) => {
  // Handle uncaught errors, especially from Chrome extensions
  if (process.client) {
    // Global error handler for extension-related message errors
    const originalError = console.error
    console.error = (...args: any[]) => {
      const message = args[0]?.message || args[0]?.toString() || ''
      
      // Suppress Chrome extension message channel errors that don't affect functionality
      if (message.includes('listener indicated an asynchronous response') || 
          message.includes('A listener indicated an asynchronous response')) {
        // Silently ignore these extension errors
        return
      }
      
      // Log all other errors normally
      originalError.apply(console, args)
    }

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason?.message || event.reason?.toString() || ''
      if (reason.includes('listener indicated an asynchronous response')) {
        event.preventDefault()
      }
    })

    // Handle error events
    window.addEventListener(
      'error',
      (event) => {
        if (event.message?.includes('listener indicated an asynchronous response')) {
          event.preventDefault()
        }
      },
      true
    )
  }
})
