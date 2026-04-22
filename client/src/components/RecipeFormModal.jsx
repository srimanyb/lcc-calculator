import { useState, useEffect } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

const emptyIngredient = () => ({ name: '', qty: '', unit: '' });

export default function RecipeFormModal({ initial, onSaved, onClose }) {
  const { addToast } = useToast();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    name: '',
    baseServing: '',
    isPublic: false,
    tags: '',
    ingredients: [emptyIngredient()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        baseServing: initial.baseServing,
        isPublic: initial.isPublic,
        tags: (initial.tags || []).join(', '),
        ingredients: initial.ingredients.map(i => ({ ...i, qty: String(i.qty) })),
      });
    }
  }, [initial]);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const setIngredient = (i, key, val) => {
    setForm(f => {
      const ings = [...f.ingredients];
      ings[i] = { ...ings[i], [key]: val };
      return { ...f, ingredients: ings };
    });
  };

  const addIngredient = () => setForm(f => ({
    ...f,
    ingredients: [...f.ingredients, emptyIngredient()],
  }));

  const removeIngredient = (i) => setForm(f => ({
    ...f,
    ingredients: f.ingredients.filter((_, idx) => idx !== i),
  }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate ingredients
    const cleanIngredients = form.ingredients.map(ing => ({
      name: ing.name.trim(),
      qty: parseFloat(ing.qty),
      unit: ing.unit.trim(),
    }));

    if (cleanIngredients.some(i => !i.name || isNaN(i.qty) || !i.unit)) {
      setError('All ingredient fields are required.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      baseServing: parseInt(form.baseServing),
      isPublic: form.isPublic,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      ingredients: cleanIngredients,
    };

    setSaving(true);
    try {
      let saved;
      if (isEdit) {
        const data = await api.updateRecipe(initial._id, payload);
        saved = data.recipe;
      } else {
        const data = await api.createRecipe(payload);
        saved = data.recipe;
      }
      onSaved(saved, isEdit);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Recipe' : 'New Recipe'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Recipe name *</label>
              <input
                id="recipe-name-input"
                className="form-input"
                placeholder="e.g. Butter Chicken"
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Base servings *</label>
              <input
                id="base-serving-input"
                type="number"
                min="1"
                className="form-input"
                placeholder="e.g. 10"
                value={form.baseServing}
                onChange={e => setField('baseServing', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tags (comma-separated)</label>
            <input
              className="form-input"
              placeholder="e.g. chicken, curry, gluten-free"
              value={form.tags}
              onChange={e => setField('tags', e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="form-check">
              <input
                id="recipe-public"
                type="checkbox"
                checked={form.isPublic}
                onChange={e => setField('isPublic', e.target.checked)}
              />
              <label htmlFor="recipe-public" className="form-label" style={{ margin: 0 }}>
                Make this recipe public
              </label>
            </div>
          </div>

          <div className="divider" />

          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="form-label" style={{ margin: 0 }}>Ingredients *</span>
          </div>

          {/* Ingredient header */}
          <div className="ingredient-row" style={{ marginBottom: '0.3rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>NAME</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>QTY</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>UNIT</span>
            <span />
          </div>

          {form.ingredients.map((ing, i) => (
            <div className="ingredient-row" key={i}>
              <input
                className="form-input"
                placeholder="Butter"
                value={ing.name}
                onChange={e => setIngredient(i, 'name', e.target.value)}
                required
              />
              <input
                type="number"
                step="any"
                min="0"
                className="form-input"
                placeholder="500"
                value={ing.qty}
                onChange={e => setIngredient(i, 'qty', e.target.value)}
                required
              />
              <input
                className="form-input"
                placeholder="g"
                value={ing.unit}
                onChange={e => setIngredient(i, 'unit', e.target.value)}
                required
              />
              <button
                type="button"
                className="ingredient-remove"
                onClick={() => removeIngredient(i)}
                disabled={form.ingredients.length === 1}
              >
                −
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ marginTop: '0.5rem', marginBottom: '1.2rem' }}
            onClick={addIngredient}
          >
            + Add ingredient
          </button>

          {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              id="save-recipe-btn"
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
