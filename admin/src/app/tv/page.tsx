'use client';

import { useState, useEffect } from 'react';
import { queuesApi } from '@/lib/api';
import { io, Socket } from 'socket.io-client';

export default function TvDisplayPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [calledTickets, setCalledTickets] = useState<any[]>([]);
  const [currentWaitTime, setCurrentWaitTime] = useState<number>(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    // We fetch queues without token because TV display might be a public screen,
    // but in our current API queuesApi.getAll requires token.
    // For simplicity, we just fetch with an empty token or we can ask the user to select.
    // Actually, we can get token from local storage if logged in as admin/agent.
    const token = localStorage.getItem('access_token') || '';
    if (token) {
      queuesApi.getAll(token).then((res) => {
        setQueues(res.data);
        if (res.data.length > 0) setSelectedQueue(res.data[0].id);
      }).catch(console.error);
    }
  }, []);

  useEffect(() => {
    if (!selectedQueue) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const baseUrl = API_URL.replace('/api/v1', '');
    
    const newSocket = io(baseUrl, {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('TV Connected to WebSocket');
      // Temporarily use queueId as entityId if needed, but the event is join:display
      newSocket.emit('join:display', { entityId: selectedQueue });
    });

    newSocket.on('display:updated', (data: any) => {
      console.log('Display Updated:', data);
      if (data.calledTickets && data.calledTickets.length > 0) {
        setCalledTickets(data.calledTickets);
        setFlash(true);
        // Play a sound
        try {
          const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
          audio.play().catch(() => {});
        } catch (e) {}

        setTimeout(() => setFlash(false), 3000);
      }
      if (data.currentWaitTime !== undefined) {
        setCurrentWaitTime(data.currentWaitTime);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [selectedQueue]);

  if (!selectedQueue) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f13', color: 'white' }}>
        <h1 style={{ marginBottom: 20 }}>Configuration de l'Écran Salle</h1>
        <select 
          className="input" 
          value={selectedQueue} 
          onChange={(e) => setSelectedQueue(e.target.value)}
          style={{ width: 300, background: '#1e1e2d', color: 'white', padding: 15, borderRadius: 8, border: '1px solid #333' }}
        >
          <option value="">Sélectionner une file...</option>
          {queues.map(q => (
            <option key={q.id} value={q.id}>{q.name}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      background: flash ? '#6c5ce7' : '#0f0f13', 
      transition: 'background 0.5s ease',
      color: 'white', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ position: 'absolute', top: 30, left: 30, display: 'flex', alignItems: 'center', gap: 15 }}>
        <div style={{ width: 50, height: 50, background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 'bold' }}>
          Q
        </div>
        <h2 style={{ margin: 0, fontSize: '1.5rem', opacity: 0.8 }}>QueuePay - Affichage Salle</h2>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '3rem', margin: 0, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 2 }}>
          {flash ? 'Veuillez vous présenter' : 'Derniers numéros appelés'}
        </h3>
        
        {calledTickets.length > 0 ? (
          <div>
            <div style={{ 
              fontSize: '10rem', 
              fontWeight: 900, 
              margin: '20px 0', 
              lineHeight: 1,
              textShadow: flash ? '0 0 50px rgba(255,255,255,0.5)' : 'none',
              color: flash ? '#fff' : '#6c5ce7'
            }}>
              {calledTickets[0].ticketNumber}
            </div>
            <div style={{ fontSize: '2rem', opacity: 0.8, background: 'rgba(255,255,255,0.1)', padding: '10px 30px', borderRadius: 50, display: 'inline-block', marginBottom: '40px' }}>
              Guichet {calledTickets[0].counterNumber || 1} • Appelé à {new Date(calledTickets[0].calledAt || Date.now()).toLocaleTimeString()}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '10rem', fontWeight: 900, margin: '20px 0', color: '#6c5ce7', opacity: 0.5 }}>---</div>
        )}
        
        {calledTickets.length > 1 && (
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px' }}>
            {calledTickets.slice(1, 4).map((t, i) => (
              <div key={i} style={{ background: '#1e1e2d', padding: '15px 30px', borderRadius: '15px', border: '1px solid #333' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#a29bfe' }}>{t.ticketNumber}</div>
                <div style={{ opacity: 0.6 }}>Guichet {t.counterNumber || 1}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', bottom: 30, left: 30, opacity: 0.8, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00b894' }}></div>
        Temps d'attente estimé : {currentWaitTime > 0 ? `${currentWaitTime} min` : 'Calcul...'}
      </div>

      <div style={{ position: 'absolute', bottom: 30, right: 30, opacity: 0.5, fontSize: '1.2rem' }}>
        Veuillez patienter que votre numéro soit affiché à l'écran.
      </div>
    </div>
  );
}
