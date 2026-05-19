'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { queuesApi, entitiesApi } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

export default function TVDisplay() {
  const { user, token } = useAuth();
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [latestCall, setLatestCall] = useState<any | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  
  const [socket, setSocket] = useState<Socket | null>(null);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Charger les entités pour sélectionner l'écran TV
  useEffect(() => {
    if (token) {
      loadEntities();
    }
  }, [token]);

  const loadEntities = async () => {
    try {
      const res = await entitiesApi.getAll(token!);
      setEntities(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // Gestion WebSocket
  useEffect(() => {
    if (!selectedEntity || !token) return;

    const socketUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:3001';
    const newSocket = io(socketUrl, { auth: { token } });

    newSocket.on('connect', () => {
      newSocket.emit('join:display', { entityId: selectedEntity });
    });

    newSocket.on('ticket_status_changed', (data: any) => {
      if (data.status === 'called') {
        handleNewCall(data);
      }
    });

    setSocket(newSocket);

    // Initialiser les appels actifs (simulation fetch)
    fetchActiveCalls(selectedEntity);

    return () => {
      newSocket.disconnect();
    };
  }, [selectedEntity, token]);

  const fetchActiveCalls = async (entityId: string) => {
    // Dans une implémentation complète, on ferait un GET /tickets?entityId=...&status=called
    // Pour l'instant on garde le tableau local vide au démarrage
  };

  const handleNewCall = (ticket: any) => {
    setLatestCall(ticket);
    setActiveCalls(prev => [ticket, ...prev.filter(t => t.id !== ticket.id)].slice(0, 5));
    
    // Effet visuel clignotant
    setIsBlinking(true);
    setTimeout(() => setIsBlinking(false), 5000);

    // Annonce sonore (Synthèse vocale)
    if (synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(`Ticket ${ticket.ticketNumber}, au guichet.`);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      synthRef.current.speak(utterance);
    }
  };

  if (!selectedEntity) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#fff' }}>
        <div className="glass-card" style={{ padding: '40px', width: '400px', textAlign: 'center' }}>
          <h2>Configuration Écran TV</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Sélectionnez l'entité à afficher sur cet écran</p>
          <select 
            className="input" 
            value={selectedEntity} 
            onChange={(e) => setSelectedEntity(e.target.value)}
            style={{ width: '100%', padding: '15px', background: 'rgba(0,0,0,0.5)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
          >
            <option value="">-- Choisir une entité --</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: isBlinking ? '#2d0a0a' : '#0a0a0f', 
      color: '#fff', 
      display: 'flex', 
      flexDirection: 'column',
      transition: 'background 0.5s ease',
      padding: '2vw'
    }}>
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid rgba(255,255,255,0.1)', paddingBottom: '20px', marginBottom: '30px' }}>
        <div style={{ fontSize: '2.5vw', fontWeight: 'bold' }}>
          Queue<span style={{ color: '#00b894' }}>Pay</span>
        </div>
        <div style={{ fontSize: '2vw', color: '#a0a0b0' }}>
          {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div style={{ display: 'flex', flex: 1, gap: '30px' }}>
        
        {/* DERNIER APPEL (GRAND ECRAN) */}
        <div style={{ 
          flex: 2, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: isBlinking ? 'rgba(255, 71, 87, 0.2)' : 'rgba(255,255,255,0.02)',
          border: isBlinking ? '4px solid #ff4757' : '1px solid rgba(255,255,255,0.05)',
          borderRadius: '30px',
          boxShadow: isBlinking ? '0 0 50px rgba(255, 71, 87, 0.5)' : 'none',
          animation: isBlinking ? 'pulse 1s infinite' : 'none'
        }}>
          {latestCall ? (
            <>
              <div style={{ fontSize: '3vw', color: '#a0a0b0', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '5px' }}>
                Numéro appelé
              </div>
              <div style={{ fontSize: '15vw', fontWeight: '900', lineHeight: '1', color: isBlinking ? '#ff4757' : '#fff', textShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                {latestCall.ticketNumber}
              </div>
              <div style={{ fontSize: '4vw', color: '#00b894', marginTop: '20px', fontWeight: 'bold' }}>
                Aller au Guichet
              </div>
            </>
          ) : (
            <div style={{ fontSize: '4vw', color: 'rgba(255,255,255,0.2)' }}>
              En attente d'appels...
            </div>
          )}
        </div>

        {/* HISTORIQUE DES APPELS (BARRE LATÉRALE) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)', borderRadius: '30px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '2vw', marginBottom: '20px', color: '#a0a0b0', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' }}>
            Précédents appels
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {activeCalls.slice(1).map((call, idx) => (
              <div key={call.id} style={{ 
                background: 'rgba(255,255,255,0.05)', 
                padding: '20px', 
                borderRadius: '15px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '2vw',
                fontWeight: 'bold'
              }}>
                <span style={{ color: '#fff' }}>{call.ticketNumber}</span>
                <span style={{ color: '#6c5ce7', fontSize: '1.5vw' }}>Guichet</span>
              </div>
            ))}
            
            {activeCalls.length <= 1 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: '50px', fontSize: '1.5vw' }}>
                Aucun historique
              </div>
            )}
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}} />
    </div>
  );
}
