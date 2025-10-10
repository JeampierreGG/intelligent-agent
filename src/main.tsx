import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider } from '@chakra-ui/react'
import App from './App.tsx'
import './index.css'
import logoLP from './assets/Logo LP.png'

// Ensure favicon and title are set at runtime
const ensureFaviconAndTitle = () => {
  // Set title
  if (document.title !== 'Learn Playing') {
    document.title = 'Learn Playing'
  }

  // Set favicon
  const head = document.head || document.getElementsByTagName('head')[0]
  let link: HTMLLinkElement | null = document.querySelector("link[rel='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    head.appendChild(link)
  }
  link.type = 'image/png'
  link.href = logoLP
}

ensureFaviconAndTitle()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </StrictMode>,
)
