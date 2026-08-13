import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Layers, 
  Clock, 
  Users, 
  Monitor, 
  Tv, 
  LogOut, 
  Plus, 
  Edit2, 
  User, 
  Check,
  AlertTriangle,
  Play,
  TrendingUp,
  Activity,
  DollarSign,
  Eye,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  Lock,
  ChevronRight,
  ShieldAlert,
  Smartphone,
  Sparkles
} from 'lucide-react';
import QueuePayLogo from '../components/QueuePayLogo';
import { triggerNotification } from '../components/DynamicIslandNotification';
import ConfirmModal from '../components/ConfirmModal';

const API_BASE_URL = 'http://127.0.0.1:5000';

export default function CompanyDashboard({ user, handleLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'services', 'availability', 'agents', 'desks'
  const [entityData, setEntityData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  
  // Services states
  const [services, setServices] = useState([]);
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);
  
  // Agents states
  const [agents, setAgents] = useState([]);
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [editingAgentId, setEditingAgentId] = useState(null); // for editing agents

  // Desks states
  const [desks, setDesks] = useState([]);
  const [deskName, setDeskName] = useState('');
  const [deskServiceId, setDeskServiceId] = useState('');
  const [deskAgentId, setDeskAgentId] = useState('');
  const [editingDeskId, setEditingDeskId] = useState(null); // for editing desks

  // Availability settings states
  const [hoursStart, setHoursStart] = useState('08:00');
  const [hoursEnd, setHoursEnd] = useState('17:00');
  const [duration, setDuration] = useState(10);
  const [days, setDays] = useState({ 1: true, 2: true, 3: true, 4: true, 5: true, 6: false, 7: false });

  // Supervision modal states
  const [supervisedDesk, setSupervisedDesk] = useState(null);
  const [supervisedQueue, setSupervisedQueue] = useState([]);
  const [supervisedLoading, setSupervisedLoading] = useState(false);

  // Premium confirm modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', confirmLabel: '', onConfirm: null });

  // Security tab states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const headers = { Authorization: `Bearer ${sessionStorage.getItem('token')}` };

  const fetchEntityData = () => {
    // 1. Settings
    fetch(`${API_BASE_URL}/entity/settings`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setEntityData(data.settings);
          setHoursStart(data.settings.working_hours_start.slice(0, 5));
          setHoursEnd(data.settings.working_hours_end.slice(0, 5));
          setDuration(data.settings.average_duration_minutes);
          
          // Map working days string to object
          const workingDaysArr = data.settings.working_days.split(',').map(Number);
          const newDaysObj = { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false };
          workingDaysArr.forEach(d => { newDaysObj[d] = true; });
          setDays(newDaysObj);
        }
      });

    // 2. Services
    fetch(`${API_BASE_URL}/entity/my-services`, { headers })
      .then(res => res.json())
      .then(data => { if (data.services) setServices(data.services); });

    // 3. Agents
    fetch(`${API_BASE_URL}/entity/agents`, { headers })
      .then(res => res.json())
      .then(data => { if (data.agents) setAgents(data.agents); });

    // 4. Desks
    fetch(`${API_BASE_URL}/entity/desks`, { headers })
      .then(res => res.json())
      .then(data => { if (data.desks) setDesks(data.desks); });

    // 5. Dashboard statistics & recent bookings
    fetch(`${API_BASE_URL}/entity/dashboard-stats`, { headers })
      .then(res => res.json())
      .then(data => {
        if (data.stats) setDashboardStats(data.stats);
        if (data.recentBookings) setRecentBookings(data.recentBookings);
      })
      .catch(err => console.error('Stats load error:', err));
  };

  useEffect(() => {
    fetchEntityData();
  }, []);

  // Fetch supervision queue for a specific desk
  const handleSuperviseDesk = (desk) => {
    setSupervisedDesk(desk);
    if (!desk) return;

    setSupervisedLoading(true);
    fetch(`${API_BASE_URL}/client/entities/${entityData.id}`)
      .then(res => res.json())
      .then(data => {
        fetch(`${API_BASE_URL}/client/entities/${entityData.id}/tv-queue`)
          .then(res => res.json())
          .then(qData => {
            if (qData.queue) {
              const filtered = qData.queue.filter(t => t.service_name === desk.service_name);
              setSupervisedQueue(filtered);
            }
            setSupervisedLoading(false);
          });
      })
      .catch(() => setSupervisedLoading(false));
  };

  const handleUpdateSettings = (e) => {
    e.preventDefault();
    const workingDaysStr = Object.keys(days).filter(k => days[k]).join(',');

    fetch(`${API_BASE_URL}/entity/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        working_hours_start: hoursStart,
        working_hours_end: hoursEnd,
        working_days: workingDaysStr,
        average_duration_minutes: duration
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          triggerNotification('Horaires de disponibilité sauvegardés !', 'success');
          fetchEntityData();
        } else {
          triggerNotification(data.error || 'Erreur lors de la mise à jour', 'warning');
        }
      });
  };

  // Create or Edit Service
  const handleCreateService = (e) => {
    e.preventDefault();
    const url = editingServiceId 
      ? `${API_BASE_URL}/entity/services/${editingServiceId}` 
      : `${API_BASE_URL}/entity/services`;
    
    fetch(url, {
      method: editingServiceId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        name: serviceName,
        description: serviceDesc,
        price: servicePrice
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.service) {
          triggerNotification(editingServiceId ? 'Service modifié avec succès' : 'Service créé avec succès', 'success');
          setServiceName('');
          setServiceDesc('');
          setServicePrice('');
          setEditingServiceId(null);
          fetchEntityData();
        } else {
          triggerNotification(data.error || 'Erreur lors de la création', 'warning');
        }
      });
  };

  // Delete Service
  const handleDeleteService = (serviceId) => {
    setConfirmModal({
      open: true,
      title: 'Supprimer ce service ?',
      message: 'Cette action est irréversible. Tous les tickets et réservations associés à ce service seront définitivement supprimés.',
      confirmLabel: 'Oui, supprimer',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        fetch(`${API_BASE_URL}/entity/services/${serviceId}`, {
          method: 'DELETE',
          headers
        })
          .then(res => res.json())
          .then(data => {
            triggerNotification('Service supprimé avec succès', 'success');
            fetchEntityData();
          })
          .catch(() => triggerNotification('Erreur de communication', 'warning'));
      }
    });
  };

  // Create or Edit Agent
  const handleCreateAgent = (e) => {
    e.preventDefault();
    const url = editingAgentId
      ? `${API_BASE_URL}/entity/agents/${editingAgentId}`
      : `${API_BASE_URL}/entity/agents`;

    fetch(url, {
      method: editingAgentId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        name: agentName,
        email: agentEmail,
        password: agentPassword || undefined,
        phone_number: agentPhone
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.agent) {
          triggerNotification(editingAgentId ? 'Compte agent mis à jour !' : 'Compte agent créé !', 'success');
          setAgentName('');
          setAgentEmail('');
          setAgentPassword('');
          setAgentPhone('');
          setEditingAgentId(null);
          fetchEntityData();
        } else {
          triggerNotification(data.error || 'Erreur lors de la création', 'warning');
        }
      });
  };

  // Delete Agent
  const handleDeleteAgent = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    setConfirmModal({
      open: true,
      title: 'Supprimer ce compte agent ?',
      message: `Le compte de ${agent?.name || 'cet agent'} sera définitivement supprimé. L'agent ne pourra plus se connecter à son guichet.`,
      confirmLabel: 'Supprimer le compte',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        fetch(`${API_BASE_URL}/entity/agents/${agentId}`, {
          method: 'DELETE',
          headers
        })
          .then(res => res.json())
          .then(data => {
            triggerNotification('Compte agent supprimé', 'success');
            fetchEntityData();
          })
          .catch(() => triggerNotification('Erreur de communication', 'warning'));
      }
    });
  };

  // Create or Edit Desk/Guichet
  const handleCreateDesk = (e) => {
    e.preventDefault();
    const url = editingDeskId
      ? `${API_BASE_URL}/entity/desks/${editingDeskId}`
      : `${API_BASE_URL}/entity/desks`;

    fetch(url, {
      method: editingDeskId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({
        name: deskName,
        service_id: deskServiceId || null,
        assigned_agent_id: deskAgentId || null
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.desk) {
          triggerNotification(editingDeskId ? 'Guichet mis à jour !' : 'Guichet configuré !', 'success');
          setDeskName('');
          setDeskServiceId('');
          setDeskAgentId('');
          setEditingDeskId(null);
          fetchEntityData();
        } else {
          triggerNotification(data.error || 'Erreur lors de la création', 'warning');
        }
      });
  };

  // Delete Desk/Guichet
  const handleDeleteDesk = (deskId) => {
    const desk = desks.find(d => d.id === deskId);
    setConfirmModal({
      open: true,
      title: 'Supprimer ce guichet ?',
      message: `Le guichet « ${desk?.name || ''} » sera retiré du système. L'agent associé sera désaffecté automatiquement.`,
      confirmLabel: 'Supprimer le guichet',
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, open: false }));
        fetch(`${API_BASE_URL}/entity/desks/${deskId}`, {
          method: 'DELETE',
          headers
        })
          .then(res => res.json())
          .then(data => {
            triggerNotification('Guichet supprimé', 'success');
            fetchEntityData();
          })
          .catch(() => triggerNotification('Erreur de communication', 'warning'));
      }
    });
  };

  // Change Password Form Submit
  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      triggerNotification('Les nouveaux mots de passe ne correspondent pas', 'warning');
      return;
    }

    setPasswordLoading(true);
    fetch(`${API_BASE_URL}/entity/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({ currentPassword, newPassword })
    })
      .then(res => res.json())
      .then(data => {
        setPasswordLoading(false);
        if (!data.error) {
          triggerNotification(data.message || 'Mot de passe modifié avec succès', 'success');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          triggerNotification(data.error, 'warning');
        }
      })
      .catch(() => {
        setPasswordLoading(false);
        triggerNotification('Erreur réseau', 'warning');
      });
  };

  const formatCommission = (totalTickets) => {
    const rate = parseFloat(entityData?.commission_amount || 0);
    return `${(totalTickets * rate).toFixed(2)} Ar`;
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream-bg)' }}>
      
      {/* Premium Sidebar Component */}
      <aside className="admin-sidebar" style={{ width: '280px', padding: '32px 24px', display: 'flex', flexDirection: 'column', background: '#FFFDFB', borderRight: '1px solid var(--champagne)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
          <QueuePayLogo height={32} />
          <span style={{ fontSize: '11px', background: 'rgba(249,115,22,0.1)', color: 'var(--saffron)', padding: '2px 8px', borderRadius: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            PRO
          </span>
        </div>

        {/* Branded Entity Preview Card inside Sidebar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--cream-card)', padding: '16px', borderRadius: '16px', border: '1px solid var(--champagne)', marginBottom: '32px' }}>
          {entityData?.logo_url ? (
            <img src={entityData.logo_url} height="40" width="40" style={{ borderRadius: '50%', objectFit: 'contain', background: '#fff', border: '2px solid var(--champagne)' }} alt="Logo" />
          ) : (
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
              🏢
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--espresso)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {entityData?.name || 'Chargement...'}
            </h4>
            <span style={{ fontSize: '10px', color: 'var(--espresso-muted)', display: 'block', textTransform: 'capitalize' }}>
              Partenaire Actif
            </span>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            className={`admin-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} /> Vue d'ensemble
          </button>
          
          <button 
            className={`admin-nav-btn ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
            <Layers size={18} /> Services Actifs
          </button>

          <button 
            className={`admin-nav-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            <Clock size={18} /> Disponibilités
          </button>

          <button 
            className={`admin-nav-btn ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            <Users size={18} /> Comptes Agents
          </button>

          <button 
            className={`admin-nav-btn ${activeTab === 'desks' ? 'active' : ''}`}
            onClick={() => setActiveTab('desks')}
          >
            <Monitor size={18} /> Guichets Physiques
          </button>

          <button 
            className={`admin-nav-btn ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <Lock size={18} /> Sécurité & Profil
          </button>

          {/* Quick TV Link */}
          <button 
            className="admin-nav-btn" 
            style={{ color: 'var(--saffron)', marginTop: '16px', background: 'rgba(249,115,22,0.05)', border: '1px dashed rgba(249,115,22,0.2)' }}
            onClick={() => window.open(`/tv?entityId=${entityData?.id}`, '_blank')}
          >
            <Tv size={18} /> Écran TV en direct
          </button>
        </nav>

        {/* Red Logout Button at bottom */}
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
            <h1 style={{ fontSize: '28px', fontWeight: '900', color: 'var(--espresso)', letterSpacing: '-0.75px', fontFamily: 'var(--font-title)' }}>
              Console Marchand
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--espresso-muted)', marginTop: '4px' }}>
              Contrat QueuePay : Commission fixe de <strong style={{ color: 'var(--saffron)' }}>{entityData?.commission_amount} Ar</strong> par ticket, prix maximum autorisé de <strong style={{ color: 'var(--espresso)' }}>{entityData?.max_booking_price} Ar</strong>.
            </p>
          </div>
          
          <button 
            className="btn-secondary" 
            onClick={fetchEntityData}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px' }}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW / VUE D'ENSEMBLE */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Stats Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(249,115,22,0.1)', color: 'var(--saffron)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--espresso-muted)', letterSpacing: '0.5px' }}>Total Tickets</span>
                  <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--espresso)', marginTop: '4px' }}>{dashboardStats?.total_tickets || 0}</h3>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--espresso-muted)', letterSpacing: '0.5px' }}>Chiffre d'Affaire</span>
                  <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--success)', marginTop: '4px' }}>{(dashboardStats?.total_revenue || 0).toFixed(0)} Ar</h3>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--espresso-muted)', letterSpacing: '0.5px' }}>Frais QueuePay</span>
                  <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--danger)', marginTop: '4px' }}>{formatCommission(dashboardStats?.total_tickets || 0)}</h3>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--champagne)', color: 'var(--espresso)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={24} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--espresso-muted)', letterSpacing: '0.5px' }}>En attente</span>
                  <h3 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--espresso)', marginTop: '4px' }}>{dashboardStats?.pending_tickets || 0}</h3>
                </div>
              </div>
            </div>

            {/* Grid for Active Guichets & Live Supervision */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', alignItems: 'start' }}>
              
              {/* Left Column: Guichets list & Live status */}
              <div className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '8px' }}>Supervision des Guichets en Direct</h3>
                <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginBottom: '24px' }}>
                  Cliquez sur l'oeil d'un guichet pour inspecter en temps réel sa file d'attente.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {desks.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                      Aucun guichet configuré dans le système.
                    </div>
                  ) : (
                    desks.map(d => (
                      <div key={d.id} className="glass-card table-row-highlight" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFDFB' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '15px', color: 'var(--espresso)' }}>{d.name}</strong>
                            <span style={{ fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '8px', background: d.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: d.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)' }}>
                              {d.status}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: 'var(--espresso-muted)' }}>
                            <span>Service : <strong>{d.service_name || 'Aucun'}</strong></span>
                            <span>•</span>
                            <span>Agent : <strong>{d.agent_name || 'Libre'}</strong></span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            onClick={() => handleSuperviseDesk(d)}
                          >
                            <Eye size={14} /> Superviser
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Live Booking Logs */}
              <div className="glass-panel" style={{ padding: '32px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '16px' }}>Réservations Récentes</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentBookings.length === 0 ? (
                    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--espresso-muted)', fontSize: '12px' }}>
                      Aucune réservation enregistrée.
                    </div>
                  ) : (
                    recentBookings.map(b => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid rgba(234,216,195,0.2)' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--espresso)' }}>N° {b.ticket_number}</div>
                          <span style={{ fontSize: '11px', color: 'var(--espresso-muted)' }}>{b.client_name} • {b.service_name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--saffron)' }}>{b.price} Ar</span>
                          <div style={{ fontSize: '9px', color: 'var(--espresso-muted)', marginTop: '2px' }}>
                            {new Date(b.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: SERVICES TAB (PREMIUM REDESIGN) */}
        {/* ======================================================== */}
        {activeTab === 'services' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1.75fr', gap: '32px' }}>
            
            {/* Service Form */}
            <div className="glass-panel animate-fade-in" style={{ padding: '32px', height: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Sparkles size={18} color="var(--saffron)" />
                <h3 style={{ margin: 0 }}>{editingServiceId ? 'Modifier le Service' : 'Nouveau Service'}</h3>
              </div>
              <p style={{ fontSize: '11.5px', color: 'var(--espresso-muted)', marginBottom: '24px', lineHeight: '1.4' }}>
                Attribuez un tarif clair. Le prix maximum contractuel fixé avec QueuePay est de <strong>{entityData?.max_booking_price} Ar</strong>.
              </p>
              
              <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Nom du Service</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="ex: Rechargement, Paiement Facture" 
                    value={serviceName} 
                    onChange={e => setServiceName(e.target.value)} 
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Tarif (Ariary)</label>
                  <input 
                    type="number" 
                    required 
                    className="form-input" 
                    placeholder="ex: 300" 
                    value={servicePrice} 
                    onChange={e => setServicePrice(e.target.value)} 
                  />
                  {parseFloat(servicePrice) > parseFloat(entityData?.max_booking_price || 0) && (
                    <div style={{ fontSize: '10px', color: 'var(--danger)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                      <ShieldAlert size={12} /> Dépasse le plafond autorisé de {entityData?.max_booking_price} Ar.
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Description</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Détaillez le rôle de ce guichet pour vos clients..." 
                    style={{ minHeight: '100px', lineHeight: '1.4' }} 
                    value={serviceDesc} 
                    onChange={e => setServiceDesc(e.target.value)}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    style={{ flex: 1 }}
                    disabled={parseFloat(servicePrice) > parseFloat(entityData?.max_booking_price || 0)}
                  >
                    {editingServiceId ? 'Enregistrer les modifications' : 'Ajouter le service'}
                  </button>
                  {editingServiceId && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => {
                        setEditingServiceId(null);
                        setServiceName('');
                        setServiceDesc('');
                        setServicePrice('');
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Services Grid List */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Catalogue de Services</h3>
                <span style={{ fontSize: '11px', background: 'var(--champagne)', color: 'var(--espresso)', padding: '4px 12px', borderRadius: '12px', fontWeight: '800' }}>
                  {services.length} {services.length > 1 ? 'Services' : 'Service'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                {services.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                    <Layers size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ fontSize: '13px' }}>Aucun service opérationnel configuré pour le moment.</p>
                  </div>
                ) : (
                  services.map(s => (
                    <div 
                      key={s.id} 
                      className="glass-card" 
                      style={{ 
                        padding: '20px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#FFFDFB', 
                        border: '1px solid var(--champagne)',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--espresso)', margin: '0 0 6px 0' }}>{s.name}</h4>
                        <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', maxWidth: '420px', margin: '0 0 12px 0', lineHeight: '1.4' }}>{s.description || 'Pas de description'}</p>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(249,115,22,0.1)', color: 'var(--saffron)', fontWeight: '800' }}>
                            {s.price} Ar
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--espresso-muted)' }}>
                            Commission : {(entityData?.commission_amount || 0)} Ar par ticket
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '10px', borderRadius: '10px' }} 
                          onClick={() => {
                            setEditingServiceId(s.id);
                            setServiceName(s.name);
                            setServicePrice(s.price);
                            setServiceDesc(s.description || '');
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '10px', borderRadius: '10px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} 
                          onClick={() => handleDeleteService(s.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DISPONIBILITES & HORAIRES (PREMIUM REDESIGN) */}
        {/* ======================================================== */}
        {activeTab === 'availability' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px' }}>
            
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Clock size={20} color="var(--saffron)" />
                <h3 style={{ margin: 0 }}>Réglages des Horaires</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginBottom: '28px', lineHeight: '1.4' }}>
                Définissez les plages pendant lesquelles vos guichets accueillent le public. Les clients réserveront en accord avec ces plages.
              </p>

              <form onSubmit={handleUpdateSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Hours grid view */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ background: 'var(--cream-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--champagne)' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '8px' }}>Ouverture des portes</label>
                    <input 
                      type="time" 
                      className="form-input" 
                      value={hoursStart} 
                      onChange={e => setHoursStart(e.target.value)} 
                      style={{ fontSize: '18px', fontWeight: '800', textAlign: 'center', background: '#fff' }}
                    />
                  </div>
                  <div style={{ background: 'var(--cream-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--champagne)' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '8px' }}>Fermeture / Clôture</label>
                    <input 
                      type="time" 
                      className="form-input" 
                      value={hoursEnd} 
                      onChange={e => setHoursEnd(e.target.value)} 
                      style={{ fontSize: '18px', fontWeight: '800', textAlign: 'center', background: '#fff' }}
                    />
                  </div>
                </div>

                {/* Duration select */}
                <div style={{ background: 'var(--cream-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--champagne)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)' }}>Durée moyenne estimée par ticket</label>
                    <span style={{ fontSize: '12px', fontWeight: '900', color: 'var(--saffron)' }}>{duration} minutes</span>
                  </div>
                  
                  <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    step="5" 
                    className="form-input" 
                    value={duration} 
                    onChange={e => setDuration(parseInt(e.target.value))}
                    style={{ padding: 0, height: '6px', background: 'var(--champagne)', accentColor: 'var(--saffron)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '10px', color: 'var(--espresso-muted)' }}>
                    <span>Rapide (5 min)</span>
                    <span>Standard (15 min)</span>
                    <span>Détaillé (60 min)</span>
                  </div>
                </div>

                {/* Opening days horizontal circular selectors */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '12px' }}>Jours d'activité hebdomadaires</label>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid var(--champagne)' }}>
                    {[
                      { key: 1, label: 'Lun', full: 'Lundi' },
                      { key: 2, label: 'Mar', full: 'Mardi' },
                      { key: 3, label: 'Mer', full: 'Mercredi' },
                      { key: 4, label: 'Jeu', full: 'Jeudi' },
                      { key: 5, label: 'Ven', full: 'Vendredi' },
                      { key: 6, label: 'Sam', full: 'Samedi' },
                      { key: 7, label: 'Dim', full: 'Dimanche' }
                    ].map(day => {
                      const isActive = days[day.key];
                      return (
                        <button
                          key={day.key}
                          type="button"
                          onClick={() => setDays({ ...days, [day.key]: !isActive })}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            border: '2px solid',
                            borderColor: isActive ? 'var(--saffron)' : 'var(--champagne-dark)',
                            background: isActive ? 'var(--saffron)' : '#fff',
                            color: isActive ? '#fff' : 'var(--espresso)',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: isActive ? '0 4px 10px rgba(249,115,22,0.15)' : 'none'
                          }}
                          title={day.full}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '14px' }}>
                  Sauvegarder les configurations
                </button>
              </form>
            </div>

            {/* Visual calendar display box */}
            <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#FFFDFB' }}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Clock size={48} color="var(--saffron)" style={{ opacity: 0.8, marginBottom: '16px' }} />
                <h4 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--espresso)', margin: '0 0 8px 0' }}>Aperçu d'accueil</h4>
                <p style={{ fontSize: '12.5px', color: 'var(--espresso-muted)', lineHeight: '1.5', maxWidth: '280px', margin: '0 auto' }}>
                  Vos guichets seront ouverts de <strong>{hoursStart}</strong> à <strong>{hoursEnd}</strong>, les jours activés.
                </p>
                
                <div style={{ marginTop: '24px', padding: '16px', background: 'var(--cream-bg)', borderRadius: '16px', border: '1px solid var(--champagne)', display: 'inline-block' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: 'var(--espresso-muted)', display: 'block', marginBottom: '4px' }}>Fréquence des tickets</span>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: 'var(--espresso)' }}>~ 1 ticket toutes les {duration} min</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: COMPTES AGENTS (PREMIUM WITH CRUD IMPLEMENTED) */}
        {/* ======================================================== */}
        {activeTab === 'agents' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1.75fr', gap: '32px' }}>
            
            {/* Agent Form */}
            <div className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <User size={20} color="var(--saffron)" />
                <h3 style={{ margin: 0 }}>{editingAgentId ? 'Modifier l\'Agent' : 'Créer un compte Agent'}</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginBottom: '24px', lineHeight: '1.4' }}>
                {editingAgentId 
                  ? "Modifiez les informations d'accès. Laissez le mot de passe vide si vous ne souhaitez pas le changer."
                  : "Le guichetier pourra se connecter sur son espace personnel pour appeler les clients du guichet."}
              </p>
              
              <form onSubmit={handleCreateAgent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Nom complet</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="ex: Mdm Tiffany" 
                    value={agentName} 
                    onChange={e => setAgentName(e.target.value)} 
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Email d'identification</label>
                  <input 
                    type="email" 
                    required 
                    className="form-input" 
                    placeholder="tiffany@entreprise.com" 
                    value={agentEmail} 
                    onChange={e => setAgentEmail(e.target.value)} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>
                    {editingAgentId ? 'Modifier le Mot de passe (Optionnel)' : 'Mot de passe initial'}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="password" 
                      required={!editingAgentId}
                      className="form-input" 
                      placeholder={editingAgentId ? "Saisir pour réinitialiser..." : "••••••••"} 
                      value={agentPassword} 
                      onChange={e => setAgentPassword(e.target.value)} 
                      style={{ paddingLeft: '36px' }}
                    />
                    <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Numéro de téléphone</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="tel" 
                      className="form-input" 
                      placeholder="+261 34 12 345 67" 
                      value={agentPhone} 
                      onChange={e => setAgentPhone(e.target.value)} 
                      style={{ paddingLeft: '36px' }}
                    />
                    <Smartphone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    {editingAgentId ? 'Enregistrer les modifications' : 'Créer le compte'}
                  </button>
                  {editingAgentId && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => {
                        setEditingAgentId(null);
                        setAgentName('');
                        setAgentEmail('');
                        setAgentPassword('');
                        setAgentPhone('');
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List of Agents */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Comptes Agents</h3>
                <span style={{ fontSize: '11px', background: 'var(--champagne)', color: 'var(--espresso)', padding: '4px 12px', borderRadius: '12px', fontWeight: '800' }}>
                  {agents.length} Actifs
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {agents.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                    <Users size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ fontSize: '13px' }}>Aucun compte agent créé.</p>
                  </div>
                ) : (
                  agents.map(a => (
                    <div 
                      key={a.id} 
                      className="glass-card" 
                      style={{ 
                        padding: '16px 20px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#FFFDFB', 
                        border: '1px solid var(--champagne)' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--espresso)' }}>
                          <User size={18} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '15px', fontWeight: '900', color: 'var(--espresso)', margin: '0 0 2px 0' }}>{a.name}</h4>
                          <span style={{ fontSize: '12px', color: 'var(--espresso-muted)', display: 'block' }}>{a.email}</span>
                          {a.phone_number && <span style={{ fontSize: '11px', color: 'var(--espresso-muted)' }}>{a.phone_number}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '10px', borderRadius: '10px' }} 
                          onClick={() => {
                            setEditingAgentId(a.id);
                            setAgentName(a.name);
                            setAgentEmail(a.email);
                            setAgentPhone(a.phone_number || '');
                            setAgentPassword('');
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '10px', borderRadius: '10px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} 
                          onClick={() => handleDeleteAgent(a.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: CONFIGURATION DES GUICHETS (CRUD SUPPORTED) */}
        {/* ======================================================== */}
        {activeTab === 'desks' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1.75fr', gap: '32px' }}>
            
            {/* Desk Form */}
            <div className="glass-panel" style={{ padding: '32px', height: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <Monitor size={20} color="var(--saffron)" />
                <h3 style={{ margin: 0 }}>{editingDeskId ? 'Modifier le Guichet' : 'Nouveau Guichet'}</h3>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginBottom: '24px', lineHeight: '1.4' }}>
                Associez un guichet physique à un service et attribuez-lui un agent responsable pour assurer le service.
              </p>
              
              <form onSubmit={handleCreateDesk} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Nom / Numéro de Guichet</label>
                  <input 
                    type="text" 
                    required 
                    className="form-input" 
                    placeholder="ex: Guichet 1, Accueil Rapide" 
                    value={deskName} 
                    onChange={e => setDeskName(e.target.value)} 
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Service affecté</label>
                  <select 
                    className="form-input" 
                    required
                    value={deskServiceId} 
                    onChange={e => setDeskServiceId(e.target.value)}
                  >
                    <option value="">-- Choisir un Service --</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.price} Ar)</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso)', marginBottom: '6px' }}>Agent assigné</label>
                  <select 
                    className="form-input" 
                    value={deskAgentId} 
                    onChange={e => setDeskAgentId(e.target.value)}
                  >
                    <option value="">-- Laisser libre --</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    {editingDeskId ? 'Enregistrer les modifications' : 'Créer le Guichet'}
                  </button>
                  {editingDeskId && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={() => {
                        setEditingDeskId(null);
                        setDeskName('');
                        setDeskServiceId('');
                        setDeskAgentId('');
                      }}
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List of Desks */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Guichets Actifs</h3>
                <span style={{ fontSize: '11px', background: 'var(--champagne)', color: 'var(--espresso)', padding: '4px 12px', borderRadius: '12px', fontWeight: '800' }}>
                  {desks.length} Guichets
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                {desks.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                    <Monitor size={36} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ fontSize: '13px' }}>Aucun guichet actif configuré.</p>
                  </div>
                ) : (
                  desks.map(d => (
                    <div 
                      key={d.id} 
                      className="glass-card" 
                      style={{ 
                        padding: '16px 20px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: '#FFFDFB', 
                        border: '1px solid var(--champagne)' 
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h4 style={{ fontSize: '16px', fontWeight: '900', color: 'var(--espresso)', margin: 0 }}>{d.name}</h4>
                          <span 
                            style={{ 
                              fontSize: '9px', 
                              fontWeight: '900', 
                              padding: '2px 8px', 
                              borderRadius: '8px', 
                              background: d.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: d.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)'
                            }}
                          >
                            {d.status}
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--espresso-muted)' }}>
                          <span>Service : <strong>{d.service_name || 'Aucun'}</strong></span>
                          <span>•</span>
                          <span>Responsable : <strong>{d.agent_name || 'Libre'}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '10px', borderRadius: '10px' }} 
                          onClick={() => {
                            setEditingDeskId(d.id);
                            setDeskName(d.name);
                            setDeskServiceId(d.service_id || '');
                            setDeskAgentId(d.assigned_agent_id || '');
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '10px', borderRadius: '10px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} 
                          onClick={() => handleDeleteDesk(d.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: SECURITY & PASSWORD CHANGE (PREMIUM BLOCK) */}
        {/* ======================================================== */}
        {activeTab === 'security' && (
          <div className="glass-panel animate-fade-in" style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', background: '#FFFDFB' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(249,115,22,0.1)', color: 'var(--saffron)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Modifier le mot de passe</h3>
                <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', margin: 0 }}>Renforcez la sécurité de l'Espace Administrateur de votre entreprise.</p>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--champagne)', margin: '20px 0' }} />

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso-light)', marginBottom: '6px' }}>Mot de passe actuel</label>
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  placeholder="Saisissez votre mot de passe temporaire ou actuel" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso-light)', marginBottom: '6px' }}>Nouveau mot de passe</label>
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  placeholder="Nouveau mot de passe fort" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso-light)', marginBottom: '6px' }}>Confirmer le nouveau mot de passe</label>
                <input 
                  type="password" 
                  required 
                  className="form-input" 
                  placeholder="Confirmez votre nouveau mot de passe" 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ padding: '14px 28px', borderRadius: '30px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px' }}
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* Supervise LIVE KANBAN Modal Overlay */}
      {supervisedDesk && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(41,37,36,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} className="animate-fade-in">
          <div className="glass-panel" style={{ width: '850px', maxWidth: '90%', padding: '32px', background: '#FFFDFB', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--espresso)', fontFamily: 'var(--font-title)' }}>
                  Supervision Live : {supervisedDesk.name}
                </h2>
                <p style={{ fontSize: '12px', color: 'var(--espresso-muted)' }}>
                  Service : <strong>{supervisedDesk.service_name}</strong> • Responsable : <strong>{supervisedDesk.agent_name || 'Libre'}</strong>
                </p>
              </div>
              <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => handleSuperviseDesk(null)}>Fermer</button>
            </div>

            {supervisedLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--espresso-muted)' }}>Chargement de la file...</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Column 1: Active calling tickets */}
                <div style={{ background: 'var(--cream-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--champagne)', minHeight: '240px' }}>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--saffron)', borderBottom: '2px solid var(--saffron)', paddingBottom: '6px', marginBottom: '12px' }}>
                    Appel en cours
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {supervisedQueue.filter(t => t.status === 'CALLING').length === 0 ? (
                      <p style={{ fontSize: '11px', color: 'var(--espresso-muted)', textAlign: 'center', padding: '20px 0' }}>Aucun appel en cours</p>
                    ) : (
                      supervisedQueue.filter(t => t.status === 'CALLING').map(t => (
                        <div key={t.id} className="glass-card" style={{ padding: '12px', background: '#FFFDFB', borderLeft: '4px solid var(--saffron)' }}>
                          <strong style={{ fontSize: '18px', color: 'var(--saffron)' }}>N° {t.ticket_number}</strong>
                          <div style={{ fontSize: '10px', color: 'var(--espresso-muted)', marginTop: '4px' }}>Sur le guichet : {t.desk_name || 'Guichet'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 2: Waiting tickets */}
                <div style={{ background: 'var(--cream-bg)', padding: '16px', borderRadius: '16px', border: '1px solid var(--champagne)', minHeight: '240px' }}>
                  <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--espresso)', borderBottom: '2px solid var(--champagne-dark)', paddingBottom: '6px', marginBottom: '12px' }}>
                    Tickets en attente
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {supervisedQueue.filter(t => t.status === 'PENDING').length === 0 ? (
                      <p style={{ fontSize: '11px', color: 'var(--espresso-muted)', width: '100%', textAlign: 'center', padding: '20px 0' }}>File d'attente vide</p>
                    ) : (
                      supervisedQueue.filter(t => t.status === 'PENDING').map(t => (
                        <span key={t.id} style={{ fontSize: '14px', fontWeight: '800', background: '#FFFDFB', color: 'var(--espresso)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--champagne)' }}>
                          {t.ticket_number}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm modal rendering for delete actions */}
      <ConfirmModal 
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, open: false }))}
        danger={true}
      />

    </div>
  );
}
