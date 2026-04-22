import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: '🧮',
    color: 'rgba(99,179,237,0.12)',
    title: 'Smart Scaling',
    desc: 'Scale any recipe to any serving count instantly. Ingredients update in real time.',
  },
  {
    icon: '📚',
    color: 'rgba(167,139,250,0.12)',
    title: 'Recipe Library',
    desc: 'Save and organize your recipes. Mark them public to share with your team.',
  },
  {
    icon: '🔍',
    color: 'rgba(246,173,85,0.12)',
    title: 'Full-text Search',
    desc: 'Instantly find recipes by name, ingredient, or tag across your entire library.',
  },
  {
    icon: '☁️',
    color: 'rgba(104,211,145,0.12)',
    title: 'Cloud Sync',
    desc: 'Your data syncs across all devices via MongoDB Atlas — always up to date.',
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <span className="hero-badge">🍽️ Catering Calculator v2</span>
        <h1 className="hero-title">
          Scale recipes for <span className="highlight">any crowd</span>
        </h1>
        <p className="hero-sub">
          MenuMaster lets you build a recipe library, scale ingredients to any
          serving size, and plan menus — all in one place.
        </p>
        <div className="hero-cta">
          {user ? (
            <>
              <Link to="/recipes" className="btn btn-primary">My Recipes →</Link>
              <Link to="/calculator" className="btn btn-ghost">Open Calculator</Link>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">Get started free</Link>
              <Link to="/login" className="btn btn-ghost">Sign in</Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <div className="features">
        {features.map((f) => (
          <div className="feature-card" key={f.title}>
            <div className="feature-icon" style={{ background: f.color }}>
              {f.icon}
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}
