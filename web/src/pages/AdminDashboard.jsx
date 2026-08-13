import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Clock,
  User,
  LogOut,
  Plus,
  Edit2,
  Check,
  Tv,
  Monitor,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Layers,
  ArrowRight,
  Trash2,
  Eye,
  X,
  Copy,
  Globe,
  Mail,
  MapPin,
  TrendingUp,
  Upload
} from 'lucide-react';
import { triggerNotification } from '../components/DynamicIslandNotification';
import QueuePayLogo from '../components/QueuePayLogo';

import { API_BASE_URL } from '../config/api';

export default function AdminDashboard({ user, handleLogout }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'partners', 'new-partner', 'stats'
  const [entities, setEntities] = useState([]);
  const [stats, setStats] = useState(null);

  // Modal states
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [entityDetails, setEntityDetails] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // New Partner Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [maxPrice, setMaxPrice] = useState(400);
  const [commission, setCommission] = useState(100);
  const [logoBase64, setLogoBase64] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [onboardLink, setOnboardLink] = useState('');

  // Edit Partner Form states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMaxPrice, setEditMaxPrice] = useState(400);
  const [editCommission, setEditCommission] = useState(100);
  const [editLogoBase64, setEditLogoBase64] = useState('');

  const fetchDashboardData = () => {
    const token = sessionStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_BASE_URL}/admin/entities`, { headers })
      .then(res => res.json())
      .then(data => { if (data.entities) setEntities(data.entities); })
      .catch(err => console.error('Error fetching entities:', err));

    fetch(`${API_BASE_URL}/admin/stats`, { headers })
      .then(res => res.json())
      .then(data => { if (data.stats) setStats(data.stats); })
      .catch(err => console.error('Error fetching stats:', err));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch complete details of selected entity
  const handleViewDetails = (entityId) => {
    const token = sessionStorage.getItem('token');
    fetch(`${API_BASE_URL}/admin/entities/${entityId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.entity) {
          setEntityDetails(data);
          setSelectedEntity(data.entity);
        } else {
          triggerNotification('Erreur lors du chargement des détails', 'danger');
        }
      })
      .catch(err => {
        console.error(err);
        triggerNotification('Erreur de communication', 'danger');
      });
  };

  // Open Edit Modal & Populate Form
  const handleOpenEdit = (entity) => {
    setEditName(entity.name);
    setEditDescription(entity.description || '');
    setEditEmail(entity.email || '');
    setEditAddress(entity.address || '');
    setEditMaxPrice(parseFloat(entity.max_booking_price));
    setEditCommission(parseFloat(entity.commission_amount));
    setEditLogoBase64(entity.logo_url || '');
    setShowEditModal(true);
  };

  // Submit Edit Form
  const handleUpdateEntitySubmit = (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');

    fetch(`${API_BASE_URL}/admin/entities/${selectedEntity.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: editName,
        max_booking_price: editMaxPrice,
        commission_amount: editCommission,
        description: editDescription,
        logo_url: editLogoBase64,
        email: editEmail,
        address: editAddress
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.entity) {
          triggerNotification('Contrat et informations mis à jour !', 'success');
          setShowEditModal(false);
          // Refresh details & list
          handleViewDetails(selectedEntity.id);
          fetchDashboardData();
        } else {
          triggerNotification(data.error || 'Erreur lors du traitement', 'danger');
        }
      })
      .catch(err => {
        console.error(err);
        triggerNotification('Erreur de communication', 'danger');
      });
  };

  // Submit Delete Entity
  const handleDeleteEntitySubmit = () => {
    const token = sessionStorage.getItem('token');
    fetch(`${API_BASE_URL}/admin/entities/${selectedEntity.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          triggerNotification('Collaboration partenaire supprimée', 'success');
          setShowDeleteModal(false);
          setSelectedEntity(null);
          setEntityDetails(null);
          fetchDashboardData();
        } else {
          triggerNotification(data.error, 'danger');
        }
      })
      .catch(err => {
        console.error(err);
        triggerNotification('Erreur réseau', 'danger');
      });
  };

  const handleResetOnboarding = (entityId) => {
    if (!window.confirm("Voulez-vous réinitialiser le mot de passe de cet administrateur ? Un mot de passe temporaire sera généré et lui sera envoyé directement par e-mail avec les instructions de connexion. Ses informations de profil seront conservées.")) return;
    const token = sessionStorage.getItem('token');
    fetch(`${API_BASE_URL}/admin/entities/${entityId}/reset-onboarding`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          triggerNotification(data.message || 'Mot de passe réinitialisé avec succès !', 'success');
          handleViewDetails(entityId);
          fetchDashboardData();
        } else {
          triggerNotification(data.error, 'danger');
        }
      })
      .catch(err => {
        console.error(err);
        triggerNotification('Erreur réseau', 'danger');
      });
  };

  // Handle Logo Base64 Convert
  const handleLogoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerNotification("Seuls les fichiers images sont acceptés", "danger");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoBase64(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleEditLogoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerNotification("Seuls les fichiers images sont acceptés", "danger");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setEditLogoBase64(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Submit New Entity
  const handleCreateEntity = (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('token');

    fetch(`${API_BASE_URL}/admin/entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        slug,
        description,
        email,
        address,
        logo_url: logoBase64,
        max_booking_price: maxPrice,
        commission_amount: commission
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.entity) {
          triggerNotification('Partenariat entreprise créé !', 'success');
          const fullOnboardUrl = `${window.location.origin}/entrp/${data.entity.slug}`;
          setOnboardLink(fullOnboardUrl);

          // Reset form
          setName('');
          setSlug('');
          setDescription('');
          setEmail('');
          setAddress('');
          setLogoBase64('');
          setMaxPrice(400);
          setCommission(100);

          fetchDashboardData();
          setActiveTab('partners'); // Redirect to list to show it
        } else {
          triggerNotification(data.error || 'Erreur lors de la création', 'danger');
        }
      })
      .catch(err => {
        console.error(err);
        triggerNotification('Erreur de communication', 'danger');
      });
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--cream-bg)', width: '100%' }}>
      {/* ═══ SIDEBAR NAVIGATION ═══ */}
      <aside className="admin-sidebar" style={{
        width: '260px',
        background: '#FFFDFB',
        borderRight: '1px solid rgba(234,216,195,0.4)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 90,
        boxSizing: 'border-box'
      }}>
        {/* Sidebar Header */}
        <div style={{ padding: '24px 24px', display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(234,216,195,0.2)' }}>
          <QueuePayLogo height={35} showText={true} />
          <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso-muted)', letterSpacing: '1px', marginLeft: '43px', marginTop: '-6px' }}>Super Admin</span>
        </div>

        {/* Admin info card */}
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(234,216,195,0.2)' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(234,216,195,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'var(--espresso-light)' }}>
            SA
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--espresso)' }}>{user?.name || 'Super Admin'}</div>
            <div style={{ fontSize: '11px', color: 'var(--espresso-muted)' }}>{user?.email || 'admin@queuepay.com'}</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
          <button
            className={`admin-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => { setActiveTab('overview'); setSelectedEntity(null); setEntityDetails(null); }}
          >
            <Layers size={18} />
            Tableau de Bord
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'partners' ? 'active' : ''}`}
            onClick={() => { setActiveTab('partners'); }}
          >
            <Building2 size={18} />
            Collaborateurs
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'new-partner' ? 'active' : ''}`}
            onClick={() => { setActiveTab('new-partner'); setSelectedEntity(null); setEntityDetails(null); }}
          >
            <Plus size={18} />
            Nouvelle Collaboration
          </button>
          <button
            className={`admin-nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => { setActiveTab('stats'); setSelectedEntity(null); setEntityDetails(null); }}
          >
            <TrendingUp size={18} />
            Statistiques Centrales
          </button>
        </nav>

        {/* Logout at bottom */}
        <div style={{ padding: '24px', borderTop: '1px solid rgba(234,216,195,0.2)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--danger)',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font-title)'
            }}
            className="logout-btn-red"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <main style={{ flex: 1, padding: '40px 48px', boxSizing: 'border-box', overflowY: 'auto' }}>

        {/* Onboarding Link Alert Banner */}
        {onboardLink && (
          <div className="glass-panel animate-slide-up" style={{ padding: '24px', background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.3)', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)' }}>
                <CheckCircle size={20} />
                <strong style={{ fontSize: '15px' }}>Lien d'onboarding partenaire généré avec succès !</strong>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--espresso-muted)' }} onClick={() => setOnboardLink('')}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--espresso-muted)' }}>
              Copiez cette URL privée et transmettez-la à l'entreprise pour qu'elle puisse configurer son accès et ses guichets :
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              <input type="text" readOnly className="form-input" value={onboardLink} style={{ background: '#FFFDFB', fontWeight: '600', color: 'var(--espresso-light)', border: '1px solid rgba(16,185,129,0.2)' }} />
              <button className="btn-primary" style={{ background: 'var(--success)', boxShadow: 'none' }} onClick={() => {
                navigator.clipboard.writeText(onboardLink);
                triggerNotification('Lien copié dans le presse-papiers !', 'success');
              }}>
                <Copy size={16} /> Copier
              </button>
            </div>
          </div>
        )}

        {/* ═══ TAB 1: OVERVIEW ═══ */}
        {activeTab === 'overview' && !selectedEntity && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>Tableau de bord central</h2>
              <p style={{ fontSize: '14px', color: 'var(--espresso-muted)' }}>Vue globale de l'écosystème commercial QueuePay.</p>
            </div>

            {/* KPI Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <div className="glass-panel kpi-card" style={{ padding: '24px', transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--espresso-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Crédits Déposés Clients</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--saffron)' }}>
                    <DollarSign size={18} />
                  </div>
                </div>
                <h3 style={{ fontSize: '28px', color: 'var(--espresso)', fontWeight: '800' }}>
                  {stats ? `${stats.total_deposits.toLocaleString()} Ar` : '0 Ar'}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '700', marginTop: '4px', display: 'block' }}>Flux transactionnel global</span>
              </div>

              <div className="glass-panel kpi-card" style={{ padding: '24px', transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--espresso-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Commissions QueuePay</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
                    <TrendingUp size={18} />
                  </div>
                </div>
                <h3 style={{ fontSize: '28px', color: 'var(--success)', fontWeight: '800' }}>
                  {stats ? `${stats.total_commissions_earned.toLocaleString()} Ar` : '0 Ar'}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--espresso-muted)', fontWeight: '600', marginTop: '4px', display: 'block' }}>Bénéfices nets collectés</span>
              </div>

              <div className="glass-panel kpi-card" style={{ padding: '24px', transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--espresso-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Tickets Réservés</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(41,37,36,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--espresso-light)' }}>
                    <Layers size={18} />
                  </div>
                </div>
                <h3 style={{ fontSize: '28px', color: 'var(--espresso)', fontWeight: '800' }}>
                  {stats ? stats.total_tickets : '0'}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--espresso-muted)', fontWeight: '600', marginTop: '4px', display: 'block' }}>Réservations enregistrées</span>
              </div>

              <div className="glass-panel kpi-card" style={{ padding: '24px', transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--espresso-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Partenaires Actifs</span>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(234,216,195,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--espresso)' }}>
                    <Building2 size={18} />
                  </div>
                </div>
                <h3 style={{ fontSize: '28px', color: 'var(--espresso)', fontWeight: '800' }}>
                  {entities.length}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--saffron)', fontWeight: '700', marginTop: '4px', display: 'block' }}>Collaborations en cours</span>
              </div>
            </div>

            {/* Quick overview of latest partners */}
            <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Entreprises récemment partenaires</h3>
                  <p style={{ fontSize: '12px', color: 'var(--espresso-muted)' }}>Liste simplifiée des 5 dernières structures ajoutées.</p>
                </div>
                <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => setActiveTab('partners')}>
                  Voir tout
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {entities.slice(0, 5).map(e => (
                  <div key={e.id} className="glass-card" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {e.logo_url ? (
                        <img src={e.logo_url} width="40" height="40" style={{ borderRadius: '50%', border: '2px solid var(--champagne)', objectFit: 'cover' }} alt="Logo" />
                      ) : (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={18} color="var(--espresso-muted)" />
                        </div>
                      )}
                      <div>
                        <strong style={{ fontSize: '15px' }}>{e.name}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--espresso-muted)' }}>Lien : <code>/entrp/{e.slug}</code></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: 'var(--espresso-muted)', display: 'block' }}>Contrat</span>
                        <strong style={{ fontSize: '13px', color: 'var(--saffron)' }}>Max {e.max_booking_price} Ar</strong>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: e.onboarding_completed ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: e.onboarding_completed ? 'var(--success)' : 'var(--warning)'
                      }}>
                        {e.onboarding_completed ? 'Actif' : 'En attente'}
                      </span>
                      <button className="btn-secondary" style={{ padding: '8px' }} onClick={() => { setActiveTab('partners'); handleViewDetails(e.id); }}>
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {entities.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--espresso-muted)', padding: '20px 0' }}>Aucune entreprise pour le moment.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB 2: PARTNERS LIST & DETAILS ═══ */}
        {activeTab === 'partners' && (
          <div className="animate-fade-in">
            {!selectedEntity ? (
              // View list of entities
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <div>
                    <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>Partenaires collaborateurs</h2>
                    <p style={{ fontSize: '14px', color: 'var(--espresso-muted)' }}>Gérer les contrats et voir les détails de chaque entité de la plateforme.</p>
                  </div>
                  <button className="btn-primary" onClick={() => setActiveTab('new-partner')}>
                    <Plus size={16} /> Ajouter une entreprise
                  </button>
                </div>

                <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--champagne)' }}>
                        <th style={{ padding: '16px 12px', color: 'var(--espresso-muted)', fontWeight: '700' }}>Entreprise</th>
                        <th style={{ padding: '16px 12px', color: 'var(--espresso-muted)', fontWeight: '700' }}>Email / Contact</th>
                        <th style={{ padding: '16px 12px', color: 'var(--espresso-muted)', fontWeight: '700' }}>URL Onboarding</th>
                        <th style={{ padding: '16px 12px', color: 'var(--espresso-muted)', fontWeight: '700' }}>Prix Max Contrat</th>
                        <th style={{ padding: '16px 12px', color: 'var(--espresso-muted)', fontWeight: '700' }}>Commission QP</th>
                        <th style={{ padding: '16px 12px', color: 'var(--espresso-muted)', fontWeight: '700' }}>Statut</th>
                        <th style={{ padding: '16px 12px', color: 'var(--espresso-muted)', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entities.map(e => (
                        <tr key={e.id} style={{ borderBottom: '1px solid rgba(234,216,195,0.3)' }} className="table-row-hover">
                          <td style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {e.logo_url ? (
                              <img src={e.logo_url} width="36" height="36" style={{ borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--champagne)' }} alt="" />
                            ) : (
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Building2 size={16} color="var(--espresso-muted)" />
                              </div>
                            )}
                            <div>
                              <strong style={{ fontSize: '14px', color: 'var(--espresso)' }}>{e.name}</strong>
                              <span style={{ display: 'block', fontSize: '11px', color: 'var(--espresso-muted)' }}>slug: {e.slug}</span>
                            </div>
                          </td>
                          <td style={{ padding: '16px 12px', color: 'var(--espresso-light)' }}>
                            {e.email || 'Non configuré'}
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            {e.onboarding_completed ? (
                              <span style={{ color: 'var(--espresso-muted)', fontSize: '12px', fontWeight: '600' }}>Inscrit</span>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <code style={{ fontSize: '11px', background: 'var(--champagne)', padding: '2px 6px', borderRadius: '4px' }}>/entrp/{e.slug}</code>
                                <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--saffron)' }} onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/entrp/${e.slug}`);
                                  triggerNotification('Lien onboarding copié !', 'success');
                                }}>
                                  <Copy size={12} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px 12px', fontWeight: '700', color: 'var(--espresso)' }}>
                            {e.max_booking_price} Ar
                          </td>
                          <td style={{ padding: '16px 12px', fontWeight: '700', color: 'var(--saffron)' }}>
                            {e.commission_amount} Ar
                          </td>
                          <td style={{ padding: '16px 12px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              background: e.onboarding_completed ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                              color: e.onboarding_completed ? 'var(--success)' : 'var(--warning)'
                            }}>
                              {e.onboarding_completed ? 'Actif' : 'En attente'}
                            </span>
                          </td>
                          <td style={{ padding: '16px 12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button
                                className="btn-secondary"
                                style={{ padding: '8px', borderRadius: '8px', background: '#FFF' }}
                                title="Voir Détails"
                                onClick={() => handleViewDetails(e.id)}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '8px', borderRadius: '8px', background: '#FFF' }}
                                title="Modifier Contrat"
                                onClick={() => { setSelectedEntity(e); handleOpenEdit(e); }}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '8px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.1)' }}
                                title="Supprimer Partenaire"
                                onClick={() => { setSelectedEntity(e); setShowDeleteModal(true); }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {entities.length === 0 && (
                        <tr>
                          <td colSpan="7" style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                            <Building2 size={32} style={{ display: 'block', margin: '0 auto 12px', opacity: '0.4' }} />
                            Aucune collaboration active enregistrée.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // View detailed entity information inside page
              <div className="animate-fade-in">
                {/* Detail Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <button className="btn-secondary" style={{ padding: '8px 16px' }} onClick={() => { setSelectedEntity(null); setEntityDetails(null); }}>
                    ← Retour à la liste
                  </button>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => handleOpenEdit(selectedEntity)}>
                      <Edit2 size={15} /> Modifier Contrat
                    </button>
                    <button className="btn-secondary" style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.1)' }} onClick={() => setShowDeleteModal(true)}>
                      <Trash2 size={15} /> Supprimer
                    </button>
                  </div>
                </div>

                {/* Company details cards grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px', alignItems: 'start' }}>

                  {/* Left Side: General Profile Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
                      <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 20px' }}>
                        {selectedEntity.logo_url ? (
                          <img src={selectedEntity.logo_url} width="110" height="110" style={{ borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--champagne)', boxShadow: '0 8px 24px rgba(41,37,36,0.1)' }} alt="" />
                        ) : (
                          <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
                            🏢
                          </div>
                        )}
                        <span style={{
                          position: 'absolute',
                          bottom: '4px',
                          right: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: selectedEntity.onboarding_completed ? 'var(--success)' : 'var(--warning)',
                          color: '#FFF',
                          border: '2px solid #FFF'
                        }}>
                          {selectedEntity.onboarding_completed ? 'Actif' : 'En attente'}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '4px' }}>{selectedEntity.name}</h3>
                      <code style={{ fontSize: '12px', color: 'var(--espresso-muted)', background: 'var(--champagne)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>
                        slug: {selectedEntity.slug}
                      </code>

                      <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--espresso-muted)', fontWeight: '700' }}>Lien d'accès de l'entreprise :</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyCenter: 'center', gap: '6px', background: 'var(--champagne)', padding: '4px 10px', borderRadius: '8px', maxWidth: '100%', boxSizing: 'border-box' }}>
                          <code style={{ fontSize: '11px', color: 'var(--espresso)', wordBreak: 'break-all' }}>
                            {`${window.location.origin}/entrp/${selectedEntity.slug}`}
                          </code>
                          <button 
                            type="button"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--saffron)', display: 'flex', alignItems: 'center', padding: '2px' }} 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/entrp/${selectedEntity.slug}`);
                              triggerNotification('Lien copié !', 'success');
                            }}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </div>

                      <p style={{ fontSize: '13px', color: 'var(--espresso-light)', lineHeight: '1.5', margin: '0 0 24px' }}>
                        {selectedEntity.description || 'Aucune description disponible pour cette entreprise.'}
                      </p>

                      <div style={{ borderTop: '1px solid rgba(234,216,195,0.3)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                          <Mail size={15} color="var(--espresso-muted)" />
                          <span style={{ color: 'var(--espresso-light)' }}>{selectedEntity.email || 'Pas d\'email'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                          <MapPin size={15} color="var(--espresso-muted)" />
                          <span style={{ color: 'var(--espresso-light)' }}>{selectedEntity.address || 'Pas d\'adresse'}</span>
                        </div>
                      </div>

                      {/* Reset Access Button */}
                      <div style={{ borderTop: '1px solid rgba(234,216,195,0.3)', paddingTop: '20px', marginTop: '10px' }}>
                        <button 
                          type="button"
                          className="btn-secondary"
                          style={{ 
                            width: '100%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '8px', 
                            padding: '12px',
                            background: 'rgba(249, 115, 22, 0.05)',
                            borderColor: 'rgba(249, 115, 22, 0.2)',
                            color: 'var(--saffron)',
                            fontWeight: '700',
                            fontSize: '13px',
                            borderRadius: '10px'
                          }}
                          onClick={() => handleResetOnboarding(selectedEntity.id)}
                        >
                          <AlertTriangle size={15} />
                          Réinitialiser l'accès admin
                        </button>
                      </div>
                    </div>

                    {/* Contract Details Card */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--espresso-muted)', marginBottom: '16px', letterSpacing: '0.5px' }}>Termes du Contrat</h4>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: 'var(--espresso-light)' }}>Prix max réservation :</span>
                          <strong style={{ fontSize: '15px', color: 'var(--espresso)' }}>{selectedEntity.max_booking_price} Ar</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: 'var(--espresso-light)' }}>Commission QueuePay :</span>
                          <strong style={{ fontSize: '15px', color: 'var(--saffron)' }}>{selectedEntity.commission_amount} Ar</strong>
                        </div>

                        {/* Current statistics specific to this entity */}
                        {entityDetails?.stats && (
                          <>
                            <div style={{ borderTop: '1px solid rgba(234,216,195,0.3)', paddingTop: '16px' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: 'var(--espresso-light)' }}>Tickets vendus :</span>
                              <strong style={{ fontSize: '15px', color: 'var(--espresso)' }}>{entityDetails.stats.total_tickets}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: 'var(--espresso-light)' }}>Revenu entreprise :</span>
                              <strong style={{ fontSize: '15px', color: 'var(--espresso)' }}>{entityDetails.stats.total_revenue} Ar</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', color: 'var(--espresso-light)' }}>Commission totale gagnée :</span>
                              <strong style={{ fontSize: '15px', color: 'var(--success)' }}>{entityDetails.stats.commission_earned} Ar</strong>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Operational lists (Services, Agents, Bookings) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Services and availability hours */}
                    <div className="glass-panel" style={{ padding: '32px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Services & Disponibilités</h3>

                      {/* Availability display */}
                      <div style={{ display: 'flex', gap: '20px', background: 'var(--champagne)', padding: '12px 20px', borderRadius: '12px', marginBottom: '24px', alignItems: 'center' }}>
                        <Clock size={18} color="var(--saffron)" />
                        <div style={{ fontSize: '13px', color: 'var(--espresso-light)' }}>
                          Horaire d'ouverture : <strong>{selectedEntity.working_hours_start?.slice(0, 5) || '08:00'} - {selectedEntity.working_hours_end?.slice(0, 5) || '17:00'}</strong>
                          <span style={{ margin: '0 8px', color: 'rgba(41,37,36,0.3)' }}>|</span>
                          Durée : <strong>{selectedEntity.average_duration_minutes || '10'} minutes/client</strong>
                        </div>
                      </div>

                      {/* Services list */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        {entityDetails?.services && entityDetails.services.length > 0 ? (
                          entityDetails.services.map(s => (
                            <div key={s.id} className="glass-card" style={{ padding: '16px' }}>
                              <strong style={{ fontSize: '14px', display: 'block', color: 'var(--espresso)' }}>{s.name}</strong>
                              <span style={{ fontSize: '12px', color: 'var(--espresso-muted)', minHeight: '36px', display: 'block', marginTop: '4px' }}>{s.description || 'Aucune description'}</span>
                              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--saffron)', display: 'block', marginTop: '8px' }}>{s.price} Ar</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ gridColumn: '1 / -1', padding: '24px', textAlign: 'center', color: 'var(--espresso-muted)', fontSize: '13px' }}>
                            Aucun service configuré par l'entreprise.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Active agents details */}
                    <div className="glass-panel" style={{ padding: '32px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Comptes Agents de Guichet ({entityDetails?.agents?.length || 0})</h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {entityDetails?.agents && entityDetails.agents.length > 0 ? (
                          entityDetails.agents.map(a => (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(234,216,195,0.3)' }}>
                              <div>
                                <strong style={{ fontSize: '14px', color: 'var(--espresso)' }}>{a.name}</strong>
                                <span style={{ fontSize: '12px', color: 'var(--espresso-muted)', display: 'block' }}>Email : {a.email}</span>
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--espresso-light)' }}>
                                {a.phone_number || 'Pas de téléphone'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p style={{ textAlign: 'center', color: 'var(--espresso-muted)', padding: '16px 0', fontSize: '13px' }}>
                            Aucun agent de guichet créé par l'entreprise.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Recent Bookings Queue */}
                    <div className="glass-panel" style={{ padding: '32px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px' }}>Dernières réservations de l'entreprise</h3>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid var(--champagne)', textAlign: 'left' }}>
                              <th style={{ padding: '12px 8px', color: 'var(--espresso-muted)' }}>Ticket Num</th>
                              <th style={{ padding: '12px 8px', color: 'var(--espresso-muted)' }}>Client</th>
                              <th style={{ padding: '12px 8px', color: 'var(--espresso-muted)' }}>Service</th>
                              <th style={{ padding: '12px 8px', color: 'var(--espresso-muted)' }}>Plage horaire</th>
                              <th style={{ padding: '12px 8px', color: 'var(--espresso-muted)' }}>Tarif</th>
                              <th style={{ padding: '12px 8px', color: 'var(--espresso-muted)' }}>Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entityDetails?.recentBookings && entityDetails.recentBookings.length > 0 ? (
                              entityDetails.recentBookings.map(b => (
                                <tr key={b.id} style={{ borderBottom: '1px solid rgba(234,216,195,0.2)' }}>
                                  <td style={{ padding: '12px 8px', fontWeight: '700' }}>#{b.ticket_number}</td>
                                  <td style={{ padding: '12px 8px' }}>{b.client_name}</td>
                                  <td style={{ padding: '12px 8px' }}>{b.service_name}</td>
                                  <td style={{ padding: '12px 8px' }}>{b.booking_date.slice(0, 10)} à {b.time_slot.slice(0, 5)}</td>
                                  <td style={{ padding: '12px 8px', fontWeight: '600' }}>{b.price} Ar</td>
                                  <td style={{ padding: '12px 8px' }}>
                                    <span style={{
                                      fontSize: '10px',
                                      fontWeight: '800',
                                      padding: '3px 8px',
                                      borderRadius: '10px',
                                      background: b.status === 'COMPLETED' ? 'rgba(16,185,129,0.1)' : b.status === 'PENDING' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                      color: b.status === 'COMPLETED' ? 'var(--success)' : b.status === 'PENDING' ? 'var(--warning)' : 'var(--danger)'
                                    }}>
                                      {b.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="6" style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                                  Aucun ticket acheté pour cette entreprise.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 3: NEW COLLABORATION FORM ═══ */}
        {activeTab === 'new-partner' && (
          <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>Nouvelle collaboration marchande</h2>
              <p style={{ fontSize: '14px', color: 'var(--espresso-muted)' }}>Ajoutez un partenaire et configurez les conditions financières du contrat.</p>
            </div>

            <div className="glass-panel" style={{ padding: '40px' }}>
              <form onSubmit={handleCreateEntity} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Image upload drag & drop (Base64) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--espresso-light)', marginBottom: '8px', textTransform: 'uppercase' }}>Logo de l'entreprise</label>

                  <div
                    className={`upload-zone ${dragOver ? 'dragover' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleLogoFile(e.dataTransfer.files[0]);
                      }
                    }}
                    style={{
                      border: '2px dashed var(--champagne-dark)',
                      borderRadius: '16px',
                      padding: '32px',
                      textAlign: 'center',
                      background: 'rgba(255, 253, 251, 0.5)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                    onClick={() => document.getElementById('logo-file-input').click()}
                  >
                    <input
                      type="file"
                      id="logo-file-input"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleLogoFile(e.target.files[0]);
                        }
                      }}
                    />

                    {logoBase64 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={logoBase64}
                          style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--saffron)' }}
                          alt="Logo Preview"
                        />
                        <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '700' }}>Logo enregistré dans la base de données</span>
                      </div>
                    ) : (
                      <>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--saffron)' }}>
                          <Upload size={22} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '14px', display: 'block' }}>Faites glisser le logo ici ou cliquez pour parcourir</strong>
                          <span style={{ fontSize: '11px', color: 'var(--espresso-muted)' }}>Formats acceptés: PNG, JPG, WEBP. Taille max 2Mo.</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Identity Information */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: 'var(--espresso-light)' }}>Nom officiel de l'entreprise</label>
                    <input
                      type="text"
                      required
                      className="form-input"
                      placeholder="ex: Jirama Majunga"
                      value={name}
                      onChange={e => {
                        setName(e.target.value);
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: 'var(--espresso-light)' }}>Préfixe URL (Slug unique)</label>
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', color: 'var(--espresso-muted)', fontSize: '13px' }}>/entrp/</span>
                      <input
                        type="text"
                        required
                        className="form-input"
                        style={{ paddingLeft: '60px' }}
                        placeholder="jiramamajunga"
                        value={slug}
                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: 'var(--espresso-light)' }}>Email de contact</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="ex: contact@jirama-majunga.mg"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: 'var(--espresso-light)' }}>Adresse / Localisation physique</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ex: Boulevard de la Corniche, Majunga"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Financial details - Sliders */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', background: 'rgba(234,216,195,0.15)', padding: '24px', borderRadius: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--espresso-light)', marginBottom: '8px' }}>Prix max réservation (Ar)</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      placeholder="ex: 400"
                      min="0"
                      value={maxPrice}
                      onChange={e => setMaxPrice(e.target.value === '' ? '' : parseInt(e.target.value))}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--espresso-muted)', display: 'block', marginTop: '4px' }}>Prix plafond facturable par ticket (selon l'entreprise)</span>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--espresso-light)' }}>Commission QueuePay (Ar)</label>
                      <strong style={{ fontSize: '13px', color: 'var(--saffron)' }}>{commission} Ar</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      step="10"
                      value={commission}
                      onChange={e => setCommission(parseInt(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--saffron)' }}
                    />
                    <span style={{ fontSize: '10px', color: 'var(--espresso-muted)', display: 'block', marginTop: '4px' }}>Part prélevée par QueuePay par ticket (max 2000 Ar)</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: 'var(--espresso-light)' }}>Description ou notes du contrat</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Décrivez brièvement les termes conclus ou les activités de cette entreprise..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  ></textarea>
                </div>

                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                    Générer le contrat & le lien d'onboarding
                  </button>
                  <button type="button" className="btn-secondary" style={{ flex: 0.3 }} onClick={() => setActiveTab('partners')}>
                    Annuler
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ═══ TAB 4: CENTRAL STATS ═══ */}
        {activeTab === 'stats' && (
          <div className="animate-fade-in">
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px' }}>Rapport financier global</h2>
              <p style={{ fontSize: '14px', color: 'var(--espresso-muted)' }}>Analyse détaillée de l'activité commerciale des entités enregistrées.</p>
            </div>

            {/* Total Balance Sheet */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <span style={{ fontSize: '11px', color: 'var(--espresso-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Fonds déposés cumulés</span>
                <h3 style={{ fontSize: '32px', color: 'var(--espresso)', marginTop: '8px' }}>
                  {stats ? `${stats.total_deposits.toLocaleString()} Ar` : '0 Ar'}
                </h3>
              </div>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <span style={{ fontSize: '11px', color: 'var(--espresso-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Revenus de commission QueuePay</span>
                <h3 style={{ fontSize: '32px', color: 'var(--success)', marginTop: '8px' }}>
                  {stats ? `${stats.total_commissions_earned.toLocaleString()} Ar` : '0 Ar'}
                </h3>
              </div>
              <div className="glass-panel" style={{ padding: '24px' }}>
                <span style={{ fontSize: '11px', color: 'var(--espresso-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Volume de tickets</span>
                <h3 style={{ fontSize: '32px', color: 'var(--saffron)', marginTop: '8px' }}>
                  {stats ? stats.total_tickets : '0'}
                </h3>
              </div>
            </div>

            {/* Entity by Entity Breakdown Table */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Rentabilité par entreprise</h3>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--champagne)', textAlign: 'left' }}>
                      <th style={{ padding: '14px 10px', color: 'var(--espresso-muted)' }}>Nom Entreprise</th>
                      <th style={{ padding: '14px 10px', color: 'var(--espresso-muted)' }}>Contrat (Prix Max)</th>
                      <th style={{ padding: '14px 10px', color: 'var(--espresso-muted)' }}>Commission Unitaire</th>
                      <th style={{ padding: '14px 10px', color: 'var(--espresso-muted)' }}>Tickets émis</th>
                      <th style={{ padding: '14px 10px', color: 'var(--espresso-muted)' }}>Revenu Partenaire</th>
                      <th style={{ padding: '14px 10px', color: 'var(--espresso-muted)' }}>Revenu QueuePay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.entities && stats.entities.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid rgba(234,216,195,0.2)' }}>
                        <td style={{ padding: '16px 10px', fontWeight: '700' }}>{e.name}</td>
                        <td style={{ padding: '16px 10px' }}>{e.max_booking_price} Ar</td>
                        <td style={{ padding: '16px 10px' }}>{e.commission_amount} Ar</td>
                        <td style={{ padding: '16px 10px', fontWeight: '600' }}>{e.tickets_count}</td>
                        <td style={{ padding: '16px 10px', fontWeight: '700' }}>{parseFloat(e.total_revenue).toLocaleString()} Ar</td>
                        <td style={{ padding: '16px 10px', fontWeight: '700', color: 'var(--success)' }}>{parseFloat(e.queuepay_com).toLocaleString()} Ar</td>
                      </tr>
                    ))}
                    {(!stats?.entities || stats.entities.length === 0) && (
                      <tr>
                        <td colSpan="6" style={{ padding: '32px 10px', textAlign: 'center', color: 'var(--espresso-muted)' }}>
                          Aucune statistique enregistrée.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ═══ MODAL: EDIT CONTRACT TERMS ═══ */}
      {showEditModal && selectedEntity && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(41,37,36,0.3)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '32px', width: '560px', background: '#FFFDFB', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800' }}>Modifier les termes du contrat</h3>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--espresso-muted)' }} onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateEntitySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Logo Preview and Edit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(234,216,195,0.2)', padding: '16px', borderRadius: '12px' }}>
                {editLogoBase64 ? (
                  <img src={editLogoBase64} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--saffron)' }} alt="" />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--champagne)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    🏢
                  </div>
                )}
                <div>
                  <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: '12px' }} onClick={() => document.getElementById('edit-logo-input').click()}>
                    Changer l'image du logo
                  </button>
                  <input
                    type="file"
                    id="edit-logo-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleEditLogoFile(e.target.files[0]);
                      }
                    }}
                  />
                  <span style={{ display: 'block', fontSize: '10px', color: 'var(--espresso-muted)', marginTop: '4px' }}>Logo directement enregistré dans la BDD</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Nom de l'entreprise</label>
                <input type="text" required className="form-input" value={editName} onChange={e => setEditName(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Email</label>
                  <input type="email" className="form-input" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Adresse</label>
                  <input type="text" className="form-input" value={editAddress} onChange={e => setEditAddress(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Prix max d'une réservation (Ar)</label>
                  <input type="number" required className="form-input" value={editMaxPrice} onChange={e => setEditMaxPrice(parseFloat(e.target.value))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Commission QueuePay (Ar)</label>
                  <input type="number" required className="form-input" value={editCommission} onChange={e => setEditCommission(parseFloat(e.target.value))} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '4px' }}>Description</label>
                <textarea className="form-input" style={{ minHeight: '60px' }} value={editDescription} onChange={e => setEditDescription(e.target.value)}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Sauvegarder les modifications</button>
                <button type="button" className="btn-secondary" style={{ flex: 0.4 }} onClick={() => setShowEditModal(false)}>Annuler</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL: DELETE CONFIRMATION ═══ */}
      {showDeleteModal && selectedEntity && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(41,37,36,0.3)', backdropFilter: 'blur(8px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ padding: '32px', width: '400px', background: '#FFFDFB', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>Supprimer le partenaire ?</h3>

            <p style={{ fontSize: '13px', color: 'var(--espresso-muted)', lineHeight: '1.5', marginBottom: '24px' }}>
              Êtes-vous sûr de vouloir supprimer définitivement la collaboration avec <strong>{selectedEntity.name}</strong> ?<br />
              Toutes les données associées (services, agents, tickets) seront supprimées. Cette action est irréversible.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" style={{ flex: 1, background: 'var(--danger)', boxShadow: 'none' }} onClick={handleDeleteEntitySubmit}>
                Oui, Supprimer
              </button>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
