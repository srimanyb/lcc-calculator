import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function SavedEventsPage() {
  const { addToast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState('All');

  const categorizeIngredient = (name) => {
    const n = name.toLowerCase();
    const meat = ['mutton', 'chicken', 'fish', 'egg', 'prawn', 'meat', 'beef', 'pork'];
    const veg = ['onion', 'tomato', 'potato', 'chilli', 'ginger', 'garlic', 'coriander', 'mint', 'carrot', 'beans', 'cabbage', 'capsicum', 'cauliflower', 'spinach', 'lemon', 'mirchi', 'kothmir', 'pudina', 'alu', 'peas', 'brinjal', 'gourd', 'veg'];
    
    if (meat.some(m => n.includes(m))) return 'Meat';
    if (veg.some(v => n.includes(v))) return 'Vegetables';
    return 'Kirana';
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const data = await api.getEvents();
      setEvents(data.events);
    } catch (err) {
      addToast('Failed to load events', 'error');
    } finally {
      setLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    try {
      await api.deleteEvent(id);
      addToast('Event deleted successfully.', 'success');
      setEvents(prev => prev.filter(e => e._id !== id));
      if (selectedEvent?._id === id) {
        setSelectedEvent(null);
      }
    } catch (err) {
      addToast(err.message || 'Failed to delete event', 'error');
    }
  };

  const handleEdit = async (event) => {
    try {
      setLoading(true);
      const fullRecipes = await Promise.all(
        event.recipes.map(async (r) => {
          const data = await api.getRecipe(r.recipeId);
          return {
            ...data.recipe,
            targetServings: r.targetServings
          };
        })
      );
      
      sessionStorage.setItem('mm_calc', JSON.stringify(fullRecipes));
      sessionStorage.setItem('mm_calc_edit_id', event._id);
      sessionStorage.setItem('mm_calc_edit_meta', JSON.stringify({
        eventName: event.eventName,
        numberOfPeople: event.numberOfPeople,
        date: new Date(event.date).toISOString().split('T')[0],
        timeType: event.timeType,
        venue: event.venue
      }));
      
      navigate('/calculator');
    } catch (err) {
      addToast('Failed to load event for editing', 'error');
      setLoading(false);
    }
  };

  const shareText = (event) => {
    const listToExport = event.ingredients.filter(ing => listFilter === 'All' || categorizeIngredient(ing.name) === listFilter);
    
    const text = `
Event: ${event.eventName}
People: ${event.numberOfPeople}
Venue: ${event.venue || 'TBD'}
Date: ${new Date(event.date).toLocaleDateString('en-GB')} (${event.timeType})

MENU:
${event.recipes.map(r => `- ${r.name} (${r.targetServings} servings)`).join('\n')}

SHOPPING LIST (${listFilter.toUpperCase()}):
${listToExport.map(i => `- ${i.name}: ${Math.round(i.qty)} ${i.unit}`).join('\n')}
    `.trim();

    if (navigator.share) {
      navigator.share({
        title: `Event: ${event.eventName} - ${listFilter} List`,
        text: text,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      addToast('Copied to clipboard ✓', 'success');
    }
  };

  const sharePDF = (event) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text(event.eventName, 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Date: ${new Date(event.date).toLocaleDateString('en-GB')} | ${event.timeType}`, 14, 30);
    doc.text(`Guests: ${event.numberOfPeople} | Venue: ${event.venue || 'TBD'}`, 14, 37);

    // Recipes Section
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text('Menu Recipes', 14, 50);
    
    const recipeRows = event.recipes.map(r => [r.name, r.targetServings, r.baseServing]);
    doc.autoTable({
      startY: 55,
      head: [['Recipe Name', 'Target Servings', 'Base Serving']],
      body: recipeRows,
      theme: 'grid',
    });

    // Shopping List Section
    const nextY = doc.lastAutoTable.finalY + 15;
    doc.text(`Shopping List (${listFilter})`, 14, nextY);
    
    const listToExport = event.ingredients.filter(ing => listFilter === 'All' || categorizeIngredient(ing.name) === listFilter);
    const ingredientRows = listToExport.map(i => [i.name, Math.round(i.qty), i.unit]);
    doc.autoTable({
      startY: nextY + 5,
      head: [['Ingredient', 'Quantity', 'Unit']],
      body: ingredientRows,
      theme: 'striped',
    });

    doc.save(`${event.eventName.replace(/\s+/g, '_')}_${listFilter}_list.pdf`);
    addToast('PDF downloaded ✓', 'success');
  };

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /> Loading events…</div></div>;

  const filteredEvents = events.filter(e => 
    e.eventName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.timeType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Saved Events</h1>
        {events.length > 0 && (
          <div className="search-bar">
            <span className="search-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
            />
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">No saved events</div>
          <p>Go to the Menu Calculator to plan and save your first event.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: selectedEvent ? '350px 1fr' : '1fr' }}>
          {/* List Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredEvents.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '1rem' }}>No events match your search.</div>
            ) : (
              filteredEvents.map(event => (
                <div 
                  key={event._id} 
                  className={`card event-card ${selectedEvent?._id === event._id ? 'active' : ''}`}
                  onClick={() => setSelectedEvent(event)}
                  style={{ cursor: 'pointer', border: selectedEvent?._id === event._id ? '2px solid var(--accent-1)' : '1px solid var(--border)' }}
                >
                  <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{event.eventName}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {new Date(event.date).toLocaleDateString('en-GB')} · {event.numberOfPeople} people {event.venue && `· ${event.venue}`}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                     <span className="tag">{event.timeType}</span>
                     <span className="tag">{event.recipes.length} Recipes</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Details Section */}
          {selectedEvent && (
            <div className="card animate-fade-in" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{selectedEvent.eventName}</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Planned for {new Date(selectedEvent.date).toLocaleDateString('en-GB')} · {selectedEvent.numberOfPeople} guests · {selectedEvent.timeType} {selectedEvent.venue && `· Venue: ${selectedEvent.venue}`}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost" onClick={() => handleEdit(selectedEvent)}>✏️ Edit Event</button>
                  <button className="btn btn-ghost" onClick={() => handleDelete(selectedEvent._id)} style={{ color: 'var(--accent-danger)' }}>🗑 Delete</button>
                  <button className="btn btn-ghost" onClick={() => shareText(selectedEvent)}>📱 Share Text</button>
                  <button className="btn btn-primary" onClick={() => sharePDF(selectedEvent)}>📄 Export PDF</button>
                </div>
              </div>

              <div className="divider" />

              <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Selected Menu</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedEvent.recipes.map((r, i) => (
                      <div key={i} className="card" style={{ padding: '0.75rem', background: 'var(--bg-hover)' }}>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Scaled to {r.targetServings} servings
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Shopping List</h3>
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-hover)', padding: '0.25rem', borderRadius: '8px' }}>
                      {['All', 'Vegetables', 'Meat', 'Kirana'].map(f => (
                        <button
                          key={f}
                          onClick={() => setListFilter(f)}
                          style={{
                            border: 'none',
                            background: listFilter === f ? 'var(--accent-1)' : 'transparent',
                            color: listFilter === f ? 'var(--bg-card)' : 'var(--text-secondary)',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="ingredients-table" style={{ fontSize: '0.9rem' }}>
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th style={{ textAlign: 'right' }}>Qty</th>
                          <th>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEvent.ingredients
                          .filter(ing => listFilter === 'All' || categorizeIngredient(ing.name) === listFilter)
                          .map((ing, i) => (
                          <tr key={i}>
                            <td>{ing.name}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{Math.round(ing.qty)}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{ing.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
