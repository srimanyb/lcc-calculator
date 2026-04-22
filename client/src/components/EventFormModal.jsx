import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function EventFormModal({ menuItems, aggregatedList, onSaved, onClose }) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    eventName: '',
    numberOfPeople: '',
    date: new Date().toISOString().split('T')[0],
    timeType: 'Lunch',
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        numberOfPeople: parseInt(form.numberOfPeople),
        recipes: menuItems.map(m => ({
          recipeId: m._id,
          name: m.name,
          targetServings: m.targetServings,
          baseServing: m.baseServing,
        })),
        ingredients: aggregatedList,
      };

      await api.createEvent(payload);
      addToast('Event saved successfully ✓', 'success');
      onSaved();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Save as Event</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Event Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Wedding Reception"
              value={form.eventName}
              onChange={e => setField('eventName', e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Number of People *</label>
              <input
                type="number"
                className="form-input"
                min="1"
                placeholder="100"
                value={form.numberOfPeople}
                onChange={e => setField('numberOfPeople', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Time Type</label>
              <select
                className="form-input"
                value={form.timeType}
                onChange={e => setField('timeType', e.target.value)}
              >
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Event Date</label>
            <input
              type="date"
              className="form-input"
              value={form.date}
              onChange={e => setField('date', e.target.value)}
              required
            />
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Saving this will capture the current recipes and combined shopping list for future reference.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
