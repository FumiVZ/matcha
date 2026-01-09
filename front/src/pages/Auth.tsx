import { useState } from 'react';
import '../styles/common.css';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const toggleForms = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="page-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f0f0f0' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Matcha - Auth</h1>

      {isLogin ? (
        <form action="/auth/login" method="POST" className="form-container">
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
