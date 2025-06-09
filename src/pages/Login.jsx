import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch(import.meta.env.VITE_API_URL + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });

    const data = await res.json();
    setResult(data);

    if (data.success) {
      localStorage.setItem("user", JSON.stringify(data));
      navigate("/start");
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#3A3838] overflow-hidden font-sans">
      {/* Hintergrundlayout wie Startseite */}
      <div className="absolute top-0 left-0 w-full bg-[#800000]" style={{ height: "57px" }}></div>
      <div className="absolute top-0 left-0 h-full bg-[#800000]" style={{ width: "57px" }}></div>
      <div className="absolute top-[57px] left-[57px] right-0 bg-white shadow" style={{ height: "7px" }}></div>
      <div className="absolute top-[57px] left-[57px] bottom-0 bg-white" style={{ width: "7px" }}></div>
      <div className="absolute bg-white shadow" style={{ height: '11px', top: '165px', left: '95px', right: '80px' }}></div>

      {/* Zensur-Layer mit Loginbox */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-sm z-10 flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <img src="/Logo_Sonderpreis-Baumarkt.jpg" alt="Sonderpreis Baumarkt" className="w-32 mb-8 shadow-xl rounded" />

        {/* Loginfeld */}
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>

          {result && (
            <div className="text-center text-sm">
              {result.success
                ? <div className="text-green-600">✅ Eingeloggt als <b>{result.name}</b> ({result.role})</div>
                : <div className="text-red-600">❌ {result.message}</div>}
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
