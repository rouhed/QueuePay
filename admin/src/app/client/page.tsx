'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { entitiesApi, queuesApi, ticketsApi, paymentsApi } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

export default function ClientPortal() {
  const { user, token, login } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  const [entities, setEntities] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'mytickets'>('mytickets');

  // WebSocket
  const [socket, setSocket] = useState<Socket | null>(null);

  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      const entRes = await entitiesApi.getAll(token);
      setEntities(entRes.data);
      
      const qRes = await queuesApi.getAll(token);
      setQueues(qRes.data);
      
      const tRes = await ticketsApi.getAll(token);
      setMyTickets(tRes.data.filter((t: any) => t.userId === user?.id));
    } catch (e) {
      console.error(e);
    }
  }, [token, user?.id]);

  useEffect(() => {
    if (token) {
      loadData();
      
      // Initialize WebSocket connection
      const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
      const newSocket = io(socketUrl, {
        auth: { token }
      });
      
      newSocket.on('connect', () => {
        console.log('Connecté au serveur en temps réel');
      });

      newSocket.on('ticket_status_changed', (data) => {
        // Mettre à jour la liste des tickets si l'un d'eux change de statut
        setMyTickets(prev => prev.map(t => 
          t.id === data.ticketId ? { ...t, status: data.newStatus } : t
        ));
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token, loadData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeTicket = async () => {
    if (!selectedQueue || !token) return;
    setLoading(true);
    try {
      const queueDetails = queues.find(q => q.id === selectedQueue);
      const isPaid = queueDetails?.isPaid;
      
      if (isPaid) {
        // Logique de paiement initiée
        const paymentRes = await paymentsApi.initiate({
          provider: 'mvola', // Par défaut pour l'exemple
          purpose: 'ticket_purchase',
          amount: queueDetails.price,
          phoneNumber: user?.phone || '0340000000', // À remplacer par un formulaire dynamique
          description: `Achat ticket pour ${queueDetails.name}`
        }, token);
        alert(`Paiement initié. Veuillez confirmer sur votre mobile.\nRéférence: ${paymentRes.data.reference}`);
        // Normalement, on attend le webhook pour générer le ticket
      } else {
        await ticketsApi.create({
          queueId: selectedQueue,
          paymentMethod: 'free'
        }, token);
        alert('Ticket réservé avec succès !');
        setActiveTab('mytickets');
        loadData();
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
      setSelectedQueue('');
    }
  };

  const handleDownloadPdf = async (ticketId: string) => {
    // Simulation: Normalement un endpoint backend génère ce PDF pour le ticket spécifique
    alert('Téléchargement du ticket PDF (Fonctionnalité en cours d\'intégration API)...');
  };

  if (!user) {
    return (
      <div className="login-container" style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh'
      }}>
        <div style={{
          background: 'rgba(26, 26, 46, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '40px',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#fff', fontSize: '24px', fontWeight: '600' }}>
            Connexion <span style={{ color: '#00b894' }}>Client</span>
          </h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#a0a0b0', fontSize: '14px' }}>Email ou Téléphone</label>
              <input 
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none', transition: 'border-color 0.3s'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#a0a0b0', fontSize: '14px' }}>Mot de passe</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none', transition: 'border-color 0.3s'
                }}
              />
            </div>
            <button type="submit" disabled={loading} style={{
              background: 'linear-gradient(135deg, #6c5ce7, #00b894)',
              color: '#fff', border: 'none', padding: '14px', borderRadius: '12px',
              fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px', opacity: loading ? 0.7 : 1, transition: 'transform 0.2s'
            }}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredEntities = entities.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    e.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableQueues = selectedEntity ? queues.filter(q => q.entityId === selectedEntity.id) : [];

  return (
    <div style={{ paddingBottom: '100px' }}>
      
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <button 
          onClick={() => setActiveTab('mytickets')}
          style={{
            flex: 1, padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
            background: activeTab === 'mytickets' ? 'linear-gradient(135deg, #6c5ce7, #00b894)' : 'rgba(255,255,255,0.05)',
            border: activeTab === 'mytickets' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            color: activeTab === 'mytickets' ? '#fff' : '#a0a0b0',
            cursor: 'pointer', transition: 'all 0.3s'
          }}>
          Mes Tickets
        </button>
        <button 
          onClick={() => setActiveTab('new')}
          style={{
            flex: 1, padding: '15px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold',
            background: activeTab === 'new' ? 'linear-gradient(135deg, #6c5ce7, #00b894)' : 'rgba(255,255,255,0.05)',
            border: activeTab === 'new' ? 'none' : '1px solid rgba(255,255,255,0.1)',
            color: activeTab === 'new' ? '#fff' : '#a0a0b0',
            cursor: 'pointer', transition: 'all 0.3s'
          }}>
          Prendre un Ticket
        </button>
      </div>

      {activeTab === 'mytickets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#fff' }}>Mes Tickets Actifs</h2>
          {myTickets.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)',
              padding: '40px', borderRadius: '20px', textAlign: 'center', color: '#a0a0b0'
            }}>
              Vous n'avez aucun ticket actif pour le moment.<br/>
              <button 
                onClick={() => setActiveTab('new')}
                style={{
                  background: 'transparent', border: '1px solid #00b894', color: '#00b894',
                  padding: '8px 16px', borderRadius: '8px', marginTop: '15px', cursor: 'pointer'
                }}>
                Nouveau Ticket
              </button>
            </div>
          ) : (
            myTickets.map(t => (
              <div key={t.id} style={{
                background: 'rgba(26, 26, 46, 0.6)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '15px',
                boxShadow: t.status === 'called' ? '0 0 20px rgba(0, 184, 148, 0.3)' : 'none'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#a0a0b0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                      {t.queue?.entity?.name || 'Entité'}
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fff' }}>
                      {t.ticketNumber}
                    </div>
                    <div style={{ fontSize: '16px', color: '#a29bfe' }}>
                      {t.queue?.name || 'Service'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-block', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
                      background: t.status === 'called' ? 'rgba(0, 184, 148, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: t.status === 'called' ? '#00b894' : '#fff'
                    }}>
                      {t.status.toUpperCase()}
                    </div>
                    {t.status === 'in_queue' && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#a0a0b0' }}>Position estimée</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff' }}>#{t.position || '?'}</div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleDownloadPdf(t.id)}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff', padding: '10px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s'
                    }}>
                    Télécharger PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'new' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {!selectedEntity ? (
            <>
              <h2 style={{ fontSize: '22px', fontWeight: '600', color: '#fff' }}>Choisissez un Établissement</h2>
              
              <input 
                type="text"
                placeholder="Rechercher une banque, un hôpital..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '15px', borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', outline: 'none', fontSize: '16px'
                }}
              />

              <div style={{ display: 'grid', gap: '15px' }}>
                {filteredEntities.map(entity => (
                  <div key={entity.id} onClick={() => setSelectedEntity(entity)} style={{
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                    padding: '20px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s'
                  }} className="entity-card">
                    <h3 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#fff' }}>{entity.name}</h3>
                    <p style={{ color: '#a0a0b0', margin: 0, fontSize: '14px' }}>{entity.address || 'Adresse non spécifiée'}</p>
                    <p style={{ color: '#6c5ce7', margin: '10px 0 0 0', fontSize: '12px', fontWeight: 'bold' }}>
                      {queues.filter(q => q.entityId === entity.id).length} services disponibles
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{
              background: 'rgba(26, 26, 46, 0.6)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '25px'
            }}>
              <button 
                onClick={() => { setSelectedEntity(null); setSelectedQueue(''); }}
                style={{
                  background: 'transparent', border: 'none', color: '#a0a0b0', cursor: 'pointer',
                  padding: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '5px'
                }}>
                ← Retour aux établissements
              </button>

              <h2 style={{ fontSize: '24px', margin: '0 0 5px 0', color: '#fff' }}>{selectedEntity.name}</h2>
              <p style={{ color: '#a0a0b0', margin: '0 0 25px 0' }}>Sélectionnez le service souhaité</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {availableQueues.map(queue => (
                  <div 
                    key={queue.id} 
                    onClick={() => setSelectedQueue(queue.id)}
                    style={{
                      padding: '20px', borderRadius: '16px', cursor: 'pointer',
                      border: selectedQueue === queue.id ? '2px solid #00b894' : '1px solid rgba(255,255,255,0.1)',
                      background: selectedQueue === queue.id ? 'rgba(0, 184, 148, 0.05)' : 'rgba(0,0,0,0.2)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>{queue.name}</h4>
                      {queue.isPaid && (
                        <span style={{ 
                          display: 'inline-block', marginTop: '8px', padding: '4px 8px', borderRadius: '8px', 
                          background: 'rgba(255, 171, 0, 0.2)', color: '#ffab00', fontSize: '12px', fontWeight: 'bold' 
                        }}>
                          Payant : {queue.price} Ar
                        </span>
                      )}
                    </div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid', borderColor: selectedQueue === queue.id ? '#00b894' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedQueue === queue.id && <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#00b894' }} />}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="btn-take-ticket"
                disabled={!selectedQueue || loading}
                onClick={handleTakeTicket}
                style={{
                  width: '100%', padding: '18px', borderRadius: '16px', fontSize: '18px', fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #6c5ce7, #00b894)', color: '#fff', border: 'none',
                  marginTop: '30px', cursor: (!selectedQueue || loading) ? 'not-allowed' : 'pointer',
                  opacity: (!selectedQueue || loading) ? 0.5 : 1, transition: 'all 0.3s',
                  boxShadow: (!selectedQueue || loading) ? 'none' : '0 10px 20px rgba(0, 184, 148, 0.3)'
                }}
              >
                {loading ? 'Traitement...' : 'Confirmer et Prendre mon Ticket'}
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .entity-card:hover {
          background: rgba(255,255,255,0.08) !important;
          transform: translateY(-2px);
        }
        .btn-take-ticket:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 25px rgba(0, 184, 148, 0.4) !important;
        }
      `}</style>
    </div>
  );
}
