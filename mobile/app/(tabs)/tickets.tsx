import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationContext';
import { API_BASE_URL } from '@/constants/api';
import QueueRadar from '@/components/QueueRadar';

export default function TicketsHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { socket, triggerNotification } = useNotifications();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const fetchTickets = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setIsLoggedIn(false);
        setTickets([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setIsLoggedIn(true);
      const res = await fetch(`${API_BASE_URL}/client/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets);
      }
    } catch (err) {
      console.error('Fetch Tickets Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReactivateTicket = async (ticketId: number) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/client/tickets/${ticketId}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification('Ticket réactivé ! ⚡', data.message, 'success');
        Alert.alert('Ticket Réactivé ! ⚡', data.message);
        fetchTickets();
      } else {
        triggerNotification('Erreur', data.error || 'Impossible de réactiver.', 'error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelTicket = async (ticketId: number) => {
    Alert.alert(
      "Annuler ce ticket ?",
      "Êtes-vous sûr de vouloir annuler ce ticket ?",
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, Annuler",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`${API_BASE_URL}/client/tickets/${ticketId}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await res.json();
              if (res.ok) {
                triggerNotification('Ticket annulé', data.message, 'info');
                fetchTickets();
              } else {
                triggerNotification('Erreur', data.error || 'Impossible d\'annuler.', 'error');
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    if (socket) {
      const handleLiveUpdate = () => {
        fetchTickets();
      };
      socket.on('queueUpdate', handleLiveUpdate);
      socket.on('entityUpdate', handleLiveUpdate);
      socket.on('ticketCall', handleLiveUpdate);
      return () => {
        socket.off('queueUpdate', handleLiveUpdate);
        socket.off('entityUpdate', handleLiveUpdate);
        socket.off('ticketCall', handleLiveUpdate);
      };
    }
  }, [socket]);

  useFocusEffect(
    React.useCallback(() => {
      fetchTickets();
      const interval = setInterval(() => {
        fetchTickets();
      }, 3000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const filteredTickets = tickets.filter((t: any) => {
    if (filter === 'pending') return t.status === 'PENDING' || t.status === 'CALLING';
    if (filter === 'completed') return t.status === 'COMPLETED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CALLING':
        return { text: '🟢 À VOTRE TOUR', bg: '#10B981', color: '#FFFDFB' };
      case 'PENDING':
        return { text: 'EN ATTENTE', bg: 'rgba(249, 115, 22, 0.1)', color: '#F97316' };
      case 'COMPLETED':
        return { text: 'TERMINÉ', bg: 'rgba(16, 185, 129, 0.1)', color: '#10B981' };
      case 'ABSENT':
        return { text: 'ABSENT', bg: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' };
      default:
        return { text: status, bg: '#FAF6F0', color: '#78716C' };
    }
  };

  const renderTicketCard = ({ item }: { item: any }) => {
    const badge = getStatusBadge(item.status);
    const isCalling = item.status === 'CALLING';

    const formattedDate = item.booking_date ? new Date(item.booking_date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) : '';

    return (
      <TouchableOpacity 
        style={[styles.ticketStubCard, isCalling && styles.ticketStubCardCalling]}
        onPress={() => router.push({ pathname: '/ticket-detail', params: { ticketId: item.id } })}
        activeOpacity={0.88}
      >
        {/* Top Entity Info */}
        <View style={styles.stubHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stubEntityName} numberOfLines={1}>{item.entity_name}</Text>
            <Text style={styles.stubServiceName} numberOfLines={1}>{item.service_name}</Text>
          </View>

          <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgePillText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        </View>

        {/* Compact Queue Radar Orbit Badge for Active Tickets */}
        {(item.status === 'PENDING' || item.status === 'CALLING') && (
          <QueueRadar
            compact
            position={item.position || (item.people_ahead !== undefined ? item.people_ahead + 1 : 1)}
            clientsAhead={item.people_ahead || 0}
            status={item.status}
            myTicketNumber={item.ticket_number}
            myTimeSlot={item.time_slot}
            deskName={item.desk_name}
          />
        )}

        {/* Ticket Big Number */}
        <View style={styles.stubBody}>
          <Text style={styles.stubNumberLabel}>N° DE TICKET</Text>
          <Text style={[styles.stubNumberValue, isCalling && { color: '#10B981' }]}>
            {item.ticket_number}
          </Text>
        </View>

        {/* Dash divider */}
        <View style={styles.stubDivider} />

        {/* Ticket Footer Details */}
        <View style={styles.stubFooter}>
          <View>
            <Text style={styles.footerLabel}>Date & Heure</Text>
            <Text style={styles.footerValue}>{formattedDate} • {item.time_slot ? item.time_slot.slice(0, 5) : '08:00'}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerLabel}>Prix du Ticket</Text>
            <Text style={styles.footerValue}>{item.price ? `${item.price} Ar` : 'Gratuit'}</Text>
          </View>
        </View>

        {/* Action button bar */}
        <View style={styles.stubActionRow}>
          <Ionicons name="qr-code-outline" size={16} color="#F97316" />
          <Text style={styles.stubActionText}>Voir le pass QR & Suivi en direct</Text>
          <Ionicons name="chevron-forward" size={16} color="#F97316" />
        </View>

        {/* ABSENT Status Action Bar */}
        {item.status === 'ABSENT' && (
          <View style={styles.absentBox}>
            <View style={styles.absentHeader}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.absentTitle}>VOUS AVEZ ÉTÉ MARQUÉ ABSENT</Text>
            </View>
            <Text style={styles.absentSubtitle}>
              Vous avez manqué votre passage au guichet. Cliquez sur Réactiver pour vous replacer à la fin de la file d'attente.
            </Text>
            <View style={styles.absentButtonRow}>
              <TouchableOpacity
                style={styles.reactivateButton}
                onPress={() => handleReactivateTicket(item.id)}
                activeOpacity={0.88}
              >
                <Ionicons name="flash" size={15} color="#FFF" />
                <Text style={styles.reactivateButtonText}>⚡ Réactiver (En fin de file)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelTicketButton}
                onPress={() => handleCancelTicket(item.id)}
                activeOpacity={0.88}
              >
                <Ionicons name="trash-outline" size={15} color="#EF4444" />
                <Text style={styles.cancelTicketButtonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      
      {/* 1. Unauthorized state */}
      {!isLoggedIn ? (
        <View style={styles.anonymousContainer}>
          <View style={styles.anonIconBadge}>
            <Ionicons name="ticket-outline" size={48} color="#F97316" />
          </View>
          <Text style={styles.anonTitle}>Mes Tickets d'attente</Text>
          <Text style={styles.anonText}>
            Connectez-vous pour voir vos réservations actives, suivre votre tour en temps réel et garder l'historique de vos passages.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')} activeOpacity={0.88}>
            <Text style={styles.loginButtonText}>Se connecter à mon compte</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
          
          <Text style={styles.pageTitle}>Mes Tickets</Text>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            <TouchableOpacity 
              style={[styles.filterPill, filter === 'all' && styles.filterPillActive]} 
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterPillText, filter === 'all' && styles.filterPillTextActive]}>Tous</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterPill, filter === 'pending' && styles.filterPillActive]} 
              onPress={() => setFilter('pending')}
            >
              <Text style={[styles.filterPillText, filter === 'pending' && styles.filterPillTextActive]}>En attente</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterPill, filter === 'completed' && styles.filterPillActive]} 
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterPillText, filter === 'completed' && styles.filterPillTextActive]}>Terminés</Text>
            </TouchableOpacity>
          </View>

          {/* List of tickets */}
          <FlatList
            data={filteredTickets}
            keyExtractor={(item: any) => item.id.toString()}
            renderItem={renderTicketCard}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="#D6D3D1" />
                <Text style={styles.emptyText}>Aucun ticket trouvé</Text>
              </View>
            }
          />
        </View>
      )}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  anonymousContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  anonIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF6F0',
    borderWidth: 1.5,
    borderColor: '#EAD8C3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  anonTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 10,
  },
  anonText: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  loginButton: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButtonText: {
    color: '#FFFDFB',
    fontSize: 14,
    fontWeight: '800',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
  },
  filterPillActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78716C',
  },
  filterPillTextActive: {
    color: '#FFFDFB',
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 100,
  },
  ticketStubCard: {
    backgroundColor: '#FFFDFB',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#F2E8DF',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ticketStubCardCalling: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    shadowColor: '#10B981',
    shadowOpacity: 0.15,
  },
  stubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stubEntityName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
  },
  stubServiceName: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  badgePill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  stubBody: {
    marginVertical: 4,
  },
  stubNumberLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A8A29E',
    letterSpacing: 1,
  },
  stubNumberValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#F97316',
    letterSpacing: -1,
    marginTop: 2,
  },
  stubDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#F7EBE1',
    borderStyle: 'dashed',
    marginVertical: 14,
  },
  stubFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 10,
    color: '#A8A29E',
    fontWeight: '600',
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    marginTop: 2,
  },
  stubActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FAF6F0',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#EAD8C3',
  },
  stubActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F97316',
  },
  absentBox: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  absentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  absentTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  absentSubtitle: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 4,
    lineHeight: 15,
    fontWeight: '500',
  },
  absentButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  reactivateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  reactivateButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  cancelTicketButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  cancelTicketButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#A8A29E',
    fontWeight: '600',
  },
});
