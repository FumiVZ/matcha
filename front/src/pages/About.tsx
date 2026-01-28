import { Link } from 'react-router-dom';
import '../styles/common.css';

export default function About() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>About This Mini Node Server</h1>
        <nav className="nav">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
        </nav>
        <div>
          <Link to="/auth" className="auth-button">Login / Sign Up</Link>
        </div>
      </header>

      <main className="content-card">
        <h2>About Page</h2>
        <p>
          This page explains what this mini Node.js project is about. It's designed to practice handling HTTP requests, working with the file system, and using modules in Node.js.
        </p>
        <p>
          You can use this page to explore URL parsing, asynchronous file operations, and event handling.
        </p>
      </main>

      <footer className="page-footer">
        <p>&copy; 2025 Mini Node Server Project</p>
      </footer>
    </div>
  );
}
