import { Link } from 'react-router-dom';
import '../styles/common.css';

export default function Contact() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Contact Me</h1>
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
        <h2>Contact Page</h2>
        <p>
          Fill out the form below to practice sending data to the server.
        </p>
        <form action="/contact" method="POST" className="form-container" style={{ maxWidth: '100%', margin: 0, boxShadow: 'none', padding: '1rem 0' }}>
          <input type="text" name="name" placeholder="Your Name" required className="form-input" />
          <input type="email" name="email" placeholder="Your Email" required className="form-input" />
          <textarea name="message" placeholder="Your Message" required className="form-textarea"></textarea>
          <button type="submit" className="btn btn-secondary">Send Message</button>
        </form>
      </main>

      <footer className="page-footer">
        <p>&copy; 2025 Mini Node Server Project</p>
      </footer>
    </div>
  );
}
