import { Register } from './components/Register';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './auth-context';

function AppContent() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
        <div className="container mx-auto p-4">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-center mb-4">Welcome, {user.username}!</h1>
            <p className="text-center text-gray-600 mb-6">You are successfully authenticated with JWT.</p>
            <button
              onClick={logout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold text-center mb-8">WebAuthn Passwordless Auth</h1>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Register />
          <Login onLoginSuccess={(user) => {
            // The JWT is automatically set as a cookie by the server
            // We just need to update the local state
            window.location.reload();
          }} />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
