import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'
import App from './App'
import { HomePage } from './pages/HomePage'
import { UserPage } from './pages/UserPage'
import { SellPage } from './pages/SellPage'
import { InvitePage } from './pages/InvitePage'

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

const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite',
  component: InvitePage,
})

const routeTree = rootRoute.addChildren([indexRoute, userRoute, sellRoute, inviteRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
} 