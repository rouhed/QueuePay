'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { queuesApi, ticketsApi } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

export default function GuichetAgent() {
  const { user, token } = useAuth();
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  
  const [currentTicket, setCurrentTicket] = useState<any | null>(null);
  const [waitingTickets, setWaitingTickets] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Charger les files d'attente
  useEffect(() => {
    if (token && user) {
      loadQueues();
    }
  }, [token, user]);

  const loadQueues = async () => {
    if (!token) return;
    try {
      // Idéalement, on filtre les files assignées à l'agent.
      // Pour l'instant, on charge tout ou selon l'entité de l'agent si dispo.
      const res = await queuesApi.getAll(token);
      setQueues(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Charger la liste d'attente pour la file sélectionnée
  const loadWaitingTickets = async (queueId: string) => {
    if (!token) return;
    try {
      const res = await ticketsApi.getByQueue(queueId, token);
      
      // Séparer le ticket en cours d'appel des tickets en attente
      const calling = res.find(t => t.status === 'called');
      const waiting = res.filter(t => t.status === 'in_queue').sort((a, b) => a.position - b.position);
      
      setCurrentTicket(calling || null);
      setWaitingTickets(waiting);
    } catch (e) {
      console.error(e);
    }
  };

  // Gestion WebSocket lors de la sélection d'une file
  useEffect(() => {
    if (!selectedQueue || !token) return;

    loadWaitingTickets(selectedQueue);

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
    const newSocket = io(socketUrl, { auth: { token } });

    newSocket.on('connect', () => {
      newSocket.emit('join:queue:admin', { queueId: selectedQueue });
    });

    newSocket.on('ticket_status_changed', () => {
      // Recharger la liste si le statut d'un ticket change
      loadWaitingTickets(selectedQueue);
    });

    newSocket.on('new_ticket', () => {
      loadWaitingTickets(selectedQueue);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [selectedQueue, token]);

  const handleCallNext = async () => {
    if (!selectedQueue || !token) return;
    setLoading(true);
    try {
      const res = await ticketsApi.callNext(selectedQueue, token);
      setCurrentTicket(res);
      // La liste sera mise à jour via WebSocket
    } catch (e: any) {
      alert(e.message || 'Erreur lors de l\'appel du prochain ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!currentTicket || !token) return;
    setLoading(true);
    try {
      await ticketsApi.validate(currentTicket.id, { serviceNotes: 'Service rendu avec succès' }, token);
      setCurrentTicket(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentTicket || !token) return;
    if (!confirm('Êtes-vous sûr de marquer ce client comme absent ?')) return;
    setLoading(true);
    try {
      await ticketsApi.cancel(currentTicket.id); // Cancel peut être appelé sans body spécifique
      setCurrentTicket(null);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      {/* ── Entête et Sélection de la File ── */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#fff' }}>Interface Agent Guichet</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Agent : {user?.firstName} {user?.lastName}</p>
        </div>
        
        <div style={{ minWidth: '300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#a0a0b0' }}>File d'attente assignée :</label>
          <select 
            className="input" 
            value={selectedQueue} 
            onChange={(e) => setSelectedQueue(e.target.value)}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px' }}
          >
            <option value="">-- Sélectionnez un guichet/service --</option>
            {queues.map(q => (
              <option key={q.id} value={q.id}>{q.name} ({q.entity?.name})</option>
            ))}
          </select>
        </div>
      </div>

      {!selectedQueue ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '40px', display: 'block', marginBottom: '15px' }}>🛎️</span>
          Veuillez sélectionner une file d'attente pour commencer votre service.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '25px' }}>
          
          {/* ── Section Guichet (Ticket Actuel) ── */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', border: currentTicket ? '2px solid #00b894' : '1px solid rgba(255,255,255,0.05)' }}>
            
            {!currentTicket ? (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: 'var(--text-muted)' }}>Le guichet est libre</h2>
                <button 
                  onClick={handleCallNext} 
                  disabled={loading || waitingTickets.length === 0}
                  style={{
                    marginTop: '30px', padding: '20px 40px', fontSize: '20px', fontWeight: 'bold', borderRadius: '16px',
                    background: (loading || waitingTickets.length === 0) ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6c5ce7, #00b894)',
                    color: (loading || waitingTickets.length === 0) ? '#a0a0b0' : '#fff', border: 'none', cursor: (loading || waitingTickets.length === 0) ? 'not-allowed' : 'pointer',
                    boxShadow: (loading || waitingTickets.length === 0) ? 'none' : '0 10px 20px rgba(0, 184, 148, 0.4)', transition: 'all 0.3s'
                  }}
                >
                  {loading ? 'Appel en cours...' : '📢 APPELER LE SUIVANT'}
                </button>
                {waitingTickets.length === 0 && (
                  <p style={{ marginTop: '20px', color: '#ffab00' }}>Il n'y a personne dans la file d'attente pour le moment.</p>
                )}
              </div>
            ) : (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(0, 184, 148, 0.2)', color: '#00b894', borderRadius: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
                  EN COURS DE TRAITEMENT
                </div>
                
                <h2 style={{ fontSize: '60px', margin: '0 0 10px 0', color: '#fff' }}>{currentTicket.ticketNumber}</h2>
                <p style={{ fontSize: '20px', color: '#a29bfe', margin: '0 0 40px 0' }}>Client #{currentTicket.userId?.substring(0, 8) || 'Anonyme'}</p>
                
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                  <button 
                    onClick={handleCancel}
                    disabled={loading}
                    style={{
                      padding: '15px 30px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
                      background: 'rgba(255, 71, 87, 0.1)', color: '#ff4757', border: '1px solid rgba(255, 71, 87, 0.3)', cursor: 'pointer'
                    }}
                  >
                    Absent / Annuler
                  </button>
                  <button 
                    onClick={handleValidate}
                    disabled={loading}
                    style={{
                      padding: '15px 40px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
                      background: '#00b894', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 8px 15px rgba(0, 184, 148, 0.3)'
                    }}
                  >
                    ✅ Valider & Terminer
                  </button>
                </div>
                
                <div style={{ marginTop: '30px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                  <button style={{ background: 'transparent', border: '1px solid #6c5ce7', color: '#6c5ce7', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>
                    📷 Scanner QR Code
                  </button>
                </div>
              </div>
            )}
            
          </div>

          {/* ── Liste d'attente ── */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '18px', color: '#fff', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
              <span>Prochains clients</span>
              <span style={{ background: '#6c5ce7', color: '#fff', padding: '2px 10px', borderRadius: '12px', fontSize: '14px' }}>
                {waitingTickets.length}
              </span>
            </h2>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {waitingTickets.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                  La file est vide.
                </div>
              ) : (
                waitingTickets.map((t, index) => (
                  <div key={t.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '15px', background: index === 0 ? 'rgba(108, 92, 231, 0.1)' : 'rgba(255,255,255,0.03)',
                    border: index === 0 ? '1px solid rgba(108, 92, 231, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: index === 0 ? '#a29bfe' : '#fff' }}>
                        {t.ticketNumber}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Pos: #{t.position}
                      </div>
                    </div>
                    {index === 0 && (
                      <span style={{ fontSize: '12px', color: '#6c5ce7', fontWeight: 'bold' }}>Suivant 👉</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
