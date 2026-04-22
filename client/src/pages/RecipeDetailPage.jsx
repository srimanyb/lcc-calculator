import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import RecipeFormModal from '../components/RecipeFormModal';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function RecipeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [recipe, setRecipe]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);

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

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text(recipe.name, 14, 20);
    doc.setFontSize(12);
    doc.text(`Scaled for: ${servings} servings (Base: ${recipe.baseServing})`, 14, 30);
    
    const rows = recipe.ingredients.map(ing => [ing.name, ing.qty, scale(ing.qty), ing.unit]);
    doc.autoTable({
      startY: 40,
      head: [['Ingredient', 'Original Qty', 'Scaled Qty', 'Unit']],
      body: rows,
      theme: 'striped',
    });
    doc.save(`${recipe.name.replace(/\s+/g, '_')}_${servings}servings.pdf`);
    addToast('PDF downloaded ✓', 'success');
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${recipe.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteRecipe(id);
      addToast('Recipe deleted.', 'success');
      navigate('/recipes');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleSaved = (updatedRecipe) => {
    setRecipe(updatedRecipe);
    setServings(updatedRecipe.baseServing);
    setShowEditModal(false);
    addToast('Recipe updated ✓', 'success');
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
          <input
            type="number"
            min="1"
            className="form-input"
            value={servings}
            onChange={e => setServings(parseInt(e.target.value) || 1)}
            style={{ width: '80px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '700', padding: '0.4rem', color: 'var(--accent-1)' }}
          />
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button id="add-to-calc-btn" className="btn btn-primary" onClick={addToCalculator}>
              🧮 Add to Calculator
            </button>
            <button className="btn btn-ghost" onClick={exportPDF}>
              📄 Export Scaled List
            </button>
          </div>
          
          {user?.role === 'admin' && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowEditModal(true)}>✏️ Edit Recipe</button>
              <button className="btn btn-danger" onClick={handleDelete}>🗑 Delete</button>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <RecipeFormModal
          initial={recipe}
          onSaved={handleSaved}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}
