import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [recipe, setRecipe]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);

  useEffect(() => {
    api.getRecipe(id)
      .then(data => {
        setRecipe(data.recipe);
        setServings(data.recipe.baseServing);
      })
      .catch(err => {
        addToast(err.message, 'error');
        navigate('/recipes');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const scale = (qty) => {
    if (!recipe) return qty;
    const ratio = servings / recipe.baseServing;
    const result = qty * ratio;
    return Number.isInteger(result) ? result : parseFloat(result.toFixed(2));
  };

  const addToCalculator = async () => {
    try {
      await api.useRecipe(id);
      addToast('Added to calculator ✓', 'success');
      // Store in sessionStorage for the calculator page
      const existing = JSON.parse(sessionStorage.getItem('mm_calc') || '[]');
      const entry = { ...recipe, targetServings: servings };
      const idx = existing.findIndex(r => r._id === recipe._id);
      if (idx >= 0) existing[idx] = entry; else existing.push(entry);
      sessionStorage.setItem('mm_calc', JSON.stringify(existing));
      navigate('/calculator');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /> Loading recipe…</div>;
  if (!recipe) return null;

  const isOwner = user?._id === recipe.owner?._id || user?.id === recipe.owner?._id;

  return (
    <div className="page">
      <div className="recipe-detail">
        {/* Back */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: '1.5rem' }}
          onClick={() => navigate('/recipes')}
        >
          ← Back to Recipes
        </button>

        {/* Header */}
        <div className="detail-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <h1 className="detail-title">{recipe.name}</h1>
            <span className={`recipe-badge ${recipe.isPublic ? 'badge-public' : 'badge-private'}`}>
              {recipe.isPublic ? 'Public' : 'Private'}
            </span>
          </div>

          <div className="detail-meta">
            {recipe.owner?.name && <span>By {recipe.owner.name}</span>}
            <span>Base: {recipe.baseServing} servings</span>
            <span>👁 {recipe.viewCount || 0} views</span>
            {recipe.tags?.length > 0 && (
              <div className="recipe-tags" style={{ marginTop: '0.6rem' }}>
                {recipe.tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
              </div>
            )}
          </div>
        </div>

        {/* Serving scaler */}
        <div className="serving-control">
          <div className="serving-label">
            <strong>Scale to servings</strong>
            <div style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
              Base: {recipe.baseServing} — ratio: ×{(servings / recipe.baseServing).toFixed(2)}
            </div>
          </div>
          <button
            className="serving-btn"
            id="serving-decrease"
            onClick={() => setServings(s => Math.max(1, s - 1))}
          >−</button>
          <div className="serving-number">{servings}</div>
          <button
            className="serving-btn"
            id="serving-increase"
            onClick={() => setServings(s => s + 1)}
          >+</button>
        </div>

        {/* Ingredients table */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: 0, overflow: 'hidden' }}>
          <table className="ingredients-table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th style={{ textAlign: 'right' }}>Original</th>
                <th style={{ textAlign: 'right', color: 'var(--accent-2)' }}>Scaled</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((ing, i) => (
                <tr key={i}>
                  <td>{ing.name}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{ing.qty}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="scaled-qty">{scale(ing.qty)}</span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{ing.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button id="add-to-calc-btn" className="btn btn-primary" onClick={addToCalculator}>
            🧮 Add to Calculator
          </button>
        </div>
      </div>
    </div>
  );
}
