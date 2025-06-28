import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient, prefetchProducts } from './lib/queryClient'
import './index.css'
import App from './App.jsx'

// Hide console logs on production domain only
if (window.location.hostname === 'michaeldemesa.com') {
  console.log = () => {}
  console.warn = () => {}
  console.info = () => {}
  console.debug = () => {}
  // Keep console.error for critical debugging if needed
  // console.error = () => {}
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
