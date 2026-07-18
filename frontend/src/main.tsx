import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)

// Scroll-reveal for any element with data-reveal (see .at-fade-up etc in index.css).
// A single shared observer + a MutationObserver keeps it working across the SPA's
// client-side route changes without every page wiring up its own effect.
if (typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('at-revealed')
          revealObserver.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  )

  const observeNewReveals = () => {
    document.querySelectorAll('[data-reveal]:not(.at-revealed)').forEach((el) => revealObserver.observe(el))
  }

  observeNewReveals()
  new MutationObserver(observeNewReveals).observe(document.body, { childList: true, subtree: true })
}
