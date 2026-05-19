'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { queuesApi, ticketsApi } from '@/lib/api';

export default function GuichetPage() {
  const { token, user } = useAuth();
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [currentTicket, setCurrentTicket] = useState<any>(null);
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    queuesApi.getAll(token).then((res) => {
      setQueues(res.data);
      if (res.data.length > 0) setSelectedQueue(res.data[0].id);
    });
  }, [token]);

  const handleCallNext = async () => {
    if (!token || !selectedQueue) return;
    setLoading(true);
    try {
      const ticket = await ticketsApi.callNext(selectedQueue, token);
      setCurrentTicket(ticket);
    } catch (err: any) {
      alert(err.message || 'Plus de clients dans cette file');
      setCurrentTicket(null);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (action: 'complete' | 'no_show') => {
    if (!token || !currentTicket) return;
    setLoading(true);
    try {
      await ticketsApi.validate(currentTicket.id, { action, notes }, token);
      setCurrentTicket(null);
      setNotes('');
      alert(action === 'complete' ? 'Service rendu validé' : 'Client marqué absent');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanQr = async () => {
    if (!qrCodeInput || !token) return;
    try {
      const ticket = await ticketsApi.findByQr(qrCodeInput);
      setCurrentTicket(ticket);
      setQrCodeInput('');
    } catch (err: any) {
      alert('Ticket non trouvé ou QR invalide');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🖥️ Espace Guichet / Agent</h1>
          <p className="page-subtitle">Gérez la file d'attente et validez les tickets</p>
        </div>
      </div>

      <div className="grid-2">
        {/* Panneau de contrôle */}
        <div className="glass-card">
          <h3>Contrôle de la file</h3>
          <div style={{ marginTop: 20 }}>
            <label className="label">Sélectionnez votre file active</label>
            <select 
              className="input" 
              value={selectedQueue} 
              onChange={(e) => setSelectedQueue(e.target.value)}
            >
              {queues.map(q => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button 
              className="btn btn-primary" 
              onClick={handleCallNext} 
              disabled={loading || !selectedQueue}
              style={{ padding: '20px', fontSize: '1.2rem' }}
            >
              📢 Appeler le client suivant
            </button>
            <div style={{ textAlign: 'center', marginTop: 10 }}>ou</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                type="text" 
                className="input" 
                placeholder="Scanner le QR Code..." 
                value={qrCodeInput}
                onChange={e => setQrCodeInput(e.target.value)}
              />
              <button className="btn btn-secondary" onClick={handleScanQr}>🔍 Scanner</button>
            </div>
          </div>
        </div>

        {/* Ticket en cours */}
        <div className="glass-card">
          <h3>Ticket en cours</h3>
          {currentTicket ? (
            <div style={{ marginTop: 20, padding: 20, background: 'rgba(108, 92, 231, 0.1)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ fontSize: '3rem', fontWeight: 800, textAlign: 'center', color: 'var(--primary)' }}>
                {currentTicket.ticketNumber}
              </div>
              <div style={{ textAlign: 'center', marginTop: 10, fontSize: '1.2rem' }}>
                Client ID: {currentTicket.user.slice(0, 8)}...
              </div>
              <div style={{ textAlign: 'center', marginTop: 5, color: currentTicket.isPaid ? 'var(--success)' : 'var(--error)' }}>
                {currentTicket.isPaid ? '✅ Payé' : '❌ Non Payé'}
              </div>

              <div style={{ marginTop: 20 }}>
                <textarea 
                  className="input" 
                  placeholder="Notes de l'agent (optionnel)..." 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ minHeight: 80, resize: 'vertical' }}
                />
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                  onClick={() => handleValidate('complete')}
                  disabled={loading}
                >
                  ✅ Service Rendu
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, color: 'var(--error)' }}
                  onClick={() => handleValidate('no_show')}
                  disabled={loading}
                >
                  ❌ Absent
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 20, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Aucun ticket en cours. Appelez le client suivant.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
