import { useState } from 'react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic password complexity check (minimum 8 characters, at least one uppercase, one lowercase, one number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, and numbers');
      return;
    }

    // Real password validation would be handled by Supabase Auth
    // For this demo, we'll assume Supabase enforces complexity rules
    
    // Simulate login
    try {
      // In a real app, you'd call Supabase Auth here
      // For demo, we'll just show a success message
      alert('Login successful!');
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow-md">
      <h1 className="text-2xl font-bold mb-6">Login</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block mb-2">Email</label>
          <input
            type="email"
            id="email"
            required
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div className="mb-4 relative">
          <label htmlFor="password" className="block mb-2">Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded text-shadow-neon"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? 'Hide' : 'Show'} Password
          </button>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Login
        </button>
      </form>
    </div>
  );
}

// Add this CSS to your global stylesheet or component
.text-shadow-neon {
  text-shadow:
    0 0 5px #00f2ff,
    0 0 10px #00f2ff,
    0 0 20px #00f2ff,
    0 0 40px #00f2ff;
}