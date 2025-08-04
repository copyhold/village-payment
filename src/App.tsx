import { Outlet } from '@tanstack/react-router'
import { AuthProvider } from './auth-context'
import { Navigation } from './components/Navigation'

function AppContent() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <main>
        <Outlet />
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export { App }
export default App
