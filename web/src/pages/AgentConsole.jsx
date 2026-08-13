import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { 
  User, 
  LogOut, 
  Monitor, 
  Tv, 
  CheckCircle, 
  AlertTriangle, 
  QrCode, 
  RefreshCw, 
  Play, 
  CheckSquare, 
  XSquare, 
  Clock,
  Layers,
  ArrowRight,
  Sparkles,
  History,
  UserX,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Search,
  Filter,
  Trash2,
  X,
  AlertOctagon
} from 'lucide-react';
import QueuePayLogo from '../components/QueuePayLogo';
import { triggerNotification } from '../components/DynamicIslandNotification';

import { API_BASE_URL } from '../config/api';

export default function AgentConsole({ user, handleLogout }) {
  const [boundDesk, setBoundDesk] = useState(null);
  const [queue, setQueue] = useState([]);
  const [absentTickets, setAbsentTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  
  // Navigation tabs: 'active', 'future', 'absent', 'history'
  const [activeSubTab, setActiveSubTab] = useState('active');

  // Verification states
  const [verifyCode, setVerifyCode] = useState('');
  const [verifiedTicket, setVerifiedTicket] = useState(null);
  const [verifiedTicketsMap, setVerifiedTicketsMap] = useState({});
  const [verifyError, setVerifyError] = useState('');

  // Early Call Confirmation Modal candidate
  const [earlyCallCandidate, setEarlyCallCandidate] = useState(null);

  // Search & Filter & Calendar Date states for Tabs
  const [absentSearch, setAbsentSearch] = useState('');
  const [absentSort, setAbsentSort] = useState('newest');
  const [absentDateFilter, setAbsentDateFilter] = useState('');

  const [futureSearch, setFutureSearch] = useState('');
  const [futureSort, setFutureSort] = useState('date_asc');
  const [futureDateFilter, setFutureDateFilter] = useState('');

  const [historySearch, setHistorySearch] = useState('');
  const [historySort, setHistorySort] = useState('newest');
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  const headers = { Authorization: `Bearer ${sessionStorage.getItem('token')}` };

  const getFormattedDateStr = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
      const match = dateVal.match(/^(\d{4}-\d{2}-\d{2})/);
      if (match) return match[1];
    }
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  const isToday = (dateString) => {
    if (!dateString) return false;
    const todayStr = new Date().toLocaleDateString('en-CA');
    const targetStr = new Date(dateString).toLocaleDateString('en-CA');
    return todayStr === targetStr;
  };

  const fetchAssignedDesk = () => {
    fetch(`${API_BASE_URL}/agent/assigned-desk`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.desk) {
          setBoundDesk(data.desk);
          fetchQueue();
        } else {
          setBoundDesk(null);
          setLoading(false);
        }
      })
      .catch(() => {
        setBoundDesk(null);
        setLoading(false);
      });
  };

  const fetchQueue = () => {
    // Regular queue
    fetch(`${API_BASE_URL}/agent/queue`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.queue) {
          setQueue(data.queue);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    // Absent list
    fetch(`${API_BASE_URL}/agent/absent-tickets`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.tickets) {
          setAbsentTickets(data.tickets);
        }
      })
      .catch(err => console.error('Error fetching absent tickets:', err));
  };

  useEffect(() => {
    fetchAssignedDesk();
  }, []);

  // Connect WebSockets for real-time queue synchronization
  useEffect(() => {
    const entityId = user?.entity_id || boundDesk?.entity_id;
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Agent Console WS Connected successfully!');
      if (entityId) {
        newSocket.emit('joinEntity', entityId);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, boundDesk?.entity_id]);

  // Listen to WebSocket broadcasts to auto-refresh queue & entity updates
  useEffect(() => {
    if (socket) {
      const handleUpdate = () => {
        console.log('WS Event received, refreshing agent console queue...');
        fetchQueue();
      };

      socket.on('queueUpdate', handleUpdate);
      socket.on('entityUpdate', handleUpdate);

      // Polling fallback to guarantee 100% freshness
      const interval = setInterval(() => {
        fetchQueue();
      }, 8000);

      return () => {
        socket.off('queueUpdate', handleUpdate);
        socket.off('entityUpdate', handleUpdate);
        clearInterval(interval);
      };
    }
  }, [socket, boundDesk]);

  const handleCallNext = () => {
    const pendingList = queue.filter(t => t.status === 'PENDING' && isToday(t.booking_date));
    if (pendingList.length === 0) {
      triggerNotification('Aucun client en attente.', 'warning');
      return;
    }
    const candidate = pendingList[0];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    if (candidate.time_slot) {
      const parts = candidate.time_slot.split(':').map(Number);
      const slotMinutes = parts[0] * 60 + (parts[1] || 0);

      // If scheduled time slot is in the future today (more than 5 minutes)
      if (slotMinutes > currentMinutes + 5) {
        setEarlyCallCandidate(candidate);
        return;
      }
    }
    executeCallNext();
  };

  const executeCallNext = () => {
    setEarlyCallCandidate(null);
    fetch(`${API_BASE_URL}/agent/call-next`, {
      method: 'POST',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (data.ticket) {
          triggerNotification(`Appel du ticket N°${data.ticket.ticket_number} en cours...`, 'success');
          announceTicketCall(data.ticket.ticket_number, data.ticket.service_name, boundDesk?.name || 'le guichet');
          fetchQueue();
        } else {
          triggerNotification(data.message || 'Aucun client en attente.', 'warning');
        }
      });
  };

  const handleComplete = (ticketId) => {
    fetch(`${API_BASE_URL}/agent/complete/${ticketId}`, {
      method: 'POST',
      headers
    })
      .then(res => res.json())
      .then(data => {
        triggerNotification('Ticket traité avec succès !', 'success');
        fetchQueue();
      });
  };

  const handleSkip = (ticketId) => {
    fetch(`${API_BASE_URL}/agent/skip/${ticketId}`, {
      method: 'POST',
      headers
    })
      .then(res => res.json())
      .then(data => {
        triggerNotification('Client marqué comme absent.', 'warning');
        fetchQueue();
      });
  };

  const handleReactivate = (ticketId) => {
    fetch(`${API_BASE_URL}/agent/reactivate/${ticketId}`, {
      method: 'POST',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          triggerNotification('Le client est de retour. Ticket remis en attente.', 'success');
          fetchQueue();
        } else {
          triggerNotification(data.error, 'warning');
        }
      });
  };

  const handleDeleteAbsent = (ticketId) => {
    if (!window.confirm("Voulez-vous supprimer ce ticket absent définitivement ?")) return;
    fetch(`${API_BASE_URL}/agent/delete-absent/${ticketId}`, {
      method: 'POST',
      headers
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          triggerNotification('Ticket absent annulé définitivement.', 'info');
          fetchQueue();
        } else {
          triggerNotification(data.error, 'warning');
        }
      });
  };

  const handleVerifyTicket = (e) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    setVerifyError('');
    setVerifiedTicket(null);

    fetch(`${API_BASE_URL}/agent/verify-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ token_or_number: verifyCode, mark_completed: false })
    })
      .then(res => res.json())
      .then(data => {
        if (data.ticket) {
          setVerifiedTicket(data.ticket);
          setVerifiedTicketsMap(prev => ({ ...prev, [data.ticket.id]: true }));
          triggerNotification(`✅ Ticket N°${data.ticket.ticket_number} (Client: ${data.ticket.client_name}) vérifié avec succès ! Les boutons de traitement sont débloqués.`, 'success');
          setVerifyCode('');
          fetchQueue();
        } else {
          setVerifyError(data.error || 'Aucun ticket correspondant');
        }
      })
      .catch(() => setVerifyError('Erreur de validation'));
  };

  const announceTicketCall = (num, service, deskName) => {
    if ('speechSynthesis' in window) {
      if (window.playQueueChime) window.playQueueChime();

      setTimeout(() => {
        const text = `C'est le tour du numéro ${num.replace(/^0+/, '')} maintenant, veuillez passer au guichet de ${service}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        
        const voices = window.speechSynthesis.getVoices();
        const frenchVoice = voices.find(v => v.lang.startsWith('fr') && v.name.toLowerCase().includes('female')) 
          || voices.find(v => v.lang.startsWith('fr'));
        if (frenchVoice) {
          utterance.voice = frenchVoice;
        }

        utterance.rate = 0.9;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      }, 950);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--cream-bg)' }}>
        Chargement de la console agent...
      </div>
    );
  }

  if (!boundDesk) {
    return (
      <div className="entity-onboarding-bg animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="glass-panel" style={{ padding: '40px', width: '450px', background: '#FFFDFB', textAlign: 'center' }}>
          <header style={{ textAlign: 'center', marginBottom: '24px' }}>
            <QueuePayLogo height={32} showText={false} />
            <h2 style={{ marginTop: '16px', color: 'var(--danger)', fontWeight: '800' }}>Accès Non Assigné</h2>
            <p style={{ fontSize: '13px', color: 'var(--espresso-muted)', marginTop: '8px' }}>
              Vous n'êtes pas affecté à un guichet physique pour le moment.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginTop: '4px' }}>
              Veuillez demander à l'administrateur de votre entreprise de vous assigner un guichet dans sa console de gestion.
            </p>
          </header>

          <button className="btn-primary" style={{ width: '100%', background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleLogout}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </div>
    );
  }

  // Filter queues
  const pendingTickets = queue.filter(t => t.status === 'PENDING' && isToday(t.booking_date));
  const callingTickets = queue.filter(t => t.status === 'CALLING');
  const rawFutureTickets = queue.filter(t => t.status === 'PENDING' && !isToday(t.booking_date));
  const rawCompletedTickets = queue.filter(t => t.status === 'COMPLETED');

  // Filtered & Sorted Lists with Calendar Date Filtering
  const filteredAbsentTickets = absentTickets
    .filter(t => {
      const q = absentSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
        (t.client_name && t.client_name.toLowerCase().includes(q)) ||
        (t.service_name && t.service_name.toLowerCase().includes(q)) ||
        (t.client_email && t.client_email.toLowerCase().includes(q))
      );
      const ticketDate = getFormattedDateStr(t.booking_date || t.created_at);
      const matchesDate = !absentDateFilter || ticketDate === absentDateFilter;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (absentSort === 'newest') return new Date(b.booking_date || b.created_at) - new Date(a.booking_date || a.created_at);
      if (absentSort === 'oldest') return new Date(a.booking_date || a.created_at) - new Date(b.booking_date || b.created_at);
      return 0;
    });

  const filteredFutureTickets = rawFutureTickets
    .filter(t => {
      const q = futureSearch.toLowerCase().trim();
      const matchesSearch = !q || (
        (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
        (t.client_name && t.client_name.toLowerCase().includes(q)) ||
        (t.service_name && t.service_name.toLowerCase().includes(q))
      );
      const ticketDate = getFormattedDateStr(t.booking_date);
      const matchesDate = !futureDateFilter || ticketDate === futureDateFilter;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (futureSort === 'date_asc') return new Date(a.booking_date) - new Date(b.booking_date);
      if (futureSort === 'date_desc') return new Date(b.booking_date) - new Date(a.booking_date);
      return 0;
    });

  const filteredCompletedTickets = rawCompletedTickets
    .filter(t => {
      const q = historySearch.toLowerCase().trim();
      const matchesSearch = !q || (
        (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
        (t.client_name && t.client_name.toLowerCase().includes(q)) ||
        (t.service_name && t.service_name.toLowerCase().includes(q))
      );
      const ticketDate = getFormattedDateStr(t.completed_at || t.booking_date);
      const matchesDate = !historyDateFilter || ticketDate === historyDateFilter;
      return matchesSearch && matchesDate;
    })
    .sort((a, b) => {
      if (historySort === 'newest') return new Date(b.completed_at || b.booking_date) - new Date(a.completed_at || a.booking_date);
      if (historySort === 'oldest') return new Date(a.completed_at || a.booking_date) - new Date(b.completed_at || b.booking_date);
      return 0;
    });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream-bg)' }}>
      
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar" style={{ width: '280px', padding: '32px 24px', display: 'flex', flexDirection: 'column', background: '#FFFDFB', borderRight: '1px solid var(--champagne)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
          <QueuePayLogo height={32} />
          <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            AGENT
          </span>
        </div>

        {/* Bound Desk Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--cream-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--champagne)', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
            🖥️
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--espresso)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {boundDesk.name}
            </h4>
            <span style={{ fontSize: '10px', color: 'var(--espresso-muted)', display: 'block', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              Service : {boundDesk.service_name}
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            className={`admin-nav-btn ${activeSubTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('active')}
          >
            <Monitor size={18} /> File Active (Aujourd'hui)
          </button>
          
          <button 
            className={`admin-nav-btn ${activeSubTab === 'absent' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('absent')}
          >
            <UserX size={18} /> Clients Absents ({absentTickets.length})
          </button>

          <button 
            className={`admin-nav-btn ${activeSubTab === 'future' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('future')}
          >
            <Calendar size={18} /> Plannings Futurs ({rawFutureTickets.length})
          </button>

          <button 
            className={`admin-nav-btn ${activeSubTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('history')}
          >
            <History size={18} /> Historique ({rawCompletedTickets.length})
          </button>

          {/* Quick TV Link */}
          <button 
            className="admin-nav-btn" 
            style={{ color: 'var(--saffron)', marginTop: '24px', background: 'rgba(249,115,22,0.05)', border: '1px dashed rgba(249,115,22,0.2)' }}
            onClick={() => window.open(`/tv?entityId=${user.entity_id}`, '_blank')}
          >
            <Tv size={18} /> Écran TV en direct
          </button>
        </nav>

        {/* Red Logout Button */}
        <button 
          className="admin-nav-btn" 
          style={{ color: 'var(--danger)', marginTop: 'auto', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)' }}
          onClick={handleLogout}
        >
          <LogOut size={18} /> Déconnexion
        </button>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto', maxHeight: '100vh', boxSizing: 'border-box' }}>
        
        {/* Top welcome banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--saffron)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {activeSubTab === 'active' && "Gérer mon service"}
              {activeSubTab === 'absent' && "Gestion Globale des Absents"}
              {activeSubTab === 'future' && "Planifications futures"}
              {activeSubTab === 'history' && "Historique des traitements"}
            </span>
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--espresso)', letterSpacing: '-0.75px', marginTop: '4px' }}>
              Bonjour, {user.name} 👋
            </h1>
          </div>
          
          <button 
            className="btn-secondary" 
            onClick={fetchQueue}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px' }}
          >
            <RefreshCw size={14} /> Rafraîchir
          </button>
        </div>

        {/* ========================================== */}
        {/* TAB 1: FILE ACTIVE (Aujourd'hui) */}
        {/* ========================================== */}
        {activeSubTab === 'active' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Side: Validation & Current calling ticket */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Validation Box */}
              <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: '800' }}>Validation Ticket</h3>
                <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginBottom: '16px' }}>
                  Saisissez le numéro de ticket ou scannez le QR code.
                </p>

                <form onSubmit={handleVerifyTicket} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="ex: 002 ou jeton QR" 
                    value={verifyCode} 
                    onChange={e => setVerifyCode(e.target.value)} 
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '12px', flexShrink: 0 }}>
                    <QrCode size={16} />
                  </button>
                </form>

                {verifyError && (
                  <div style={{ fontSize: '12px', color: 'var(--danger)', padding: '10px', background: 'rgba(239,68,68,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={14} /> {verifyError}
                  </div>
                )}

                {verifiedTicket && (
                  <div className="glass-card animate-fade-in" style={{ padding: '16px', background: 'var(--cream-bg)', border: '1px solid var(--champagne)', marginTop: '8px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px' }}>Ticket Identifié</h4>
                    <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      <div>Client : <strong>{verifiedTicket.client_name}</strong></div>
                      <div>Service : <strong>{verifiedTicket.service_name}</strong></div>
                      <div>Statut : 
                        <strong style={{ marginLeft: '6px', color: verifiedTicket.status === 'COMPLETED' ? 'var(--success)' : verifiedTicket.status === 'CALLING' ? 'var(--saffron)' : 'var(--warning)' }}>
                          {verifiedTicket.status}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Ticket Panel */}
              <div className="glass-panel" style={{ padding: '24px', minHeight: '180px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--saffron)', marginBottom: '16px' }}>Appel en cours</h3>
                
                {callingTickets.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--espresso-muted)' }}>
                    <p style={{ fontSize: '13px', margin: 0 }}>Aucun client au guichet</p>
                  </div>
                ) : (
                  callingTickets.map(t => {
                    const isVerified = verifiedTicketsMap[t.id] === true || (verifiedTicket && (verifiedTicket.id === t.id || verifiedTicket.ticket_number === t.ticket_number));
                    return (
                      <div key={t.id} className="glass-card animate-fade-in" style={{ padding: '20px', borderLeft: isVerified ? '5px solid var(--success)' : '5px solid var(--saffron)', background: '#FFFDFB', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ fontSize: '28px', color: 'var(--saffron)' }}>N° {t.ticket_number}</strong>
                            <div style={{ fontSize: '13px', color: 'var(--espresso-light)', marginTop: '2px' }}>Client : <strong>{t.client_name}</strong></div>
                          </div>
                          <span style={{ fontSize: '11px', background: isVerified ? 'rgba(16,185,129,0.1)' : 'rgba(249,115,22,0.1)', color: isVerified ? 'var(--success)' : 'var(--saffron)', padding: '6px 14px', borderRadius: '12px', fontWeight: '800' }}>
                            {isVerified ? '✓ Ticket Vérifié' : '📢 En cours d\'appel'}
                          </span>
                        </div>

                        <div style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {!isVerified ? (
                            <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px dashed var(--saffron)', padding: '12px 14px', borderRadius: '10px', fontSize: '12px', color: 'var(--saffron)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <AlertCircle size={16} /> Saisissez le N° {t.ticket_number} ou scannez son QR code pour débloquer "Terminer & Passer".
                            </div>
                          ) : (
                            <div style={{ background: 'rgba(16,185,129,0.08)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.2)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <ShieldCheck size={16} /> Identité confirmée — Bouton "Terminer & Passer" débloqué !
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div style={{ display: 'flex', gap: '10px' }}>
                            {isVerified && (
                              <button 
                                className="btn-primary animate-fade-in" 
                                style={{ padding: '12px 16px', fontSize: '13px', flex: 1.5, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--success)', borderColor: 'var(--success)' }}
                                onClick={() => {
                                  handleComplete(t.id);
                                  setVerifiedTicket(null);
                                }}
                              >
                                <CheckSquare size={16} /> Terminer & Passer
                              </button>
                            )}

                            <button 
                              className="btn-secondary" 
                              style={{ padding: '12px 16px', fontSize: '13px', flex: isVerified ? 1 : 2, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239,68,68,0.04)' }}
                              onClick={() => {
                                handleSkip(t.id);
                                setVerifiedTicket(null);
                              }}
                            >
                              <XSquare size={16} /> Marquer Client Absent
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Right Side: Waiting queue list for today */}
            <div className="glass-panel" style={{ padding: '28px', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--champagne)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800' }}>File d'attente d'aujourd'hui</h3>
                <span style={{ fontSize: '12px', background: 'var(--champagne)', color: 'var(--espresso)', padding: '4px 12px', borderRadius: '12px', fontWeight: '800' }}>
                  {pendingTickets.length} en attente
                </span>
              </div>

              {/* Scrollable List container to prevent page deform */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {pendingTickets.map((t, idx) => (
                  <div key={t.id} className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFDFB', borderLeft: idx === 0 ? '4px solid var(--saffron)' : '3px solid var(--espresso-muted)' }}>
                    <div>
                      <strong style={{ fontSize: '16px', color: 'var(--espresso)' }}>N° {t.ticket_number}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--espresso-muted)', marginTop: '3px' }}>Client: {t.client_name}</div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--espresso-light)' }}>{t.time_slot}</span>
                  </div>
                ))}
                {pendingTickets.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--espresso-muted)', fontSize: '13px', margin: 'auto 0', padding: '40px 0' }}>
                    Aucun client en attente pour le moment.
                  </div>
                )}
              </div>

              {pendingTickets.length > 0 && callingTickets.length === 0 && (
                <button 
                  className="btn-primary animate-pulse" 
                  style={{ width: '100%', marginTop: '20px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: '800' }}
                  onClick={handleCallNext}
                >
                  <Play size={16} /> Appeler le client suivant (N° {pendingTickets[0].ticket_number})
                </button>
              )}
            </div>

          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: CLIENTS ABSENTS (PERMANENTS AVEC RECHERCHE ET TRI) */}
        {/* ========================================== */}
        {activeSubTab === 'absent' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--danger)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--danger)', margin: 0 }}>Gestion Globale des Clients Absents</h3>
                <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', margin: '4px 0 0' }}>Les absents restent conservés ici jusqu'à réactivation ou suppression.</p>
              </div>
              <span style={{ fontSize: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '4px 14px', borderRadius: '12px', fontWeight: '800' }}>
                {filteredAbsentTickets.length} / {absentTickets.length} Absents
              </span>
            </div>

            {/* Toolbar: Search, Calendar Date Picker, and Sorting */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--espresso-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rechercher par N° ticket, client, service..."
                  value={absentSearch}
                  onChange={e => setAbsentSearch(e.target.value)}
                  style={{ paddingLeft: '40px', borderRadius: '10px', height: '42px', fontSize: '13px' }}
                />
              </div>

              {/* Calendar Date Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFDFB', padding: '2px 12px', borderRadius: '10px', border: '1px solid var(--champagne)', height: '42px' }}>
                <Calendar size={16} color="var(--danger)" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--espresso-muted)' }}>Date :</span>
                <input
                  type="date"
                  value={absentDateFilter}
                  onChange={e => setAbsentDateFilter(e.target.value)}
                  style={{ height: '32px', fontSize: '12px', border: 'none', background: 'transparent', padding: '0 4px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--espresso)' }}
                />
                {absentDateFilter && (
                  <button 
                    style={{ border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                    onClick={() => setAbsentDateFilter('')}
                    title="Effacer le filtre date"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} color="var(--espresso-muted)" />
                <select
                  className="form-input"
                  value={absentSort}
                  onChange={e => setAbsentSort(e.target.value)}
                  style={{ borderRadius: '10px', height: '42px', fontSize: '13px', paddingRight: '32px' }}
                >
                  <option value="newest">Du plus récent au plus ancien</option>
                  <option value="oldest">Du plus ancien au plus récent</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {filteredAbsentTickets.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                  <UserX size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px' }}>Aucun client absent ne correspond à votre recherche.</p>
                </div>
              ) : (
                filteredAbsentTickets.map(t => (
                  <div key={t.id} className="glass-card" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFDFB', borderLeft: '4px solid var(--danger)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ fontSize: '20px', color: 'var(--danger)' }}>N° {t.ticket_number}</strong>
                        <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.08)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                          Absent du {new Date(t.booking_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--espresso)', marginTop: '4px' }}>
                        Client : <strong>{t.client_name}</strong> {t.client_phone ? `(${t.client_phone})` : ''}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--espresso-muted)', marginTop: '2px' }}>
                        Service : {t.service_name} • Créneau : {t.time_slot}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        className="btn-primary" 
                        style={{ padding: '9px 16px', fontSize: '12px', borderRadius: '8px', background: 'var(--saffron)', borderColor: 'var(--saffron)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleReactivate(t.id)}
                      >
                        <RefreshCw size={14} /> Réactiver (Marquer Présent)
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '9px 16px', fontSize: '12px', borderRadius: '8px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleDeleteAbsent(t.id)}
                      >
                        <Trash2 size={14} /> Supprimer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: PLANNINGS FUTURS (AVEC RECHERCHE ET TRI) */}
        {/* ========================================== */}
        {activeSubTab === 'future' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--champagne-dark)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Réservations Planifiées (Jours Futurs)</h3>
                <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', margin: '4px 0 0' }}>Tickets commandés pour des dates ultérieures.</p>
              </div>
              <span style={{ fontSize: '12px', background: 'var(--champagne-dark)', color: 'var(--espresso)', padding: '4px 14px', borderRadius: '12px', fontWeight: '800' }}>
                {filteredFutureTickets.length} / {rawFutureTickets.length} Réservations
              </span>
            </div>

            {/* Toolbar: Search, Calendar Date Picker, and Sorting */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--espresso-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rechercher par N° ticket, client, service..."
                  value={futureSearch}
                  onChange={e => setFutureSearch(e.target.value)}
                  style={{ paddingLeft: '40px', borderRadius: '10px', height: '42px', fontSize: '13px' }}
                />
              </div>

              {/* Calendar Date Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFDFB', padding: '2px 12px', borderRadius: '10px', border: '1px solid var(--champagne)', height: '42px' }}>
                <Calendar size={16} color="var(--saffron)" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--espresso-muted)' }}>Date :</span>
                <input
                  type="date"
                  value={futureDateFilter}
                  onChange={e => setFutureDateFilter(e.target.value)}
                  style={{ height: '32px', fontSize: '12px', border: 'none', background: 'transparent', padding: '0 4px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--espresso)' }}
                />
                {futureDateFilter && (
                  <button 
                    style={{ border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                    onClick={() => setFutureDateFilter('')}
                    title="Effacer le filtre date"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} color="var(--espresso-muted)" />
                <select
                  className="form-input"
                  value={futureSort}
                  onChange={e => setFutureSort(e.target.value)}
                  style={{ borderRadius: '10px', height: '42px', fontSize: '13px', paddingRight: '32px' }}
                >
                  <option value="date_asc">La date la plus proche</option>
                  <option value="date_desc">La date la plus éloignée</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {filteredFutureTickets.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                  <Calendar size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px' }}>Aucune planification future enregistrée.</p>
                </div>
              ) : (
                filteredFutureTickets.map(t => (
                  <div key={t.id} className="glass-card" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFDFB', opacity: 0.9, borderLeft: '4px dashed var(--saffron)' }}>
                    <div>
                      <strong style={{ fontSize: '18px', color: 'var(--espresso)' }}>N° {t.ticket_number}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginLeft: '12px' }}>Service : {t.service_name}</span>
                      <div style={{ fontSize: '12px', color: 'var(--espresso-light)', marginTop: '4px' }}>Client: <strong>{t.client_name}</strong></div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', background: 'rgba(249,115,22,0.08)', color: 'var(--saffron)', padding: '6px 14px', borderRadius: '8px' }}>
                        📅 Prévu le {new Date(t.booking_date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })} à {t.time_slot}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: HISTORIQUE (TERMINÉS AVEC RECHERCHE ET TRI) */}
        {/* ========================================== */}
        {activeSubTab === 'history' && (
          <div className="glass-panel" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid var(--success)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)', margin: 0 }}>Historique Général des Traitements</h3>
                <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', margin: '4px 0 0' }}>Liste complète des tickets validés et clôturés au guichet.</p>
              </div>
              <span style={{ fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 14px', borderRadius: '12px', fontWeight: '800' }}>
                {filteredCompletedTickets.length} / {rawCompletedTickets.length} Terminés
              </span>
            </div>

            {/* Toolbar: Search, Calendar Date Picker, and Sorting */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--espresso-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Rechercher par N° ticket, client, service..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  style={{ paddingLeft: '40px', borderRadius: '10px', height: '42px', fontSize: '13px' }}
                />
              </div>

              {/* Calendar Date Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFDFB', padding: '2px 12px', borderRadius: '10px', border: '1px solid var(--champagne)', height: '42px' }}>
                <Calendar size={16} color="var(--success)" />
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--espresso-muted)' }}>Date :</span>
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={e => setHistoryDateFilter(e.target.value)}
                  style={{ height: '32px', fontSize: '12px', border: 'none', background: 'transparent', padding: '0 4px', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--espresso)' }}
                />
                {historyDateFilter && (
                  <button 
                    style={{ border: 'none', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                    onClick={() => setHistoryDateFilter('')}
                    title="Effacer le filtre date"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={16} color="var(--espresso-muted)" />
                <select
                  className="form-input"
                  value={historySort}
                  onChange={e => setHistorySort(e.target.value)}
                  style={{ borderRadius: '10px', height: '42px', fontSize: '13px', paddingRight: '32px' }}
                >
                  <option value="newest">Du traitement le plus récent</option>
                  <option value="oldest">Du traitement le plus ancien</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {filteredCompletedTickets.length === 0 ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                  <History size={44} style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px' }}>Aucun ticket ne correspond à votre recherche.</p>
                </div>
              ) : (
                filteredCompletedTickets.map(t => (
                  <div key={t.id} className="glass-card" style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFDFB', borderLeft: '4px solid var(--success)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ fontSize: '18px', color: 'var(--success)' }}>N° {t.ticket_number}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--espresso-muted)' }}>Service : {t.service_name}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--espresso-light)', marginTop: '4px' }}>Client: <strong>{t.client_name}</strong></div>
                    </div>
                    
                    <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--success)', fontWeight: '700' }}>
                      ✓ Traité le {new Date(t.completed_at || t.booking_date).toLocaleDateString('fr-FR')} à {t.completed_at ? new Date(t.completed_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : t.time_slot}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* ========================================== */}
      {/* MODAL D'AVERTISSEMENT D'APPEL ANTICIPÉ */}
      {/* ========================================== */}
      {earlyCallCandidate && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="glass-panel animate-scale-up" style={{ width: '460px', background: '#FFFDFB', padding: '32px', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.35)', border: '1px solid var(--champagne)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(249,115,22,0.1)', color: 'var(--saffron)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <Clock size={36} />
            </div>
            
            <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--espresso)', margin: 0 }}>Appel Anticipé en Guichet</h3>
            
            <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px dashed var(--saffron)', padding: '16px', borderRadius: '14px', margin: '20px 0', textAlign: 'left' }}>
              <div style={{ fontSize: '14px', color: 'var(--espresso)', fontWeight: '800', marginBottom: '6px' }}>
                Ticket N° {earlyCallCandidate.ticket_number} — {earlyCallCandidate.client_name}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', margin: 0, lineHeight: '1.5' }}>
                Ce client a planifié son passage pour <strong>{earlyCallCandidate.time_slot}</strong>.<br/>
                Il n'est pas encore l'heure de son rendez-vous planifié.
              </p>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--espresso-light)', marginBottom: '24px', fontWeight: '600' }}>
              Souhaitez-vous vraiment appeler ce client maintenant avant son heure ?
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-primary" 
                style={{ flex: 1, padding: '12px', fontSize: '13px', borderRadius: '10px' }}
                onClick={executeCallNext}
              >
                Appeler maintenant
              </button>
              <button 
                className="btn-secondary" 
                style={{ flex: 1, padding: '12px', fontSize: '13px', borderRadius: '10px' }}
                onClick={() => setEarlyCallCandidate(null)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
