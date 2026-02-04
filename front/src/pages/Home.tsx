import { Link } from 'react-router-dom';
import '../styles/common.css';
import {notify} from '../notifications/notifications';
import { useRedirectIfAuthenticated } from '../hooks/useRedirectIfAuthenticated';

export default function Home() {
  const { loading } = useRedirectIfAuthenticated();

  if (loading) return null; // Or a loading spinner

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Welcome to My Mini Node Server</h1>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <div>
          <Link to="/auth" className="auth-button">Login / Sign Up</Link>
          <button onClick={() => notify("Notification", "info")}>Notify!</button>
        </div>
      </header>

      <main className="content-card">
        <h2>Home Page</h2>
        <p>
          This is the home page of your mini Node.js server. Here, you can practice reading and writing files, parsing URLs, and handling HTTP requests.
        </p>
        <p>
          Try visiting the <Link to="/about">About</Link> and <Link to="/contact">Contact</Link> pages to see more examples.
        </p>
      </main>

      <footer className="page-footer">
        <p>&copy; 2025 Mini Node Server Project</p>
      </footer>
    </div>
  );
}
