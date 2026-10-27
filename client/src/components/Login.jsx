import { useEffect, useState } from 'react';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const [seedUsers, setSeedUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/seed-users')
      .then((r) => r.json())
      .then(setSeedUsers)
      .catch(() => {});
  }, []);

  async function submit(value) {
    setError('');
    try {
      await login(value || email);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="login">
      <div className="login-card">
        <h1>Ajaia Docs</h1>
        <p className="muted">
          Mocked auth for the demo — pick a seeded account or type its email.
        </p>

        <div className="seed-list">
          {seedUsers.map((u) => (
            <button key={u.email} className="seed-btn" onClick={() => submit(u.email)}>
              <strong>{u.name}</strong>
              <span className="muted">{u.email}</span>
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="email"
            placeholder="email@ajaia.test"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="primary">Sign in</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
