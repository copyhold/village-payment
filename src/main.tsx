import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './router'
import './index.css'

if (import.meta.env.DEV) {
  import('@tanstack/react-router-devtools').then(({ ReactRouterDevtools }) => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <RouterProvider router={router} />
        <ReactRouterDevtools router={router} />
      </React.StrictMode>,
    )
  })
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
}
