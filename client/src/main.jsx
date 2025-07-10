import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient, prefetchProducts } from './lib/queryClient'
import './index.css'
import App from './App.jsx'

// Remove console logs in production builds only
// This is a runtime fallback in case build-time removal doesn't work
if (import.meta.env.PROD) {
  console.log = () => {}
  console.warn = () => {}
  console.info = () => {}
  console.debug = () => {}
  // Keep console.error for critical debugging in production
}

// Trigger prefetch as soon as possible
prefetchProducts().catch(console.error)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
