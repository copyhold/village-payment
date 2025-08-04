import { useAuth } from '../auth-context';

export function ProtectedComponent() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="p-4 border rounded-md shadow-sm bg-red-50">
        <h3 className="text-lg font-semibold text-red-800">Access Denied</h3>
        <p className="text-red-600">You must be logged in to view this content.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md shadow-sm bg-green-50">
      <h3 className="text-lg font-semibold text-green-800">Protected Content</h3>
      <p className="text-green-600 mb-4">
        Welcome, {user.username}! This content is only visible to authenticated users.
      </p>
      <div className="bg-white p-3 rounded border">
        <h4 className="font-medium text-gray-800 mb-2">User Information:</h4>
        <p className="text-sm text-gray-600">ID: {user.id}</p>
        <p className="text-sm text-gray-600">Username: {user.username}</p>
      </div>
      <button
        onClick={logout}
        className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
      >
        Logout
      </button>
    </div>
  );
} 