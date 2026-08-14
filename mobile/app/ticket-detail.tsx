import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  Share,
  Platform,
  Dimensions,
  Image
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useNotifications } from '@/contexts/NotificationContext';
import { API_BASE_URL } from '@/constants/api';
import QueueRadar from '@/components/QueueRadar';
import CelebrationBurst from '@/components/CelebrationBurst';

const { width } = Dimensions.get('window');

export default function TicketDetailScreen() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams();
  const { socket, triggerNotification } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<any>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [aheadTickets, setAheadTickets] = useState<any[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);

  const fetchTicketDetails = async () => {
    if (!ticketId) return;
    const token = await AsyncStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE_URL}/client/tickets/${ticketId}/detail`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.ticket) {
        setTicket(data.ticket);
        setPosition(data.position);
        setMessage(data.message);
        setAheadTickets(data.ahead_tickets || []);
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateTicket = async () => {
    if (!ticket) return;
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/client/tickets/${ticket.id}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        triggerNotification('Ticket réactivé ! ⚡', data.message, 'success');
        Alert.alert('Ticket Réactivé ! ⚡', data.message);
        fetchTicketDetails();
      } else {
        triggerNotification('Erreur', data.error || 'Impossible de réactiver.', 'error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelTicket = async () => {
    if (!ticket) return;
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
              const res = await fetch(`${API_BASE_URL}/client/tickets/${ticket.id}/cancel`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
              });
              const data = await res.json();
              if (res.ok) {
                triggerNotification('Ticket annulé', data.message, 'info');
                router.back();
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
    fetchTicketDetails();
    const timer = setInterval(() => {
      fetchTicketDetails();
    }, 3000);
    return () => clearInterval(timer);
  }, [ticketId]);

  // Connect to socket and join entity room for live updates
  useEffect(() => {
    if (socket && ticket) {
      socket.emit('joinEntity', ticket.entity_id);

      const handleLiveUpdate = () => {
        console.log('WS: Queue update received! Refreshing live ticket position...');
        fetchTicketDetails();
      };

      socket.on('queueUpdate', handleLiveUpdate);
      socket.on('entityUpdate', handleLiveUpdate);
      socket.on('ticketCall', handleLiveUpdate);
      socket.on('ticketApproaching', handleLiveUpdate);
      
      const handleCompleted = (compData: any) => {
        console.log('WS: Ticket completed event received!', compData);
        if (
          compData &&
          ((ticket && compData.ticket_number === ticket.ticket_number) ||
           (ticket && Number(compData.clientId) === Number(ticket.client_id)))
        ) {
          setShowCelebration(true);
        }
        fetchTicketDetails();
      };
      socket.on('ticketCompleted', handleCompleted);

      return () => {
        socket.off('queueUpdate', handleLiveUpdate);
        socket.off('entityUpdate', handleLiveUpdate);
        socket.off('ticketCall', handleLiveUpdate);
        socket.off('ticketApproaching', handleLiveUpdate);
        socket.off('ticketCompleted', handleCompleted);
      };
    }
  }, [socket, ticket]);

  const handleShare = async () => {
    if (!ticket) return;
    try {
      // 1. Save ticket into local app storage (AsyncStorage) so it's permanently stored locally in the app
      const existingSaved = await AsyncStorage.getItem('saved_local_tickets');
      let list = existingSaved ? JSON.parse(existingSaved) : [];
      if (!list.some((item: any) => item.id === ticket.id)) {
        list.push({
          ...ticket,
          saved_at: new Date().toISOString()
        });
        await AsyncStorage.setItem('saved_local_tickets', JSON.stringify(list));
      }

      // 2. Try FileSystem & Sharing for direct physical file download to device local storage
      try {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');

        const fileContent = `🎟️ PASS TICKET QUEUEPAY N°${ticket.ticket_number}\n----------------------------------\nÉtablissement : ${ticket.entity_name}\nService : ${ticket.service_name}\nDate : ${new Date(ticket.booking_date).toLocaleDateString()}\nCréneau : ${ticket.time_slot ? ticket.time_slot.slice(0, 5) : '08:00'}\nPrix du ticket : ${ticket.price ? `${ticket.price} Ar` : 'Gratuit'}\nCode QR Token : ${ticket.qr_code_token}\n----------------------------------\nPrésentez ce reçu au guichet pour validation.`;
        const filePath = `${FileSystem.documentDirectory}Ticket_QueuePay_${ticket.ticket_number}.txt`;

        await FileSystem.writeAsStringAsync(filePath, fileContent);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, { mimeType: 'text/plain', dialogTitle: 'Télécharger le Pass Ticket' });
        } else {
          await Share.share({ title: `Pass Ticket N°${ticket.ticket_number}`, message: fileContent });
        }
      } catch (e) {
        await Share.share({
          title: `Pass Ticket QueuePay N°${ticket.ticket_number}`,
          message: `🎟️ TICKET QUEUEPAY N°${ticket.ticket_number}\n----------------------------------\nÉtablissement: ${ticket.entity_name}\nService: ${ticket.service_name}\nDate: ${new Date(ticket.booking_date).toLocaleDateString()}\nCréneau: ${ticket.time_slot ? ticket.time_slot.slice(0, 5) : '08:00'}\nPrix: ${ticket.price ? `${ticket.price} Ar` : 'Gratuit'}\nCode QR Validation: ${ticket.qr_code_token}\n----------------------------------\nPrésentez ce Pass au guichet.`
        });
      }

      triggerNotification(
        'Ticket Téléchargé ! 📥',
        `Pass Ticket N°${ticket.ticket_number} sauvegardé localement dans l'application.`,
        'success'
      );

      Alert.alert(
        "Ticket Téléchargé & Sauvegardé ! 📥",
        `Le Pass Ticket N°${ticket.ticket_number} chez ${ticket.entity_name} avec son Code QR (${ticket.qr_code_token}) a été téléchargé et enregistré dans les fichiers de votre téléphone.`
      );
    } catch (error: any) {
      Alert.alert('Téléchargement', error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Ticket introuvable.</Text>
        <TouchableOpacity style={styles.backButtonInline} onPress={() => router.back()}>
          <Text style={styles.backButtonTextInline}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Progress Bar percentage scaling
  let progressPercentage = 100;
  if (ticket.status === 'PENDING' && position) {
    progressPercentage = Math.max(10, Math.min(90, 100 - (position * 10)));
  } else if (ticket.status === 'CALLING') {
    progressPercentage = 100;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Header bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="close" size={24} color="#292524" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket d'attente</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={22} color="#292524" />
        </TouchableOpacity>
      </View>

      {/* Live Animated Radar Orbit & Ahead-in-Line Chain */}
      {(ticket.status === 'PENDING' || ticket.status === 'CALLING') && (
        <QueueRadar
          position={position || 1}
          clientsAhead={ticket.status === 'CALLING' ? 0 : (position ? position - 1 : 0)}
          status={ticket.status}
          myTicketNumber={ticket.ticket_number}
          myTimeSlot={ticket.time_slot}
          deskName={ticket.desk_name}
          aheadTickets={aheadTickets}
        />
      )}

      {/* Premium Ticket Receipt Container */}
      <View style={styles.ticketOuterCard}>
        {/* Jagged / dotted lines simulation at top */}
        <View style={styles.receiptTopBorder} />
        
        <View style={styles.receiptBody}>
          {/* Logo / Entity details */}
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            {ticket.entity_logo ? (
              <Image source={{ uri: ticket.entity_logo }} style={styles.entityLogoHeader} resizeMode="contain" />
            ) : (
              <View style={styles.entityLogoBadge}>
                <Ionicons name="business" size={24} color="#F97316" />
              </View>
            )}
          </View>
          <Text style={styles.entityName}>{ticket.entity_name}</Text>
          <Text style={styles.serviceName}>{ticket.service_name}</Text>

          <View style={styles.separator} />

          {/* Big Monospace Ticket Number */}
          <View style={styles.numberBox}>
            <Text style={styles.numberLabel}>NUMÉRO DE PASSAGE</Text>
            <Text style={styles.ticketNumber}>{ticket.ticket_number}</Text>
            
            <View style={[styles.statusBadge, { 
              backgroundColor: ticket.status === 'COMPLETED' ? '#D1FAE5' : 
                               ticket.status === 'CALLING' ? '#FFEDD5' : '#FEF3C7'
            }]}>
              <Text style={[styles.statusText, { 
                color: ticket.status === 'COMPLETED' ? '#10B981' : 
                       ticket.status === 'CALLING' ? '#F97316' : '#F59E0B'
              }]}>
                {ticket.status === 'PENDING' ? 'EN ATTENTE' : 
                 ticket.status === 'CALLING' ? 'APPELÉ (C\'EST VOTRE TOUR)' : ticket.status}
              </Text>
            </View>
          </View>

          <View style={styles.separator} />

          {/* Date & Time details grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>DATE</Text>
              <Text style={styles.detailValue}>{new Date(ticket.booking_date).toLocaleDateString()}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>CRÉNEAU ESTIMÉ</Text>
              <Text style={styles.detailValue}>{ticket.time_slot.slice(0, 5)}</Text>
            </View>
          </View>

          {/* Counter info */}
          {ticket.desk_name && (
            <View style={styles.deskInfoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#F97316" />
              <Text style={styles.deskInfoText}>
                Veuillez vous présenter au comptoir : <Text style={{ fontWeight: '800' }}>{ticket.desk_name}</Text>
              </Text>
            </View>
          )}

          <View style={styles.separator} />

          {/* Real QR Code Token section */}
          <View style={styles.qrCodeSection}>
            <View style={styles.qrWrapper}>
              {ticket.qr_code_token ? (
                <QRCode
                  value={ticket.qr_code_token}
                  size={140}
                  color="#292524"
                  backgroundColor="#FFFDFB"
                />
              ) : (
                <Ionicons name="qr-code-outline" size={120} color="#292524" />
              )}
            </View>
            <Text style={styles.qrTokenText}>{ticket.qr_code_token}</Text>
            <Text style={styles.qrSubtitle}>L'agent au guichet scannera ce code pour valider votre présence.</Text>
          </View>
        </View>

        {/* Jagged / dotted lines simulation at bottom */}
        <View style={styles.receiptBottomBorder} />
      </View>
      
      {/* ABSENT Status Alert & Controls */}
      {ticket?.status === 'ABSENT' && (
        <View style={styles.detailAbsentBox}>
          <View style={styles.detailAbsentHeader}>
            <Ionicons name="alert-circle" size={24} color="#EF4444" />
            <Text style={styles.detailAbsentTitle}>VOUS AVEZ ÉTÉ MARQUÉ ABSENT</Text>
          </View>
          <Text style={styles.detailAbsentSubtitle}>
            Vous avez manqué votre tour d'appel au guichet. Réactivez votre ticket dès maintenant pour vous replacer à la fin de la file d'attente.
          </Text>
          
          <TouchableOpacity
            style={styles.detailReactivateButton}
            onPress={handleReactivateTicket}
            activeOpacity={0.88}
          >
            <Ionicons name="flash" size={18} color="#FFF" />
            <Text style={styles.detailReactivateText}>⚡ Réactiver (Replacer à la fin de la file)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailCancelButton}
            onPress={handleCancelTicket}
            activeOpacity={0.88}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={styles.detailCancelText}>Annuler définitivement ce ticket</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons: Export PDF/Share & Refresh */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.exportPdfButton}
          onPress={handleShare}
          activeOpacity={0.88}
        >
          <Ionicons name="document-text-outline" size={18} color="#FFFDFB" />
          <Text style={styles.exportPdfText}>Télécharger / Exporter mon Ticket PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchTicketDetails}
          activeOpacity={0.88}
        >
          <Ionicons name="refresh" size={16} color="#78716C" />
          <Text style={styles.refreshText}>Actualiser la position</Text>
        </TouchableOpacity>
      </View>

      {/* Celebration Balloon Burst Modal */}
      <CelebrationBurst
        visible={showCelebration}
        ticketNumber={ticket?.ticket_number}
        entityName={ticket?.entity_name}
        serviceName={ticket?.service_name}
        onClose={() => setShowCelebration(false)}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFDFB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 16,
  },
  backButtonInline: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
  },
  backButtonTextInline: {
    color: '#292524',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    marginBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Outfit',
    fontSize: 18,
    fontWeight: '800',
    color: '#292524',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketOuterCard: {
    width: '100%',
    backgroundColor: '#FFFDFB',
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAD8C3',
  },
  receiptBody: {
    padding: 24,
  },
  receiptTopBorder: {
    height: 6,
    backgroundColor: '#EAD8C3',
    opacity: 0.5,
  },
  receiptBottomBorder: {
    height: 8,
    backgroundColor: '#EAD8C3',
    opacity: 0.5,
  },
  entityLogoHeader: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  entityLogoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FAF6F0',
    borderWidth: 1.5,
    borderColor: '#EAD8C3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entityName: {
    fontFamily: 'Outfit',
    fontSize: 22,
    fontWeight: '800',
    color: '#292524',
    textAlign: 'center',
  },
  serviceName: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#EAD8C3',
    marginVertical: 16,
    borderStyle: 'dashed',
  },
  numberBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  numberLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 1,
  },
  ticketNumber: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 54,
    fontWeight: '900',
    color: '#F97316',
    marginVertical: 6,
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  progressSection: {
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 1,
    marginBottom: 10,
  },
  barOuter: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EAD8C3',
    overflow: 'hidden',
    marginBottom: 12,
  },
  barInner: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 4,
  },
  positionText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#292524',
  },
  liveMessage: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 4,
    fontWeight: '600',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#78716C',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#292524',
    marginTop: 2,
  },
  deskInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFDFB',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EAD8C3',
    marginTop: 14,
  },
  deskInfoText: {
    fontSize: 12,
    color: '#292524',
    fontWeight: '600',
  },
  qrCodeSection: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrWrapper: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFDFB',
    borderWidth: 1,
    borderColor: '#EAD8C3',
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  qrTokenText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#292524',
    marginTop: 12,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  qrSubtitle: {
    fontSize: 11,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  exportPdfButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  exportPdfText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFDFB',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  refreshText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '700',
  },
  detailAbsentBox: {
    marginTop: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    padding: 16,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  detailAbsentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailAbsentTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  detailAbsentSubtitle: {
    fontSize: 12,
    color: '#7F1D1D',
    marginTop: 6,
    lineHeight: 18,
    fontWeight: '500',
  },
  detailReactivateButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  detailReactivateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  detailCancelButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  detailCancelText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
  },
});
