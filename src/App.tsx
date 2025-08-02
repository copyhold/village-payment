import { Register } from './components/Register';
import { Login } from './components/Login';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
      <div className="container mx-auto p-4">
        <h1 className="text-4xl font-bold text-center mb-8">WebAuthn Passwordless Auth</h1>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Register />
          <Login />
        </div>
      </div>
    </div>
  );
}

export default App;
