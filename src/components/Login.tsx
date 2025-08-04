import { useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';

export function Login() {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!username) {
      setMessage('Please enter a username.');
      return;
    }

    try {
      // 1. Get authentication options from the server
      const optionsRes = await fetch('/api/login/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      let options: PublicKeyCredentialRequestOptionsJSON & { error?: string; userId?: string };
      try {
        options = await optionsRes.json();
      } catch (err) {
        throw new Error('Ошибка разбора ответа сервера (login/start): сервер вернул невалидный JSON или пустой ответ.');
      }
      if (options.error) {
        throw new Error(options.error);
      }

      // Store the user ID for the finish step
      if (options.userId) {
        setUserId(options.userId);
      }

      // 2. Pass options to the browser to sign the challenge
      const assertion = await startAuthentication(options);

      // 3. Send the assertion response back to the server to verify
      if (!options.userId) {
        throw new Error('User ID not found. Please try again.');
      }

      const verificationRes = await fetch('/api/login/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: assertion,
          userId: options.userId
        }),
      });

      let verification: { verified: boolean; error?: string };
      try {
        verification = await verificationRes.json();
      } catch (err) {
        throw new Error('Ошибка разбора ответа сервера (login/finish): сервер вернул невалидный JSON или пустой ответ.');
      }
      if (verification.verified) {
        setMessage(`Welcome back, ${username}!`);
      } else {
        throw new Error(verification.error || 'Login failed.');
      }
    } catch (error) {
      setMessage((error as Error).message);
      console.error(error);
    }
  };

  return (
    <div className="p-4 border rounded-md shadow-sm">
      <h2 className="text-2xl font-bold mb-4">Login</h2>
      <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label htmlFor="login-username" className="block text-sm font-medium text-gray-700">Username</label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            autoComplete="username webauthn"
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Login with Passkey
        </button>
      </form>
      {message && <p className={`mt-4 text-sm ${message.includes('Welcome') ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
    </div>
  );
}
