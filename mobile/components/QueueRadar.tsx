import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface AheadTicket {
  id: number;
  ticket_number: string;
  time_slot: string;
  status: 'PENDING' | 'CALLING' | string;
  client_name?: string;
  desk_name?: string;
}

interface QueueRadarProps {
  position: number;
  clientsAhead: number;
  status: string;
  myTicketNumber: string;
  myTimeSlot?: string;
  deskName?: string;
  aheadTickets?: AheadTicket[];
  compact?: boolean;
}

export default function QueueRadar({
  position,
  clientsAhead,
  status,
  myTicketNumber,
  myTimeSlot,
  deskName,
  aheadTickets = [],
  compact = false
}: QueueRadarProps) {
  const [expanded, setExpanded] = useState(false);

  // Animation values
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 1. Continuous rotation for radar orb
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 2. Pulsing core orb
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 3. Expanding wave ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1.25,
          duration: 1400,
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0.85,
          duration: 1400,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isCalling = status === 'CALLING';
  const isNext = status === 'PENDING' && clientsAhead === 0;

  const getThemeColor = () => {
    if (isCalling) return '#10B981'; // Emerald Green
    if (isNext) return '#F59E0B'; // Warm Amber Gold
    return '#FF6B00'; // QueuePay Brand Orange
  };

  const themeColor = getThemeColor();

  // Smart Pagination for long queues (e.g. 24 people ahead)
  const MAX_VISIBLE_DEFAULT = 3;
  const hasMore = aheadTickets.length > MAX_VISIBLE_DEFAULT;
  const visibleAheadTickets = (!expanded && hasMore) 
    ? aheadTickets.slice(0, MAX_VISIBLE_DEFAULT) 
    : aheadTickets;
  const hiddenCount = aheadTickets.length - MAX_VISIBLE_DEFAULT;

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: themeColor + '40' }]}>
        <View style={styles.compactRadarWrapper}>
          <Animated.View
            style={[
              styles.compactWaveRing,
              { borderColor: themeColor, transform: [{ scale: waveAnim }] },
            ]}
          />
          <Animated.View
            style={[
              styles.compactSpinRing,
              { borderColor: themeColor, transform: [{ rotate: spin }] },
            ]}
          >
            <View style={[styles.compactRadarDot, { backgroundColor: themeColor }]} />
          </Animated.View>
          <View style={[styles.compactCoreDot, { backgroundColor: themeColor }]}>
            <Ionicons
              name={isCalling ? 'megaphone' : isNext ? 'flash' : 'time'}
              size={14}
              color="#FFF"
            />
          </View>
        </View>
        <View style={styles.compactTextWrapper}>
          <Text style={styles.compactTitle}>
            {isCalling
              ? '🟢 VOTRE TOUR AU GUICHET !'
              : isNext
              ? '⚡ RANG 1 — PROCHAIN EN LIGNE'
              : `⏳ RANG ${position} DANS LA FILE`}
          </Text>
          <Text style={styles.compactSubtitle}>
            {isCalling
              ? `Présentez-vous au ${deskName || 'Guichet'}`
              : isNext
              ? '0 personne devant vous • Passage imminent'
              : `${clientsAhead} personne(s) devant vous`}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Dynamic Animated Radar Sphere */}
      <View style={styles.radarSection}>
        {/* Outer Pulsing Wave Ring */}
        <Animated.View
          style={[
            styles.outerWaveRing,
            {
              borderColor: themeColor + '30',
              backgroundColor: themeColor + '08',
              transform: [{ scale: waveAnim }],
            },
          ]}
        />

        {/* Orbit Rotating Beam Ring */}
        <Animated.View
          style={[
            styles.orbitRing,
            {
              borderColor: themeColor + '60',
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View style={[styles.orbitSatellite, { backgroundColor: themeColor }]} />
          <View style={[styles.orbitSatelliteOpposite, { backgroundColor: themeColor + '80' }]} />
        </Animated.View>

        {/* Pulsing Core Sphere */}
        <Animated.View
          style={[
            styles.coreSphere,
            {
              backgroundColor: themeColor,
              shadowColor: themeColor,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Ionicons
            name={isCalling ? 'megaphone-outline' : isNext ? 'flash-outline' : 'radio-outline'}
            size={36}
            color="#FFF"
          />
        </Animated.View>
      </View>

      {/* Main Status Headline */}
      <View style={styles.statusHeader}>
        <Text style={[styles.statusBadgeText, { color: themeColor }]}>
          {isCalling
            ? '🟢 C\'EST VOTRE TOUR !'
            : isNext
            ? '⚡ PASSEZ AU GUICHET EN PROCHAIN !'
            : `EN ATTENTE DE PASSAGE`}
        </Text>
        <Text style={styles.positionHeadline}>
          {isCalling
            ? `Guichet ${deskName || 'Assigné'}`
            : isNext
            ? 'Rang 1 (0 personne devant)'
            : `Rang ${position} (${clientsAhead} personne${clientsAhead > 1 ? 's' : ''} devant)`}
        </Text>
        <Text style={styles.ticketSubtext}>
          Votre Ticket : <Text style={styles.ticketHighlight}>N° {myTicketNumber}</Text>
          {myTimeSlot ? ` • Créneau ${myTimeSlot.substring(0, 5)}` : ''}
        </Text>
      </View>

      {/* People Ahead Visual List Section */}
      <View style={styles.aheadSection}>
        <View style={styles.aheadHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="people" size={18} color="#FF6B00" />
            <Text style={styles.aheadTitle}>Ordre de passage</Text>
          </View>
          {aheadTickets.length > 0 && (
            <View style={styles.aheadCountBadge}>
              <Text style={styles.aheadCountBadgeText}>
                {aheadTickets.length} ticket{aheadTickets.length > 1 ? 's' : ''} devant
              </Text>
            </View>
          )}
        </View>

        {aheadTickets.length === 0 ? (
          <View style={styles.emptyAheadBox}>
            <Ionicons
              name={isCalling ? 'checkmark-circle' : 'sparkles'}
              size={26}
              color={themeColor}
            />
            <Text style={styles.emptyAheadText}>
              {isCalling
                ? 'Aucune attente ! Votre ticket est actuellement appelé au guichet.'
                : 'Vous êtes Rang 1 (0 personne devant) ! Soyez prêt(e).'}
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {/* List of Visible Tickets Ahead with exact ranks (1 - Kiki, 2 - Jaja...) */}
            {visibleAheadTickets.map((item, index) => {
              const rank = index + 1;
              const itemIsCalling = item.status === 'CALLING';
              return (
                <View key={item.id || index} style={styles.timelineRow}>
                  {/* Timeline Indicator Node with Explicit Rank Number */}
                  <View style={styles.nodeColumn}>
                    <View
                      style={[
                        styles.nodeCircle,
                        {
                          backgroundColor: itemIsCalling ? '#10B981' : '#F59E0B',
                        },
                      ]}
                    >
                      <Text style={styles.nodeNumber}>{rank}</Text>
                    </View>
                    <View style={styles.nodeConnectorLine} />
                  </View>

                  {/* Card for Ticket Ahead */}
                  <View
                    style={[
                      styles.aheadCard,
                      itemIsCalling && styles.aheadCardCalling,
                    ]}
                  >
                    <View style={styles.aheadCardHeader}>
                      <View style={styles.ticketBadge}>
                        <Text style={styles.ticketBadgeText}>
                          {rank} • Ticket N° {item.ticket_number}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: itemIsCalling ? '#D1FAE5' : '#FEF3C7' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: itemIsCalling ? '#065F46' : '#92400E' },
                          ]}
                        >
                          {itemIsCalling
                            ? `Au ${item.desk_name || 'Guichet'}`
                            : 'En attente'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.aheadCardBody}>
                      <Text style={styles.clientNameText}>
                        👤 {rank}. {item.client_name || 'Client'}
                      </Text>
                      {item.time_slot && (
                        <Text style={styles.timeSlotText}>
                          ⏰ {item.time_slot.substring(0, 5)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Smart Expand/Collapse Pill when list is large (e.g. 24 people ahead) */}
            {hasMore && (
              <View style={styles.timelineRow}>
                <View style={styles.nodeColumn}>
                  <View style={[styles.nodeCircle, { backgroundColor: '#9CA3AF' }]}>
                    <Ionicons name="ellipsis-vertical" size={12} color="#FFF" />
                  </View>
                  <View style={styles.nodeConnectorLine} />
                </View>

                <TouchableOpacity
                  style={styles.expandCardButton}
                  onPress={() => setExpanded(!expanded)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={expanded ? 'chevron-up-circle' : 'chevron-down-circle'}
                    size={20}
                    color="#FF6B00"
                  />
                  <Text style={styles.expandCardText}>
                    {expanded
                      ? 'Masquer la suite de la file'
                      : `... ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} personne${hiddenCount > 1 ? 's' : ''} en attente ... (Voir tout)`}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* My Ticket Node (Ending Node with Exact Position Rank e.g. 24-VOUS) */}
            <View style={styles.timelineRow}>
              <View style={styles.nodeColumn}>
                <View style={[styles.nodeCircle, { backgroundColor: '#FF6B00' }]}>
                  <Text style={styles.nodeNumber}>{position}</Text>
                </View>
              </View>
              <View style={[styles.aheadCard, styles.myTicketCard]}>
                <Text style={styles.myTicketCardTitle}>
                  👉 RANG {position} — VOUS (Ticket N° {myTicketNumber})
                </Text>
                <Text style={styles.myTicketCardSub}>
                  {isNext
                    ? 'Votre tour est imminent ! Soyez prêt(e).'
                    : `Position ${position} • Votre passage après les ${clientsAhead} personnes ci-dessus.`}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  radarSection: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  outerWaveRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
  },
  orbitRing: {
    position: 'absolute',
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitSatellite: {
    position: 'absolute',
    top: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  orbitSatelliteOpposite: {
    position: 'absolute',
    bottom: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  coreSphere: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  positionHeadline: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  ticketSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  ticketHighlight: {
    fontWeight: '700',
    color: '#FF6B00',
  },
  aheadSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  aheadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aheadTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  aheadCountBadge: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFD8A8',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  aheadCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  emptyAheadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyAheadText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  timelineContainer: {
    marginTop: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  nodeColumn: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
  },
  nodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  nodeNumber: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  nodeConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: -2,
  },
  aheadCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aheadCardCalling: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  aheadCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ticketBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aheadCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  timeSlotText: {
    fontSize: 12,
    color: '#6B7280',
  },
  expandCardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFDFB',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FFD8A8',
    borderStyle: 'dashed',
  },
  expandCardText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C2410C',
  },
  myTicketCard: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FF6B00',
  },
  myTicketCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C2410C',
  },
  myTicketCardSub: {
    fontSize: 12,
    color: '#9A3412',
    marginTop: 2,
  },
  // Compact mode styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  compactRadarWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compactWaveRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
  },
  compactSpinRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactRadarDot: {
    position: 'absolute',
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactCoreDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTextWrapper: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  compactSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
