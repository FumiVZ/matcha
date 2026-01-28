import { Link } from 'react-router-dom';
import '../styles/common.css';

export default function NotFound() {
  return (
    <div className="not-found-container">
      <header>
        <h1>404</h1>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
      </header>

      <main>
        <h2>Page Not Found</h2>
        <p>
          Oops! The page you are looking for does not exist. Check the URL or go back to the home page.
        </p>
        <p>
          <Link to="/" style={{ color: '#cc0000', fontWeight: 'bold' }}>Go back to Home</Link>
        </p>
      </main>
    </div>
  );
}
