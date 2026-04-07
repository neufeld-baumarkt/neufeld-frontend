import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(import.meta.env.VITE_API_URL + '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.token || !data.role) {
        setResult({ message: '❌ Login fehlgeschlagen – ungültige Zugangsdaten oder keine Rolle zugewiesen.' });
        return;
      }

      const userData = {
        name: data.name,
        role: data.role,
        filiale: data.filiale
      };

      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(userData));

      console.log('Login erfolgreich:', userData);

      navigate('/start');
    } catch (err) {
      console.error('Login-Fehler:', err);
      setResult({ message: '❌ Server nicht erreichbar oder ungültige Antwort' });
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#3A3838] overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: '57px' }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: '57px' }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow" style={{ height: '7px' }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: '7px' }}></div>
      <div className="absolute bg-white shadow" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-10 flex flex-col items-center justify-center px-4">
        <img src="/Logo_Sonderpreis-Baumarkt.jpg" alt="Sonderpreis Baumarkt" className="w-32 mb-8 shadow-xl rounded" />

        <form onSubmit={handleLogin} className="bg-white/80 backdrop-blur p-6 rounded shadow-xl w-full max-w-sm space-y-4 text-black">
          <h2 className="text-xl font-semibold text-center text-[#800000]">Login Neufeld Baumarkt GmbH 3.0</h2>

          <div>
            <label className="block text-sm font-medium">Benutzername</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Passwort</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-11 border border-gray-300 rounded"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-10 text-gray-500 hover:text-[#800000] transition"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10.58 10.58a2 2 0 102.83 2.83"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.88 5.09A10.94 10.94 0 0112 4.91c5.05 0 9.27 3.11 10.5 7.09a11.77 11.77 0 01-4.04 5.61"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.61 6.61A11.8 11.8 0 001.5 12c.68 2.2 2.25 4.13 4.36 5.51A10.9 10.9 0 0012 19.09c1.77 0 3.45-.39 4.95-1.08"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M1.5 12S5.5 4.91 12 4.91 22.5 12 22.5 12 18.5 19.09 12 19.09 1.5 12 1.5 12z"
                    />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {result && (
            <div className="text-center text-sm text-red-600 font-semibold">
              {result.message}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#800000] text-white py-2 rounded hover:bg-[#a00000] transition"
          >
            Anmelden
          </button>
        </form>
      </div>
    </div>
  );
}