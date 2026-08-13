import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import {
  Building2,
  Users,
  Clock,
  CreditCard,
  User,
  LogOut,
  Plus,
  Edit2,
  Check,
  Volume2,
  Tv,
  Monitor,
  CheckCircle,
  AlertTriangle,
  QrCode,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

import QueuePayLogo from './components/QueuePayLogo';
import ProgressBarLiquid from './components/ProgressBarLiquid';
import RegressBar from './components/RegressBar';
import DynamicIslandNotification, { triggerNotification } from './components/DynamicIslandNotification';
import AdminDashboard from './pages/AdminDashboard';
import EntityOnboarding from './pages/EntityOnboarding';
import CompanyDashboard from './pages/CompanyDashboard';
import AgentConsole from './pages/AgentConsole';

import { API_BASE_URL } from './config/api';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('token') || '');
  const [page, setPage] = useState('home'); // 'home', 'admin-login', 'admin-dash', 'entity-onboard', 'entity-login', 'entity-dash', 'agent-console', 'tv-display'
  const [onboardSlug, setOnboardSlug] = useState('');
  const [socket, setSocket] = useState(null);
  const [showLogoutRegress, setShowLogoutRegress] = useState(false);

  // Audio state
  const chimeAudio = useRef(null);

  // Parse location path for URL-based routing (/admin, /company, /entrp/:slug)
  useEffect(() => {
    const handleUrl = () => {
      const path = window.location.pathname;
      if (path.startsWith('/entrp/')) {
        const slug = path.split('/entrp/')[1];
        if (slug) {
          setOnboardSlug(slug);
          setPage('entity-onboard');
        }
      } else if (path === '/admin') {
        setPage('admin-login');
      } else if (path === '/company') {
        setPage('entity-login');
      } else if (path === '/tv') {
        setPage('tv-display');
      } else {
        setPage('home');
      }
    };
    handleUrl();
    window.addEventListener('popstate', handleUrl);
    return () => window.removeEventListener('popstate', handleUrl);
  }, []);

  // Fetch logged in user profile
  useEffect(() => {
    if (token) {
      sessionStorage.setItem('token', token);
      fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            // Redirect based on role (unless viewing the TV screen)
            if (window.location.pathname === '/tv') {
              setPage('tv-display');
              return;
            }

            if (data.user.role === 'ADMIN') {
              if (!window.location.pathname.startsWith('/entrp/')) {
                setPage('admin-dash');
                if (window.location.pathname !== '/admin') {
                  window.history.replaceState({}, '', '/admin');
                }
              }
            } else if (data.user.role === 'COMPANY') {
              setPage('entity-dash');
              // Keep /entrp/:slug URL if that's where they logged in from, otherwise show /company
              if (!window.location.pathname.startsWith('/entrp/')) {
                window.history.replaceState({}, '', '/company');
              }
            } else if (data.user.role === 'AGENT') {
              setPage('agent-console');
            } else {
              setPage('home');
            }
          } else {
            handleLogoutImmediate();
          }
        })
        .catch(() => handleLogoutImmediate());
    }
  }, [token]);

  // Connect WebSockets
  useEffect(() => {
    if (user) {
      const newSocket = io(API_BASE_URL);
      setSocket(newSocket);

      if (user.role === 'COMPANY' || user.role === 'AGENT') {
        newSocket.emit('joinEntity', user.entity_id);
      }

      return () => newSocket.disconnect();
    }
  }, [user]);

  // Initialize Speech Chime
  useEffect(() => {
    // Generate simple synth chime sounds dynamically since we don't have file imports
    const playChime = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Note 1
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc1.start();
        osc1.stop(audioCtx.currentTime + 0.5);

        // Note 2 slightly offset
        setTimeout(() => {
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.connect(gain2);
          gain2.connect(audioCtx.destination);
          osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
          gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
          osc2.start();
          osc2.stop(audioCtx.currentTime + 0.6);
        }, 150);

        // Note 3
        setTimeout(() => {
          const osc3 = audioCtx.createOscillator();
          const gain3 = audioCtx.createGain();
          osc3.connect(gain3);
          gain3.connect(audioCtx.destination);
          osc3.frequency.setValueAtTime(783.99, audioCtx.currentTime); // G5
          gain3.gain.setValueAtTime(0.15, audioCtx.currentTime);
          gain3.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
          osc3.start();
          osc3.stop(audioCtx.currentTime + 0.8);
        }, 300);

      } catch (err) {
        console.error('Audio synthesizer error:', err);
      }
    };
    window.playQueueChime = playChime;
  }, []);

  const handleLogoutImmediate = () => {
    sessionStorage.removeItem('token');
    setToken('');
    setUser(null);
    setPage('home');
    window.history.pushState({}, '', '/');
  };

  const handleLogoutWithRegress = () => {
    setShowLogoutRegress(true);
  };

  const handleLogoutCompleted = () => {
    setShowLogoutRegress(false);
    handleLogoutImmediate();
    triggerNotification('Session déconnectée avec succès', 'success');
  };

  // Navigate back to root
  const goHome = () => {
    window.history.pushState({}, '', '/');
    setPage('home');
  };

  // Render Portal Views
  return (
    <>
      <DynamicIslandNotification />
      <RegressBar active={showLogoutRegress} onComplete={handleLogoutCompleted} />

      {page === 'home' && <HomePortalSelect setPage={setPage} />}
      {page === 'admin-login' && <AdminLogin setToken={setToken} goHome={goHome} />}
      {page === 'admin-dash' && <AdminDashboard user={user} handleLogout={handleLogoutWithRegress} />}
      {page === 'entity-onboard' && <EntityOnboarding slug={onboardSlug} goHome={goHome} setPage={setPage} setToken={setToken} />}
      {page === 'entity-login' && <EntityLogin setToken={setToken} goHome={goHome} />}
      {page === 'entity-dash' && <CompanyDashboard user={user} handleLogout={handleLogoutWithRegress} />}
      {page === 'agent-console' && <AgentConsole user={user} socket={socket} handleLogout={handleLogoutWithRegress} />}
      {page === 'tv-display' && <TvDisplay goHome={goHome} />}
    </>
  );
}

// ==========================================
// 1. HOME PORTAL SELECT PAGE
// ==========================================
function HomePortalSelect({ setPage }) {
  const [entities, setEntities] = useState([]);
  const [showTvModal, setShowTvModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);

  const [progress, setProgress] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [activeStep, setActiveStep] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/client/entities`)
      .then(res => res.json())
      .then(data => {
        if (data.entities) setEntities(data.entities);
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!showExplanation) {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) { clearInterval(interval); return 100; }
          const step = prev < 60 ? 3 : prev < 85 ? 2 : 1;
          return Math.min(prev + step, 100);
        });
      }, 40);
      return () => clearInterval(interval);
    }
  }, [showExplanation]);

  const handleLinkNavigate = (path, pageName) => {
    window.history.pushState({}, '', path);
    setPage(pageName);
  };

  // ──── SPLASH LOADING SCREEN ────
  if (!showExplanation) {
    return (
      <div className="entity-onboarding-bg animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', maxWidth: '500px', textAlign: 'center' }}>
          <QueuePayLogo height={90} showText={false} />
          <h1 style={{ fontFamily: 'Outfit', fontSize: '44px', fontWeight: '900', color: '#292524', letterSpacing: '-2px', marginTop: '6px', lineHeight: '1' }}>
            Queue<span style={{ color: 'var(--saffron)' }}>Pay</span>
          </h1>
          <p style={{ color: 'var(--espresso-muted)', fontSize: '14px', fontWeight: '600', maxWidth: '320px' }}>
            Votre place dans la file d'attente, réservée depuis votre mobile.
          </p>
          <div style={{ width: '100%', marginTop: '20px' }}>
            <svg width="100%" height="60" viewBox="0 0 500 50" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
              <path d="M 10,25 Q 65,5 120,25 T 230,25 Q 285,5 340,25 T 450,25 Q 475,15 490,25" fill="none" stroke="rgba(41,37,36,0.06)" strokeWidth="5" strokeLinecap="round" />
              <path d="M 10,25 Q 65,5 120,25 T 230,25 Q 285,5 340,25 T 450,25 Q 475,15 490,25" fill="none" stroke="url(#saffronPG)" strokeWidth="5" strokeLinecap="round" strokeDasharray="620" strokeDashoffset={620 - (progress / 100) * 620} style={{ transition: 'stroke-dashoffset 0.08s ease-out', filter: 'drop-shadow(0 2px 6px rgba(249,115,22,0.25))' }} />
              <defs><linearGradient id="saffronPG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#F97316" /><stop offset="50%" stopColor="#FF9D5C" /><stop offset="100%" stopColor="#F97316" /></linearGradient></defs>
            </svg>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#292524', display: 'block', textAlign: 'center', marginTop: '8px' }}>{progress}%</span>
          </div>
          {progress >= 100 && (
            <button className="btn-primary animate-slide-up" style={{ marginTop: '24px', padding: '16px 48px', borderRadius: '40px', fontSize: '15px', fontWeight: '800', width: '100%', maxWidth: '300px', boxShadow: '0 8px 30px rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              onClick={() => { setShowExplanation(true); triggerNotification('Bienvenue sur QueuePay ! 🎉', 'success'); }}>
              Découvrir QueuePay <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ──── MAIN WALKTHROUGH PAGE ────
  const stepsData = [
    { num: '1', icon: <User size={20} color="#fff" />, title: "L'Administrateur enregistre un partenaire", text: <>Le super administrateur ajoute une entreprise partenaire (ex : <b>Jirama Majunga</b>, <b>BOA Antananarivo</b>) dans le système. Il configure le <b>prix maximum</b> autorisé pour un ticket (ex : 400 Ar) et la <b>commission QueuePay</b> (ex : 100 Ar). Un lien d'inscription unique est généré : <code style={{ background: 'rgba(249,115,22,0.08)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>/entrp/jiramaMajunga</code></> },
    { num: '2', icon: <Building2 size={20} color="#fff" />, title: "L'Entreprise configure ses services", text: <>L'entreprise accède à son lien privé. Elle voit son <b>logo à gauche</b> et celui de <b>QueuePay à droite</b>. Elle crée son mot de passe, puis configure ses <b>services</b> (ex : Légalisation, Branchement), les <b>horaires</b> (8h–17h, Lundi à Vendredi), la <b>durée moyenne</b> (10 min/client), et crée les comptes <b>agents de guichet</b>.</> },
    { num: '3', icon: <CreditCard size={20} color="#fff" />, title: "Le Client recharge et réserve", text: <>Le client ouvre l'app QueuePay, explore les entreprises et services. Il crédite son <b>portefeuille</b> via <b>MVola</b>, <b>Orange Money</b> ou <b>Airtel Money</b> (avec code PIN). Puis choisit un <b>service</b>, un <b>créneau</b>, et <b>paie son ticket</b>. Un ticket avec <b>QR Code</b> est généré instantanément.</> },
    { num: '4', icon: <Layers size={20} color="#fff" />, title: "L'Agent gère la file en Kanban", text: <>Chaque service a un <b>guichet dédié</b>. L'agent voit les tickets en <b>tableau Kanban</b>. Il clique <b>« Appeler le suivant »</b> et une <b>voix féminine en français</b> annonce : <i>"C'est le tour du numéro 001, veuillez passer au guichet de Légalisation"</i>. Il peut <b>scanner le QR Code</b> ou valider manuellement.</> },
    { num: '5', icon: <Monitor size={20} color="#fff" />, title: "L'Écran TV diffuse en direct", text: <>Un écran TV dans la <b>salle d'attente</b> affiche le <b>numéro appelé</b> en grand, le <b>guichet</b>, et un <b>tableau Kanban</b> de tous les tickets. Un <b>carillon sonore</b> retentit et l'<b>annonce vocale</b> est diffusée simultanément.</> },
  ];

  return (
    <div className="entity-onboarding-bg animate-fade-in" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '0' }}>

      {/* ═══ HEADER FULL WIDTH ═══ */}
      <header style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 48px',
        background: 'rgba(255,253,251,0.55)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderBottom: '1px solid rgba(234,216,195,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(41,37,36,0.05)',
        boxSizing: 'border-box'
      }}>

        {/* ◀◀◀ FAR LEFT: Logo QueuePay */}
        <div
          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}
          onClick={() => { setShowExplanation(false); setProgress(0); }}
        >
          <QueuePayLogo height={42} showText={true} />
        </div>

        {/* ▶▶▶ FAR RIGHT: Contact button */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowContactDropdown(!showContactDropdown)}
            style={{
              background: showContactDropdown ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.6)',
              border: showContactDropdown ? '1.5px solid rgba(249,115,22,0.3)' : '1.5px solid rgba(234,216,195,0.45)',
              borderRadius: '30px',
              padding: '11px 24px',
              fontWeight: '700',
              fontSize: '13px',
              fontFamily: "'Inter', 'Outfit', sans-serif",
              color: '#292524',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.25s ease',
              boxShadow: '0 2px 12px rgba(41,37,36,0.05)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(249,115,22,0.08)';
              e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)';
            }}
            onMouseLeave={e => {
              if (!showContactDropdown) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.borderColor = 'rgba(234,216,195,0.45)';
              }
            }}
          >
            {/* Phone + Mail icons inline */}
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            </span>
            Contacter l'administrateur
          </button>

          {/* Dropdown */}
          {showContactDropdown && (
            <>
              <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99 }} onClick={() => setShowContactDropdown(false)} />
              <div style={{
                position: 'absolute',
                right: 0,
                top: '56px',
                width: '310px',
                background: 'rgba(255,253,251,0.98)',
                backdropFilter: 'blur(20px)',
                padding: '10px',
                boxShadow: '0 16px 56px rgba(41,37,36,0.14), 0 0 0 1px rgba(234,216,195,0.3)',
                borderRadius: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                zIndex: 100,
                animation: 'fadeSlideDown 0.2s ease-out'
              }}>
                {/* Email option */}
                <a href="mailto:rouhedmouhamed@gmail.com"
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px', textDecoration: 'none', color: '#292524', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,115,22,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #F97316, #FF9D5C)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 10px rgba(249,115,22,0.2)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>Envoyer un e-mail</div>
                    <div style={{ fontSize: '11px', color: 'var(--espresso-muted)', marginTop: '3px' }}>rouhedmouhamed@gmail.com</div>
                  </div>
                </a>
                <div style={{ height: '1px', background: 'rgba(234,216,195,0.3)', margin: '0 16px' }} />
                {/* Phone option */}
                <a href="tel:0373120978"
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '14px', textDecoration: 'none', color: '#292524', fontSize: '13px', fontWeight: '600', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #10B981, #34D399)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 3px 10px rgba(16,185,129,0.2)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.88.37 1.73.7 2.54a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.81.34 1.66.57 2.54.7A2 2 0 0 1 22 16.92z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '14px' }}>Appeler directement</div>
                    <div style={{ fontSize: '11px', color: 'var(--espresso-muted)', marginTop: '3px' }}>037 31 209 78</div>
                  </div>
                </a>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main style={{ flex: 1, padding: '60px 20px 80px', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

        {/* Hero */}
        <section style={{ textAlign: 'center', marginBottom: '70px' }} className="animate-slide-up">
          <span style={{ fontSize: '11px', color: 'var(--saffron)', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', background: 'rgba(249,115,22,0.06)', padding: '8px 20px', borderRadius: '24px', border: '1px solid rgba(249,115,22,0.1)' }}>
            Système de Gestion de File d'Attente Premium
          </span>
          <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#292524', marginTop: '24px', letterSpacing: '-2px', lineHeight: '1.15' }}>
            Fini les files d'attente physiques.
          </h1>
          <p style={{ fontSize: '17px', color: 'var(--espresso-muted)', marginTop: '20px', maxWidth: '700px', margin: '20px auto 0', fontWeight: '500', lineHeight: '1.7' }}>
            QueuePay connecte les <b>entreprises</b> et leurs <b>clients</b> à Madagascar. Réservez votre ticket à distance, payez via Mobile Money, et suivez votre tour en temps réel.
          </p>
        </section>

        {/* ═══ ACCORDION STEPS ═══ */}
        <section style={{ marginBottom: '80px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '900', textAlign: 'center', color: '#292524', marginBottom: '16px', letterSpacing: '-1px' }}>Comment fonctionne QueuePay ?</h2>
          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--espresso-muted)', marginBottom: '40px', fontWeight: '500' }}>Cliquez sur une étape pour voir les détails</p>

          {/* Step Number Pills Row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            {stepsData.map((step) => (
              <button
                key={step.num}
                onClick={() => setActiveStep(activeStep === step.num ? null : step.num)}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  fontWeight: '900',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                  background: activeStep === step.num
                    ? 'linear-gradient(135deg, #F97316, #FF9D5C)'
                    : 'rgba(255,255,255,0.7)',
                  color: activeStep === step.num ? '#fff' : '#292524',
                  boxShadow: activeStep === step.num
                    ? '0 6px 24px rgba(249,115,22,0.35)'
                    : '0 2px 8px rgba(41,37,36,0.06)',
                  transform: activeStep === step.num ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {step.num}
              </button>
            ))}
          </div>

          {/* Expanded Step Detail (Accordion Panel) */}
          {activeStep && (() => {
            const step = stepsData.find(s => s.num === activeStep);
            if (!step) return null;
            return (
              <div
                key={step.num}
                className="glass-panel animate-slide-up"
                style={{
                  padding: '36px 40px',
                  borderRadius: '24px',
                  maxWidth: '800px',
                  margin: '0 auto',
                  background: 'rgba(255,253,251,0.85)',
                  border: '1px solid rgba(234,216,195,0.4)',
                  boxShadow: '0 8px 32px rgba(41,37,36,0.08)',
                  backdropFilter: 'blur(16px)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #F97316, #FF9D5C)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(249,115,22,0.2)'
                  }}>
                    {step.icon}
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--saffron)', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase' }}>Étape {step.num}</span>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#292524', marginTop: '2px' }}>{step.title}</h3>
                  </div>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--espresso-muted)', lineHeight: '1.8' }}>{step.text}</p>
              </div>
            );
          })()}

          {!activeStep && (
            <div style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
              <ArrowRight size={24} color="var(--saffron)" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
              <p style={{ fontSize: '13px', color: 'var(--espresso-muted)', marginTop: '8px', fontWeight: '600' }}>Sélectionnez une étape ci-dessus</p>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer style={{ textAlign: 'center', paddingTop: '40px', borderTop: '1px solid rgba(234,216,195,0.25)' }}>
          <QueuePayLogo height={28} />
          <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginTop: '12px', fontWeight: '500' }}>
            © 2026 QueuePay — Système de gestion de files d'attente intelligente à Madagascar.
          </p>
        </footer>
      </main>

      {showTvModal && (
        <EntitySelectModal title="Sélectionner l'écran TV à afficher" entities={entities} onClose={() => setShowTvModal(false)} onSelect={(id) => { window.location.href = `/tv?entityId=${id}`; }} />
      )}
      {showAgentModal && (
        <EntitySelectModal title="Connexion Guichet Agent" entities={entities} onClose={() => setShowAgentModal(false)} onSelect={() => { handleLinkNavigate('/company', 'entity-login'); }} isAgent />
      )}
    </div>
  );
}



function EntitySelectModal({ title, entities, onClose, onSelect, isAgent }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(41,37,36,0.3)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ padding: '32px', width: '380px', background: '#FFFDFB' }}>
        <h3 style={{ marginBottom: '16px' }}>{title}</h3>
        {isAgent ? (
          <div style={{ marginBottom: '24px' }}>
            <p style={{ fontSize: '13px', color: 'var(--espresso-muted)' }}>
              Les agents de guichet doivent s'authentifier avec leur compte nominatif. Veuillez vous connecter dans l'Espace Entreprise.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', marginBottom: '20px' }}>
            {entities.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--espresso-muted)', textAlign: 'center' }}>Aucune entreprise active</p>
            ) : (
              entities.map(e => (
                <button
                  key={e.id}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', padding: '12px 16px', borderRadius: '10px' }}
                  onClick={() => onSelect(e.id)}
                >
                  {e.logo_url ? <img src={e.logo_url} width="24" height="24" style={{ borderRadius: '50%', marginRight: '8px' }} /> : <Building2 size={16} style={{ marginRight: '8px' }} />}
                  {e.name}
                </button>
              ))
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAgent && (
            <button className="btn-primary" style={{ flex: 1 }} onClick={onSelect}>Se connecter</button>
          )}
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. ADMIN LOGIN PAGE
// ==========================================
function AdminLogin({ setToken, goHome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          if (data.user.role !== 'ADMIN') {
            setError('Accès réservé uniquement au Super Admin');
          } else {
            setToken(data.token);
            triggerNotification('Connexion Admin réussie', 'success');
          }
        } else {
          setError(data.error || 'Identifiants invalides');
        }
      })
      .catch(() => setError('Erreur de communication avec le serveur'));
  };

  return (
    <div className="entity-onboarding-bg animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="glass-panel" style={{ padding: '40px', width: '400px', background: 'rgba(255,253,251,0.9)' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <QueuePayLogo height={36} />
          <h2 style={{ marginTop: '16px', fontSize: '20px', fontWeight: '800' }}>Super Administrateur</h2>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--espresso-muted)', marginBottom: '6px' }}>Email Administrateur</label>
            <input type="email" required className="form-input" placeholder="admin@queuepay.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--espresso-muted)', marginBottom: '6px' }}>Mot de passe</label>
            <input type="password" required className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
            Connexion
          </button>
          <button type="button" className="btn-secondary" onClick={goHome}>
            Retour à l'accueil
          </button>
        </form>
      </div>
    </div>
  );
}

// 3. SUPER ADMIN DASHBOARD (Moved to e:/EXAM S2/QueuePay/web/src/pages/AdminDashboard.jsx)

// 4. ENTITY ONBOARDING REGISTRATION PAGE (Moved to e:/EXAM S2/QueuePay/web/src/pages/EntityOnboarding.jsx)

// ==========================================
// 5. ENTITY LOGIN PAGE
// ==========================================
function EntityLogin({ setToken, goHome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_id: email, password })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          if (data.user.role !== 'COMPANY' && data.user.role !== 'AGENT') {
            setError('Accès réservé uniquement aux entreprises');
          } else {
            setToken(data.token);
            triggerNotification('Connexion entreprise réussie', 'success');
          }
        } else {
          setError(data.error || 'Identifiants invalides');
        }
      })
      .catch(() => setError('Erreur de communication avec le serveur'));
  };

  return (
    <div className="entity-onboarding-bg animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div className="glass-panel" style={{ padding: '40px', width: '400px', background: 'rgba(255,253,251,0.92)' }}>

        {/* Double Logo: Placeholders left/right */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--champagne)', paddingBottom: '16px' }}>
          <div>
            <Building2 size={24} color="var(--saffron)" />
          </div>
          <div>
            <QueuePayLogo height={32} showText={false} />
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Connexion Espace Marchand</h2>
          <p style={{ fontSize: '12px', color: 'var(--espresso-muted)', marginTop: '4px' }}>Accéder à la console administrative ou agent de guichet.</p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: '600' }}>
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px' }}>Email professionnel / ID</label>
            <input type="email" required className="form-input" placeholder="nom@entreprise.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px' }}>Mot de passe</label>
            <input type="password" required className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '8px' }}>
            Connexion Espace Pro
          </button>
          <button type="button" className="btn-secondary" onClick={goHome}>
            Retour à l'accueil
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 6. ENTITY DASHBOARD (COMPANY ADMIN PORTAL)
// ==========================================
// 6. ENTITY DASHBOARD (COMPANY ADMIN PORTAL) (Moved to e:/EXAM S2/QueuePay/web/src/pages/CompanyDashboard.jsx)



// ==========================================
// 8. PUBLIC TV QUEUE SCREEN DISPLAY (/tv?entityId=1)
// ==========================================
function TvDisplay({ goHome }) {
  const [entity, setEntity] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentCall, setCurrentCall] = useState(null);
  const [flashing, setFlashing] = useState(false);
  const [socket, setSocket] = useState(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [lastCalledId, setLastCalledId] = useState(null);

  const getEntityIdFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('entityId');
  };

  const entityId = getEntityIdFromUrl();

  // Define Web Audio Chime player
  const playQueueChime = () => {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!window.tvAudioCtx) {
        window.tvAudioCtx = new AudioCtxClass();
      }
      const ctx = window.tvAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const playNote = (freq, startTime, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      const now = ctx.currentTime;
      playNote(523.25, now, 0.4);        // C5 note
      playNote(659.25, now + 0.18, 0.4);  // E5 note
      playNote(783.99, now + 0.36, 0.7);  // G5 note
    } catch (e) {
      console.error('Audio chime error:', e);
    }
  };
  window.playQueueChime = playQueueChime;

  const unlockAudio = () => {
    try {
      playQueueChime();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const testUtterance = new SpeechSynthesisUtterance("Son de la TV activé");
        testUtterance.lang = 'fr-FR';
        testUtterance.volume = 0.8;
        window.speechSynthesis.speak(testUtterance);
      }
      setAudioUnlocked(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Listen to any user click or press on TV screen to unlock browser audio policy
  useEffect(() => {
    const handleInteraction = () => {
      if (!audioUnlocked) {
        unlockAudio();
      }
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [audioUnlocked]);

  const announceCall = (ticketData) => {
    if (!ticketData) return;
    setCurrentCall(ticketData);
    setFlashing(true);
    setTimeout(() => setFlashing(false), 7000);

    // Play 3-tone chime
    playQueueChime();

    // Vocal announcement in French
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const numClean = ticketData.ticket_number ? ticketData.ticket_number.replace(/^0+/, '') : '';
        const deskText = ticketData.desk_name ? ticketData.desk_name.split(' - ')[0] : 'le guichet';
        const serviceText = ticketData.service_name || '';
        const text = `Ticket numéro ${numClean}, veuillez vous présenter au ${deskText} pour ${serviceText}.`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.85;
        utterance.pitch = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.error('Speech synthesis error:', e);
      }
    }
  };

  const fetchTvData = () => {
    if (!entityId) return;
    fetch(`${API_BASE_URL}/client/entities`)
      .then(res => res.json())
      .then(data => {
        if (data.entities) {
          const e = data.entities.find(item => item.id.toString() === entityId.toString());
          if (e) setEntity(e);
        }
      });
  };

  const fetchTvQueue = () => {
    if (!entityId) return;
    fetch(`${API_BASE_URL}/client/entities/${entityId}/tv-queue`)
      .then(res => res.json())
      .then(data => {
        if (data.queue) {
          setQueue(data.queue);
          const activeCall = data.queue.find(t => t.status === 'CALLING');
          if (activeCall) {
            setCurrentCall({
              ticket_number: activeCall.ticket_number,
              service_name: activeCall.service_name,
              desk_name: activeCall.desk_name
            });
          }
        }
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (entityId) {
      fetchTvData();
      fetchTvQueue();

      const newSocket = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log(`TV Screen joined entity room: entity:${entityId}`);
        newSocket.emit('joinEntity', entityId);
      });

      newSocket.on('queueUpdate', () => {
        console.log('TV Screen WS Event: queueUpdate received, refreshing queue...');
        fetchTvQueue();
      });

      newSocket.on('ticketCall', (ticketData) => {
        console.log('TV Screen WS Event: ticketCall received!', ticketData);
        announceCall(ticketData);
        fetchTvQueue();
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [entityId]);

  // Polling fallback to keep TV screen synchronized
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTvQueue();
    }, 4000);
    return () => clearInterval(timer);
  }, [entityId]);

  // Live Digital Clock state
  const [timeStr, setTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!entityId) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#0D0B0A', minHeight: '100vh', color: '#FFFDFB' }}>
        <h2>Erreur : Aucun ID d'entreprise spécifié pour l'affichage TV.</h2>
        <button className="btn-primary" onClick={goHome} style={{ marginTop: '20px' }}>Retour à l'accueil</button>
      </div>
    );
  }

  // Define Web Audio Chime player
  if (typeof window !== 'undefined' && !window.playQueueChime) {
    window.playQueueChime = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const playNote = (freq, startTime, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        const now = ctx.currentTime;
        playNote(659.25, now, 0.5); // E5 note
        playNote(880.00, now + 0.22, 0.8); // A5 note
      } catch (e) {
        console.error('Audio chime error:', e);
      }
    };
  }

  // Filter calling tickets & services map
  const callingTickets = queue.filter(t => t.status === 'CALLING');

  const servicesMap = {};
  queue.forEach(t => {
    if (!servicesMap[t.service_name]) {
      servicesMap[t.service_name] = { callingList: [], pendingList: [] };
    }
    if (t.status === 'CALLING') {
      servicesMap[t.service_name].callingList.push({ ticket_number: t.ticket_number, desk_name: t.desk_name });
    } else if (t.status === 'PENDING') {
      servicesMap[t.service_name].pendingList.push(t.ticket_number);
    }
  });

  return (
    <div style={{ background: '#090807', minHeight: '100vh', color: '#FFFDFB', display: 'flex', flexDirection: 'column', padding: '20px 32px', boxSizing: 'border-box', fontFamily: 'Outfit, sans-serif' }} className="animate-fade-in">

      {/* Premium TV Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '14px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {entity?.logo_url ? (
            <img src={entity.logo_url} height="52" style={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.12)', background: '#FFFDFB', padding: '4px' }} alt="Logo" />
          ) : (
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'rgba(249,115,22,0.15)', border: '1px solid var(--saffron)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={28} color="var(--saffron)" />
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', color: '#FFFDFB', margin: 0, fontFamily: 'Outfit' }}>{entity?.name}</h1>
            <p style={{ color: 'rgba(255,253,251,0.5)', fontSize: '12px', fontWeight: '600', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }}></span>
              Suivi Temps Réel des Files d'Attente Aux Guichets
            </p>
          </div>
        </div>

        {/* Right side: Live Digital Clock & QueuePay Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', padding: '6px 16px', borderRadius: '10px', textAlign: 'right' }}>
            <span style={{ fontSize: '20px', fontWeight: '900', fontFamily: 'monospace', color: 'var(--saffron)', letterSpacing: '1px' }}>{timeStr}</span>
          </div>
          <QueuePayLogo height={32} showText={true} />
          <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,253,251,0.7)', border: '1px solid rgba(255,255,255,0.1)', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }} onClick={goHome}>
            Quitter
          </button>
        </div>
      </header>

      {/* Main TV Layout Grid: Pure 50/50 split without any duplication */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '24px', flex: 1, alignItems: 'stretch' }}>

        {/* Left Column: Multi-Call Compact Cards Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFDFB', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }}></span>
              Appels aux Guichets en Direct ({callingTickets.length})
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
            {callingTickets.length > 0 ? (
              callingTickets.map(t => {
                const isLatestCall = currentCall?.ticket_number === t.ticket_number;
                return (
                  <div
                    key={t.id}
                    style={{
                      background: (flashing && isLatestCall) ? 'linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(16,185,129,0.12) 100%)' : 'rgba(255,255,255,0.03)',
                      border: (flashing && isLatestCall) ? '2px solid var(--saffron)' : '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '16px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: (flashing && isLatestCall) ? '0 0 40px rgba(249,115,22,0.25)' : '0 4px 16px rgba(0,0,0,0.2)',
                      transition: 'all 0.3s ease'
                    }}
                    className="animate-slide-up"
                  >
                    <div>
                      <span style={{ fontSize: '10px', color: 'rgba(255,253,251,0.4)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '1px', display: 'block' }}>
                        NUMÉRO APPELÉ
                      </span>
                      <h1 style={{ fontSize: '42px', fontWeight: '900', color: 'var(--saffron)', margin: '0', lineHeight: '1', fontFamily: 'Outfit', textShadow: '0 2px 15px rgba(249,115,22,0.3)' }}>
                        N° {t.ticket_number}
                      </h1>
                    </div>

                    <div style={{ textAlign: 'right', flex: 1 }}>
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                          color: '#FFFDFB',
                          fontSize: '15px',
                          fontWeight: '900',
                          padding: '6px 14px',
                          borderRadius: '10px',
                          display: 'inline-block',
                          boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
                          marginBottom: '4px'
                        }}
                      >
                        {t.desk_name ? t.desk_name.split(' - ')[0] : 'Guichet'}
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(255,253,251,0.7)', fontWeight: '700', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {t.service_name}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,253,251,0.3)' }}>
                <Clock size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '12px' }} />
                <h3 style={{ fontSize: '16px', margin: 0, fontWeight: '800' }}>Aucun appel en cours</h3>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Les numéros appelés au guichet s'afficheront ici.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multi-Service Kanban Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFDFB', margin: 0 }}>
              Files d'Attente par Service ({Object.keys(servicesMap).length} service{Object.keys(servicesMap).length > 1 ? 's' : ''})
            </h2>
            <span style={{ fontSize: '12px', color: 'rgba(255,253,251,0.4)', fontWeight: '700' }}>
              {queue.length} ticket(s) actif(s)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', flex: 1, maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
            {Object.keys(servicesMap).length === 0 ? (
              <p style={{ color: 'rgba(255,253,251,0.4)', textAlign: 'center', padding: '40px 0', gridColumn: '1 / -1' }}>Aucun ticket actif en attente pour le moment.</p>
            ) : (
              Object.keys(servicesMap).map(serviceName => {
                const serviceQueue = servicesMap[serviceName];
                return (
                  <div
                    key={serviceName}
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '18px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <h3 style={{ fontSize: '14px', color: 'var(--saffron)', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={serviceName}>
                      {serviceName}
                    </h3>
                    
                    {/* Active Calling items for this service */}
                    {serviceQueue.callingList.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {serviceQueue.callingList.map((item, idx) => (
                          <div key={idx} style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid #10B981', padding: '10px 12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#10B981', textTransform: 'uppercase' }}>
                              {item.desk_name ? item.desk_name.split(' - ')[0] : 'Guichet'}
                            </span>
                            <strong style={{ fontSize: '20px', color: '#10B981', fontFamily: 'Outfit', fontWeight: '900' }}>
                              N° {item.ticket_number}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '10px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.06)', textAlign: 'center', color: 'rgba(255,253,251,0.25)', fontSize: '11px' }}>
                        Aucun client au guichet
                      </div>
                    )}
                    
                    {/* Upcoming Pending tickets list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,253,251,0.4)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prochains numéros :</span>
                      {serviceQueue.pendingList.map(ticketNum => (
                        <div
                          key={ticketNum}
                          style={{
                            fontSize: '14px',
                            fontWeight: '800',
                            background: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,253,251,0.9)',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.04)',
                            textAlign: 'center',
                            fontFamily: 'Outfit'
                          }}
                        >
                          N° {ticketNum}
                        </div>
                      ))}
                      {serviceQueue.pendingList.length === 0 && serviceQueue.callingList.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'rgba(255,253,251,0.2)', fontSize: '11px', padding: '8px 0' }}>Aucun ticket en attente</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Footer Ticker Banner */}
      <footer style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'rgba(255,253,251,0.5)' }}>
        <span>📍 <strong>{entity?.name}</strong> • Système de gestion de file d'attente QueuePay</span>
        <span>📢 Présentez-vous au guichet indiqué dès que votre numéro s'affiche sur cet écran.</span>
      </footer>

    </div>
  );
}
