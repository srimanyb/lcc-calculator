import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import RecipeFormModal from '../components/RecipeFormModal';

export default function RecipesPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [recipes, setRecipes]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRecipes();
      setRecipes(data.recipes);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) { fetchRecipes(); return; }
    setLoading(true);
    try {
      const data = await api.search(query);
      setRecipes(data.recipes);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.deleteRecipe(id);
      addToast('Recipe deleted.', 'success');
      setRecipes(r => r.filter(x => x._id !== id));
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleSaved = (recipe, isEdit) => {
    if (isEdit) {
      setRecipes(r => r.map(x => x._id === recipe._id ? recipe : x));
      addToast('Recipe updated ✓', 'success');
    } else {
      setRecipes(r => [recipe, ...r]);
      addToast('Recipe created ✓', 'success');
    }
    setShowModal(false);
    setEditTarget(null);
  };

  const openEdit = (recipe, e) => {
    e.stopPropagation();
    setEditTarget(recipe);
    setShowModal(true);
  };

  const filtered = query
    ? recipes
    : recipes;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Recipes</h1>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <form className="search-bar" onSubmit={handleSearch}>
            <span className="search-icon">🔍</span>
            <input
              id="recipe-search"
              type="search"
              placeholder="Search recipes…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </form>
          <button
            id="add-recipe-btn"
            className="btn btn-primary"
            onClick={() => { setEditTarget(null); setShowModal(true); }}
          >
            + New Recipe
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading recipes…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No recipes yet</div>
          <p style={{ marginBottom: '1.2rem' }}>Create your first recipe to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Recipe
          </button>
        </div>
      ) : (
        <div className="recipes-grid">
          {filtered.map(recipe => (
            <div
              key={recipe._id}
              className="card recipe-card"
              onClick={() => navigate(`/recipes/${recipe._id}`)}
            >
              <div className="recipe-card-header">
                <span className="recipe-name">{recipe.name}</span>
                <span className={`recipe-badge ${recipe.isPublic ? 'badge-public' : 'badge-private'}`}>
                  {recipe.isPublic ? 'Public' : 'Private'}
                </span>
              </div>

              <p className="recipe-meta">
                {recipe.baseServing} servings · {recipe.ingredients?.length || 0} ingredients
                {recipe.owner?.name && ` · by ${recipe.owner.name}`}
              </p>

              {recipe.tags?.length > 0 && (
                <div className="recipe-tags">
                  {recipe.tags.slice(0, 4).map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                <div className="recipe-stats">
                  <span className="stat">👁 <strong>{recipe.viewCount || 0}</strong></span>
                  <span className="stat">🍽 <strong>{recipe.useCount || 0}</strong> uses</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="btn-icon"
                    title="Edit"
                    onClick={e => openEdit(recipe, e)}
                  >✏️</button>
                  <button
                    className="btn-icon"
                    title="Delete"
                    onClick={e => { e.stopPropagation(); handleDelete(recipe._id, recipe.name); }}
                  >🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <RecipeFormModal
          initial={editTarget}
          onSaved={handleSaved}
          onClose={() => { setShowModal(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}
