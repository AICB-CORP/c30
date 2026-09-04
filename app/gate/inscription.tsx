import { useState } from 'react';

export default function Inscription() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const validatePassword = (pwd: string) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(pwd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword(password)) {
      setPasswordError('Mot de passe invalide : minimum 8 caractères avec majuscule, minuscule et chiffre');
      return;
    }

    // Here would be your form submission logic
    console.log('Form submitted with password:', password);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-bold">
          Mot de passe
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="8 caractères minimum"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-2 text-white/60 hover:text-white"
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
        {passwordError && <p className="mt-1 text-sm text-red-600">{passwordError}</p>}
      </div>
      <button
        type="submit"
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        S'inscrire
      </button>
    </form>
  );
}