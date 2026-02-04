import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/common.css';
import { useRedirectIfAuthenticated } from '../hooks/useRedirectIfAuthenticated';

export default function Auth() {
  const { loading } = useRedirectIfAuthenticated();
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  if (loading) return null;

  const toggleForms = () => {
    setIsLogin(!isLogin);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.redirected && response.url.includes('/dashboard')) {
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/dashboard');
      } else {
        const text = await response.text();
        alert(text);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    }
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f0f0f0' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Matcha - Auth</h1>

      {isLogin ? (
        <form onSubmit={handleLogin} className="form-container">
          <h2>Connexion</h2>
          <input type="email" name="email" placeholder="Email" required className="form-input" />
          <input type="password" name="password" placeholder="Mot de passe" required className="form-input" />
          <button type="submit" className="btn">Se connecter</button>
          <div className="toggle-text">
            Pas encore inscrit ? <a onClick={toggleForms} className="toggle-link">Créer un compte</a>
          </div>
        </form>
      ) : (
        <form action="/auth/register" method="POST" className="form-container">
          <h2>Inscription</h2>
          <input type="text" name="username" placeholder="Nom d'utilisateur" required className="form-input" />
          <input type="email" name="email" placeholder="Email" required className="form-input" />
          <input type="password" name="password" placeholder="Mot de passe" required className="form-input" />
          <button type="submit" className="btn">S'inscrire</button>
          <div className="toggle-text">
            Déjà inscrit ? <a onClick={toggleForms} className="toggle-link">Se connecter</a>
          </div>
        </form>
      )}
    </div>
  );
}
