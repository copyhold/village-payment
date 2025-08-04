import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import App from './App'
import { HomePage } from './pages/HomePage'
import { UserPage } from './pages/UserPage'
import { SellPage } from './pages/SellPage'

const rootRoute = createRootRoute({
  component: App,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

const userRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/user',
  component: UserPage,
})

const sellRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sell',
  component: SellPage,
})

const routeTree = rootRoute.addChildren([indexRoute, userRoute, sellRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
} 