# JWT Authentication Setup

This project now includes JWT (JSON Web Token) authentication using Hono's JWT helper. The JWT tokens are automatically stored as HTTP-only cookies for security.

## Features

- **Automatic JWT Generation**: When a user successfully logs in with WebAuthn, a JWT token is automatically generated and set as an HTTP-only cookie
- **Secure Cookie Storage**: JWT tokens are stored as HTTP-only, Secure, SameSite cookies
- **Automatic Token Verification**: All subsequent requests automatically include the JWT token
- **Protected Routes**: Use the `jwtMiddleware` to protect API endpoints
- **Logout Functionality**: Properly invalidates JWT tokens

## Environment Variables

Add the following to your `wrangler.toml`:

```toml
[vars]
JWT_SECRET = "your-super-secret-jwt-key-change-this-in-production"
```

**Important**: Change the JWT_SECRET to a strong, random string in production!

## API Endpoints

### Authentication Endpoints
- `POST /api/login/start` - Start WebAuthn authentication
- `POST /api/login/finish` - Complete WebAuthn authentication (returns JWT cookie)
- `POST /api/logout` - Logout and clear JWT cookie

### Protected Endpoints
- `GET /api/me` - Get current user information (requires JWT)

## Using JWT Middleware

To protect an API endpoint, use the `jwtMiddleware`:

```typescript
app.get('/api/protected-route', jwtMiddleware, async (c) => {
  const user = c.get('user'); // Access the decoded JWT payload
  return c.json({ message: `Hello ${user.username}!` });
});
```

## Frontend Usage

The frontend automatically handles JWT authentication:

1. **Login**: After successful WebAuthn authentication, the JWT is automatically set as a cookie
2. **Authentication State**: Use the `useAuth()` hook to access user information
3. **Protected Components**: Use the `ProtectedComponent` as an example
4. **Logout**: Call the `logout()` function from the auth context

## Security Features

- **HTTP-only Cookies**: JWT tokens cannot be accessed by JavaScript (XSS protection)
- **Secure Flag**: Cookies only sent over HTTPS
- **SameSite=Strict**: CSRF protection
- **Automatic Expiration**: Tokens expire after 7 days
- **Token Verification**: All protected routes verify token signature and expiration

## Example Usage

```typescript
import { useAuth } from './auth-context';

function MyComponent() {
  const { user, loading, logout } = useAuth();

  if (loading) return <div>Loading...</div>;
  
  if (!user) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {user.username}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Production Considerations

1. **Change JWT_SECRET**: Use a strong, random secret key
2. **HTTPS Only**: Ensure your production environment uses HTTPS
3. **Token Expiration**: Consider shorter expiration times for sensitive applications
4. **Refresh Tokens**: For long-lived sessions, consider implementing refresh tokens
5. **Rate Limiting**: Add rate limiting to authentication endpoints 