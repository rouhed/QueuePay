import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import QueuePayLogo from '@/components/QueuePayLogo';
import { useNotifications } from '@/contexts/NotificationContext';
import { API_BASE_URL } from '@/constants/api';

export default function ClientHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { socket, triggerNotification } = useNotifications();
  const [entities, setEntities] = useState<any[]>([]);
  const [activeTickets, setActiveTickets] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pulse animation for CALLING badge
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const bellPulseAnim = React.useRef(new Animated.Value(1)).current;

  const triggerBellFlashing = () => {
    Animated.sequence([
      Animated.timing(bellPulseAnim, { toValue: 1.35, duration: 220, useNativeDriver: true }),
      Animated.timing(bellPulseAnim, { toValue: 0.85, duration: 220, useNativeDriver: true }),
      Animated.timing(bellPulseAnim, { toValue: 1.25, duration: 220, useNativeDriver: true }),
      Animated.timing(bellPulseAnim, { toValue: 0.95, duration: 220, useNativeDriver: true }),
      Animated.timing(bellPulseAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch user profile from storage
      const userStr = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      if (userStr) {
        setUser(JSON.parse(userStr));
      } else {
        setUser(null);
      }

      // 2. Fetch entities
      const entitiesRes = await fetch(`${API_BASE_URL}/client/entities`);
      const entitiesData = await entitiesRes.json();
      if (entitiesData.entities) {
        setEntities(entitiesData.entities);
      }

      // 3. Fetch user's active tickets if logged in
      if (token) {
        const ticketsRes = await fetch(`${API_BASE_URL}/client/tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const ticketsData = await ticketsRes.json();
        if (ticketsData.tickets) {
          // Filter only PENDING or CALLING
          const pending = ticketsData.tickets.filter((t: any) => t.status === 'PENDING' || t.status === 'CALLING');
          setActiveTickets(pending);
        }
      } else {
        setActiveTickets([]);
      }
    } catch (err) {
      console.error('Fetch Home Data Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  // Listen to WebSocket broadcasts for immediate status updates on tickets & entities
  useEffect(() => {
    if (socket) {
      const handleUpdate = async () => {
        triggerBellFlashing();

        // Fetch fresh tickets to trigger custom step-by-step position alert
        const token = await AsyncStorage.getItem('token');
        if (token) {
          try {
            const ticketsRes = await fetch(`${API_BASE_URL}/client/tickets`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const ticketsData = await ticketsRes.json();
            if (ticketsData.tickets) {
              const pending = ticketsData.tickets.filter((t: any) => t.status === 'PENDING' || t.status === 'CALLING');
              setActiveTickets(pending);

              if (pending.length > 0) {
                const t = pending[0];
                if (t.status === 'CALLING') {
                  triggerNotification('🟢 C\'EST VOTRE TOUR !', `Ticket N°${t.ticket_number} appelé ! Passez au ${t.desk_name || 'Guichet'} chez ${t.entity_name}.`, 'success');
                } else if (t.position === 1) {
                  triggerNotification('🔔 PROCHAIN EN LIGNE (Position 1)', `Votre tour est imminent ! 0 personne devant vous chez ${t.entity_name}.`, 'info');
                } else if (t.position === 2) {
                  triggerNotification('⚠️ POSITION 2 (1 personne devant)', `Préparez-vous ! Plus que 1 personne devant vous chez ${t.entity_name}.`, 'info');
                } else if (t.position === 3) {
                  triggerNotification('⚠️ POSITION 3 (2 personnes devant)', `Votre tour approche ! Il reste 2 personnes avant votre passage chez ${t.entity_name}.`, 'info');
                } else {
                  triggerNotification('⚡ AVANCEMENT DE FILE', `Ticket N°${t.ticket_number} : Position ${t.position} (${t.people_ahead} personnes devant).`, 'info');
                }
              }
            }
          } catch (e) {
            console.error(e);
          }
        }

        fetchData();
      };
      socket.on('queueUpdate', handleUpdate);
      socket.on('entityUpdate', handleUpdate);
      return () => {
        socket.off('queueUpdate', handleUpdate);
        socket.off('entityUpdate', handleUpdate);
      };
    }
  }, [socket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const filteredEntities = entities.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
  );

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const renderActiveTicketCard = ({ item }: { item: any }) => {
    const isCalling = item.status === 'CALLING';

    return (
      <TouchableOpacity 
        style={[
          styles.activeTicketCard,
          isCalling && styles.activeTicketCardCalling
        ]}
        activeOpacity={0.9}
        onPress={() => router.push('/tickets')}
      >
        <View style={styles.activeTicketHeader}>
          <Text style={styles.ticketEntityText} numberOfLines={1}>{item.entity_name}</Text>
          {isCalling ? (
            <Animated.View style={[styles.callingBadge, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.callingBadgeText}>🟢 À VOTRE TOUR</Text>
            </Animated.View>
          ) : (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>EN ATTENTE</Text>
            </View>
          )}
        </View>

        <Text style={styles.ticketNumberText}>N° {item.ticket_number}</Text>
        <Text style={styles.ticketServiceText} numberOfLines={1}>{item.service_name}</Text>

        {/* Progress Bar Visual */}
        <View style={styles.miniProgressOuter}>
          <View 
            style={[
              styles.miniProgressInner, 
              { 
                width: isCalling ? '100%' : `${Math.max(15, 100 - (item.people_ahead || 0) * 20)}%`,
                backgroundColor: isCalling ? '#10B981' : '#F97316'
              }
            ]} 
          />
        </View>

        <View style={styles.ticketFooter}>
          <Text style={styles.ticketTimeText}>
            {isCalling
              ? `Passez au ${item.desk_name || 'Guichet'}`
              : item.people_ahead === 0
              ? '⚡ Prochain en ligne (0 personne devant)'
              : `${item.people_ahead} personne(s) devant vous`}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={isCalling ? '#10B981' : '#F97316'} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEntityCard = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={styles.entityCard} 
        activeOpacity={0.88}
        onPress={() => router.push({
          pathname: '/booking',
          params: { 
            entityId: item.id, 
            entityName: item.name 
          }
        })}
      >
        {item.logo_url ? (
          <Image source={{ uri: item.logo_url }} style={styles.entityLogo} />
        ) : (
          <View style={styles.entityLogoPlaceholder}>
            <Ionicons name="business" size={24} color="#F97316" />
          </View>
        )}

        <View style={styles.entityInfo}>
          <View style={styles.entityTitleRow}>
            <Text style={styles.entityName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeText}>OUVERT</Text>
            </View>
          </View>

          {item.description ? (
            <Text style={styles.entityDesc} numberOfLines={2}>{item.description}</Text>
          ) : null}

          <View style={styles.entityFooterRow}>
            <View style={styles.entityTag}>
              <Ionicons name="time-outline" size={12} color="#78716C" />
              <Text style={styles.tagText}>
                {item.working_hours_start ? `${item.working_hours_start.slice(0, 5)} à ${item.working_hours_end.slice(0, 5)}` : '08:30 à 17:00'}
              </Text>
            </View>
            <View style={styles.entityTag}>
              <Ionicons name="location-outline" size={12} color="#78716C" />
              <Text style={styles.tagText}>Madagascar</Text>
            </View>
          </View>
        </View>

        <View style={styles.arrowCircle}>
          <Ionicons name="chevron-forward" size={18} color="#F97316" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={filteredEntities}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />}
        ListHeaderComponent={
          <View style={styles.headerComponent}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <QueuePayLogo size={34} />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {user && (
                  <Animated.View style={{ transform: [{ scale: bellPulseAnim }] }}>
                    <TouchableOpacity 
                      style={styles.notificationBellButton}
                      onPress={() => router.push('/tickets')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="notifications-outline" size={22} color={activeTickets.length > 0 ? "#F97316" : "#1C1917"} />
                      {activeTickets.length > 0 && (
                        <View style={styles.activeTicketsBadge}>
                          <Text style={styles.activeTicketsBadgeText}>
                            {activeTickets[0]?.people_ahead !== undefined ? `${activeTickets[0].people_ahead} pers` : `${activeTickets.length} pers`}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                )}

                {user ? (
                  <TouchableOpacity 
                    style={styles.profileAvatarButton}
                    onPress={() => router.push('/profile' as any)}
                  >
                    <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.loginBtn}
                    onPress={() => router.push('/auth')}
                  >
                    <Text style={styles.loginBtnText}>Se connecter</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Welcome banner */}
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>
                {user ? `${getGreeting()}, ${user.name} 👋` : `${getGreeting()} ! 👋`}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Réservez votre ticket d'attente en ligne et évitez les files d'attente.
              </Text>
            </View>

            {/* Active Tickets Horizontal Slider */}
            {activeTickets.length > 0 && (
              <View style={styles.activeSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Vos tickets actifs</Text>
                  <TouchableOpacity onPress={() => router.push('/tickets')}>
                    <Text style={styles.viewAllText}>Voir tout</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={activeTickets}
                  renderItem={renderActiveTicketCard}
                  keyExtractor={(item) => item.id.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activeSliderContainer}
                />
              </View>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#A8A29E" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher une entreprise ou un service..."
                placeholderTextColor="#A8A29E"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#A8A29E" />
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.sectionTitle}>Entreprises partenaires</Text>
          </View>
        }
        renderItem={renderEntityCard}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={48} color="#D6D3D1" />
              <Text style={styles.emptyText}>Aucune entreprise trouvée</Text>
            </View>
          )
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },
  listContent: {
    paddingBottom: 100,
  },
  headerComponent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notificationBellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeTicketsBadge: {
    position: 'absolute',
    top: -2,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFDFB',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  activeTicketsBadgeText: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#FFFDFB',
    letterSpacing: -0.2,
  },
  profileAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarText: {
    color: '#FFFDFB',
    fontSize: 14,
    fontWeight: '900',
  },
  loginBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFDFB',
  },
  welcomeContainer: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '500',
    marginTop: 6,
    lineHeight: 18,
  },
  activeSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F97316',
  },
  activeSliderContainer: {
    gap: 14,
    paddingRight: 20,
  },
  activeTicketCard: {
    width: 200,
    backgroundColor: '#FFFDFB',
    borderWidth: 1.5,
    borderColor: '#F2E8DF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  activeTicketCardCalling: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
    shadowColor: '#10B981',
    shadowOpacity: 0.18,
  },
  activeTicketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#F97316',
  },
  callingBadge: {
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  callingBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFDFB',
  },
  ticketNumberText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F97316',
    letterSpacing: -0.5,
  },
  ticketEntityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1C1917',
    flex: 1,
    marginRight: 8,
  },
  ticketServiceText: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  miniProgressOuter: {
    height: 5,
    backgroundColor: '#EAD8C3',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 12,
  },
  miniProgressInner: {
    height: '100%',
    borderRadius: 3,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: '#F7EBE1',
    paddingTop: 8,
  },
  ticketTimeText: {
    fontSize: 11,
    color: '#44403C',
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAD8C3',
    paddingHorizontal: 14,
    marginBottom: 24,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1C1917',
    fontWeight: '500',
  },
  entityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDFB',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F2E8DF',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  entityLogo: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: '#EAD8C3',
  },
  entityLogoPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entityInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  entityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entityName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    flex: 1,
    marginRight: 6,
  },
  openBadge: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  openBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#10B981',
  },
  entityDesc: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 4,
    lineHeight: 16,
  },
  entityFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  entityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tagText: {
    fontSize: 10,
    color: '#78716C',
    fontWeight: '600',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
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
