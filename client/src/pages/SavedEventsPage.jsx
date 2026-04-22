import { useState, useEffect } from 'react';
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

  const shareText = (event) => {
    const text = `
Event: ${event.eventName}
People: ${event.numberOfPeople}
Date: ${new Date(event.date).toLocaleDateString()} (${event.timeType})

MENU:
${event.recipes.map(r => `- ${r.name} (${r.targetServings} servings)`).join('\n')}

SHOPPING LIST:
${event.ingredients.map(i => `- ${i.name}: ${i.qty} ${i.unit}`).join('\n')}
    `.trim();

    if (navigator.share) {
      navigator.share({
        title: `Event: ${event.eventName}`,
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
    doc.text(`Date: ${new Date(event.date).toLocaleDateString()} | ${event.timeType}`, 14, 30);
    doc.text(`Guests: ${event.numberOfPeople}`, 14, 37);

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
    doc.text('Combined Shopping List', 14, nextY);
    
    const ingredientRows = event.ingredients.map(i => [i.name, i.qty, i.unit]);
    doc.autoTable({
      startY: nextY + 5,
      head: [['Ingredient', 'Quantity', 'Unit']],
      body: ingredientRows,
      theme: 'striped',
    });

    doc.save(`${event.eventName.replace(/\s+/g, '_')}_details.pdf`);
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
                    {new Date(event.date).toLocaleDateString()} · {event.numberOfPeople} people
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
                    Planned for {new Date(selectedEvent.date).toLocaleDateString()} · {selectedEvent.numberOfPeople} guests · {selectedEvent.timeType}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Shopping List</h3>
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
                        {selectedEvent.ingredients.map((ing, i) => (
                          <tr key={i}>
                            <td>{ing.name}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{ing.qty}</td>
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
