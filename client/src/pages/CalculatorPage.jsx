import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import EventFormModal from '../components/EventFormModal';

export default function CalculatorPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(sessionStorage.getItem('mm_calc') || '[]');
    setItems(saved);
  }, []);

  const removeItem = (id) => {
    const updated = items.filter(r => r._id !== id);
    setItems(updated);
    sessionStorage.setItem('mm_calc', JSON.stringify(updated));
  };

  const updateServings = (id, val) => {
    const num = parseInt(val) || 0;
    const updated = items.map(r =>
      r._id === id ? { ...r, targetServings: num } : r
    );
    setItems(updated);
    sessionStorage.setItem('mm_calc', JSON.stringify(updated));
  };

  // Merge all ingredients across recipes
  const aggregateIngredients = () => {
    const map = {};
    items.forEach(recipe => {
      if (!recipe.targetServings || recipe.targetServings < 1) return;
      const ratio = recipe.targetServings / recipe.baseServing;
      recipe.ingredients.forEach(ing => {
        const key = `${ing.name.toLowerCase()}__${ing.unit.toLowerCase()}`;
        if (map[key]) {
          map[key].qty += ing.qty * ratio;
        } else {
          map[key] = { name: ing.name, unit: ing.unit, qty: ing.qty * ratio };
        }
      });
    });
    return Object.values(map).map(i => ({ ...i, qty: parseFloat(i.qty.toFixed(2)) }));
  };

  const aggregated = aggregateIngredients();

  const exportCSV = () => {
    const rows = [['Ingredient', 'Quantity', 'Unit']];
    aggregated.forEach(i => rows.push([i.name, i.qty, i.unit]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'shopping-list.csv'; a.click();
    addToast('Shopping list exported ✓', 'success');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Menu Calculator</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {aggregated.length > 0 && (
            <>
              <button className="btn btn-ghost" onClick={exportCSV}>
                📥 Export CSV
              </button>
              <button id="save-event-trigger" className="btn btn-primary" onClick={() => setShowSaveModal(true)}>
                💾 Save as Event
              </button>
            </>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧮</div>
          <div className="empty-title">No recipes added</div>
          <p style={{ marginBottom: '1.2rem' }}>
            Open a recipe and click "Add to Calculator" to start planning your menu.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/recipes')}>
            Browse Recipes
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {/* Left: recipes with serving controls */}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              RECIPES IN MENU
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {items.map(recipe => (
                <div key={recipe._id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{recipe.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Base: {recipe.baseServing} servings
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>SERVINGS</label>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={recipe.targetServings}
                          onChange={e => updateServings(recipe._id, e.target.value)}
                          style={{
                            width: '80px', 
                            textAlign: 'center',
                            height: '38px',
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: 'var(--accent-1)'
                          }}
                        />
                      </div>
                      <button
                        className="btn-icon"
                        title="Remove"
                        onClick={() => removeItem(recipe._id)}
                        style={{ marginTop: '1.2rem', color: 'var(--accent-danger)' }}
                      >🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: '1rem' }}
              onClick={() => navigate('/recipes')}
            >
              + Add another recipe
            </button>
          </div>

          {/* Right: aggregated shopping list */}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              COMBINED SHOPPING LIST
            </h2>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="ingredients-table">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th style={{ textAlign: 'right' }}>Total Qty</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregated.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Adjust servings to see totals</td></tr>
                  ) : aggregated.map((ing, i) => (
                    <tr key={i}>
                      <td>{ing.name}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="scaled-qty">{ing.qty}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{ing.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <EventFormModal
          menuItems={items}
          aggregatedList={aggregated}
          onSaved={() => { setShowSaveModal(false); navigate('/saved-events'); }}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
