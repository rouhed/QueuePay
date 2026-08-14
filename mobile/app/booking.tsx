import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_BASE_URL } from '@/constants/api';

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { entityId, entityName, serviceId: initialServiceId } = params;

  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [timePeriod, setTimePeriod] = useState<'morning' | 'afternoon'>('morning');

  // Form states
  const [date, setDate] = useState('');
  const [time, setTime] = useState('08:30');
  const [pin, setPin] = useState('');

  // Form validation errors
  const [errors, setErrors] = useState<{ service?: string; date?: string; time?: string; pin?: string; general?: string }>({});

  // Helper to slice "08:30:00" into "08:30"
  const cleanTime = (tStr?: string) => {
    if (!tStr) return '08:30';
    return tStr.slice(0, 5);
  };

  // Quick Date Shortcut calculation
  const getFormattedDate = (addDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    return d.toISOString().split('T')[0];
  };

  const todayStr = getFormattedDate(0);
  const tomorrowStr = getFormattedDate(1);
  const dayAfterTomorrowStr = getFormattedDate(2);

  // Set default date to today
  useEffect(() => {
    setDate(todayStr);
  }, []);

  // Fetch entity services, settings and user balance
  useEffect(() => {
    const fetchEntityAndBalance = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        setIsLoggedIn(!!token);
        
        // 1. Fetch entity details and merchant settings
        if (entityId) {
          const res = await fetch(`${API_BASE_URL}/client/entities/${entityId}`);
          const data = await res.json();
          if (data.services && data.services.length > 0) {
            setServices(data.services);
            if (initialServiceId) {
              const matched = data.services.find((s: any) => s.id.toString() === initialServiceId.toString());
              setSelectedService(matched || data.services[0]);
            } else {
              setSelectedService(data.services[0]);
            }
          }

          if (data.settings) {
            setSettings(data.settings);
            if (data.settings.working_hours_start) {
              setTime(cleanTime(data.settings.working_hours_start));
            }
          }
        }

        // 2. Fetch user balance if logged in
        if (token) {
          const userRes = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const userData = await userRes.json();
          if (userData.user) {
            setBalance(parseFloat(userData.user.wallet_balance || userData.user.balance || '0'));
          }
        }
      } catch (err) {
        console.error('Fetch booking info error:', err);
      }
    };

    fetchEntityAndBalance();
  }, [entityId]);

  // Generate dynamic 30-minute slots without seconds
  const generateTimeSlots = (startStr?: string, endStr?: string) => {
    const start = cleanTime(startStr || '08:30');
    const end = cleanTime(endStr || '17:00');

    const slots: string[] = [];
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const formattedH = h < 10 ? `0${h}` : `${h}`;
      const formattedM = m < 10 ? `0${m}` : `${m}`;
      slots.push(`${formattedH}:${formattedM}`);
      currentMinutes += 30; // 30 mins step
    }

    return slots;
  };

  const allTimeSlots = generateTimeSlots(settings?.working_hours_start, settings?.working_hours_end);
  
  // Filter slots by Morning (< 12:00) vs Afternoon (>= 12:00)
  const morningSlots = allTimeSlots.filter(s => parseInt(s.split(':')[0]) < 12);
  const afternoonSlots = allTimeSlots.filter(s => parseInt(s.split(':')[0]) >= 12);
  const activeSlots = timePeriod === 'morning' ? morningSlots : afternoonSlots;

  const validateForm = () => {
    const newErrors: any = {};

    if (!selectedService) {
      newErrors.service = 'Veuillez choisir un service.';
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      newErrors.date = 'La date est requise au format AAAA-MM-JJ.';
    }

    if (!time) {
      newErrors.time = 'Veuillez choisir un créneau horaire.';
    }

    if (!pin) {
      newErrors.pin = 'Le code secret PIN est obligatoire.';
    } else if (!/^\d{4}$|^\d{6}$/.test(pin)) {
      newErrors.pin = 'Le code PIN doit comporter 4 ou 6 chiffres.';
    }

    // Balance check
    if (selectedService && balance !== null) {
      const price = parseFloat(selectedService.price || 0);
      if (balance < price) {
        newErrors.general = `Solde insuffisant (${balance} Ar). Le ticket coûte ${price} Ar. Veuillez recharger votre portefeuille.`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBookingSubmit = async () => {
    if (!isLoggedIn) {
      router.push('/auth');
      return;
    }

    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    const token = await AsyncStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE_URL}/client/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          entity_id: parseInt(entityId as string),
          service_id: selectedService.id,
          booking_date: date,
          time_slot: time,
          wallet_pin: pin,
          pin: pin
        })
      });

      const data = await res.json();

      if (res.ok) {
        router.replace('/tickets');
      } else {
        setErrors({ general: data.error || 'Impossible d\'effectuer la réservation.' });
      }
    } catch (err) {
      setErrors({ general: 'Erreur réseau. Impossible de contacter le serveur.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(serviceSearch.toLowerCase()))
  );

  const isBalanceInsufficient = selectedService && balance !== null && balance < parseFloat(selectedService.price || 0);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
        
        {/* Top Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#1C1917" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Réservation de Ticket</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Entity Title Banner with Clean HH:mm Format */}
        <View style={styles.entityBanner}>
          <Text style={styles.entityNameText}>{entityName || 'Entreprise Partenaire'}</Text>
          <View style={styles.hoursRow}>
            <Ionicons name="time-outline" size={14} color="#F97316" />
            <Text style={styles.entitySubText}>
              Horaires d'ouverture : {cleanTime(settings?.working_hours_start)} à {cleanTime(settings?.working_hours_end)}
            </Text>
          </View>
        </View>

        {/* Global Error Banner */}
        {errors.general && (
          <View style={styles.generalErrorBanner}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.generalErrorText}>{errors.general}</Text>
          </View>
        )}

        {/* SERVICE SELECTOR WITH SEARCH */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.fieldLabel}>1. Sélectionner un service <Text style={styles.asterisk}>*</Text></Text>
          <Text style={styles.serviceCountBadge}>{services.length} disponible(s)</Text>
        </View>

        {/* Search Bar for 10+ services */}
        {services.length > 3 && (
          <View style={styles.searchServiceBox}>
            <Ionicons name="search-outline" size={16} color="#A8A29E" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchServiceInput}
              placeholder="Rechercher un service (ex: Eau, Électricité...)"
              placeholderTextColor="#A8A29E"
              value={serviceSearch}
              onChangeText={setServiceSearch}
            />
            {serviceSearch.length > 0 && (
              <TouchableOpacity onPress={() => setServiceSearch('')}>
                <Ionicons name="close-circle" size={16} color="#A8A29E" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {errors.service && (
          <Text style={styles.fieldErrorText}>{errors.service}</Text>
        )}

        {/* 2-Column Responsive Grid */}
        <View style={styles.servicesGrid}>
          {filteredServices.map((s) => {
            const isSelected = selectedService?.id === s.id;
            return (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.serviceGridCard, 
                  isSelected && styles.serviceGridCardActive
                ]}
                onPress={() => {
                  setSelectedService(s);
                  setErrors(prev => ({ ...prev, service: undefined, general: undefined }));
                }}
                activeOpacity={0.88}
              >
                <View style={styles.serviceCardTop}>
                  <Ionicons 
                    name={s.name.toLowerCase().includes('eau') ? "water-outline" : s.name.toLowerCase().includes('elec') ? "flash-outline" : "receipt-outline"} 
                    size={20} 
                    color={isSelected ? "#FFFDFB" : "#F97316"} 
                  />
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={18} color="#FFFDFB" />
                  )}
                </View>

                <Text style={[styles.serviceGridName, isSelected && styles.serviceGridNameActive]} numberOfLines={2}>
                  {s.name}
                </Text>
                
                <Text style={[styles.serviceGridPrice, isSelected && styles.serviceGridPriceActive]}>
                  {s.price > 0 ? `${s.price} Ar` : 'Gratuit'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Pricing & Balance Info Card */}
        {selectedService && (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Service sélectionné</Text>
              <Text style={styles.infoValue}>{selectedService.name}</Text>
            </View>
            <View style={styles.infoRowDivider}>
              <Text style={styles.infoLabel}>Frais du Ticket</Text>
              <Text style={styles.priceText}>{selectedService.price || 0} Ar</Text>
            </View>

            {isLoggedIn && (
              <View style={styles.infoRowDivider}>
                <Text style={styles.infoLabel}>Votre solde actuel</Text>
                <Text style={[styles.balanceText, isBalanceInsufficient && { color: '#EF4444' }]}>
                  {balance !== null ? `${balance} Ar` : 'Chargement...'}
                </Text>
              </View>
            )}

            {/* Insufficient balance CTA */}
            {isLoggedIn && isBalanceInsufficient && (
              <TouchableOpacity 
                style={styles.rechargeCtaBtn}
                onPress={() => router.push('/explore')}
                activeOpacity={0.88}
              >
                <Ionicons name="wallet-outline" size={16} color="#FFFDFB" />
                <Text style={styles.rechargeCtaText}>Recharger par Mobile Money (Mvola, Orange...)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* DATE & TIME SELECTION SECTION */}
        <View style={styles.card}>
          
          {/* Field: Date Selector with Quick Chips */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>2. Date de réservation <Text style={styles.asterisk}>*</Text></Text>
            
            <View style={styles.dateChipsRow}>
              <TouchableOpacity
                style={[styles.dateChip, date === todayStr && styles.dateChipActive]}
                onPress={() => { setDate(todayStr); setErrors(prev => ({ ...prev, date: undefined })); }}
              >
                <Text style={[styles.dateChipText, date === todayStr && styles.dateChipTextActive]}>Aujourd'hui</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateChip, date === tomorrowStr && styles.dateChipActive]}
                onPress={() => { setDate(tomorrowStr); setErrors(prev => ({ ...prev, date: undefined })); }}
              >
                <Text style={[styles.dateChipText, date === tomorrowStr && styles.dateChipTextActive]}>Demain</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateChip, date === dayAfterTomorrowStr && styles.dateChipActive]}
                onPress={() => { setDate(dayAfterTomorrowStr); setErrors(prev => ({ ...prev, date: undefined })); }}
              >
                <Text style={[styles.dateChipText, date === dayAfterTomorrowStr && styles.dateChipTextActive]}>Après-demain</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputContainer, errors.date ? styles.inputContainerError : null]}>
              <Ionicons name="calendar-outline" size={18} color={errors.date ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
              <TextInput 
                style={styles.input} 
                placeholder="AAAA-MM-JJ" 
                placeholderTextColor="#A8A29E"
                value={date}
                onChangeText={(val) => {
                  setDate(val);
                  setErrors(prev => ({ ...prev, date: undefined }));
                }}
              />
            </View>
            {errors.date && <Text style={styles.fieldErrorText}>{errors.date}</Text>}
          </View>

          {/* Field: VISUAL CLOCK TIME SELECTOR (Morning / Afternoon Tabs) */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>
              3. Heure de passage (Pas de 30 min) <Text style={styles.asterisk}>*</Text>
            </Text>
            
            {/* Clock Period Segment Bar */}
            <View style={styles.clockSegmentBar}>
              <TouchableOpacity
                style={[styles.clockSegment, timePeriod === 'morning' && styles.clockSegmentActive]}
                onPress={() => setTimePeriod('morning')}
              >
                <Ionicons name="sunny-outline" size={14} color={timePeriod === 'morning' ? "#F97316" : "#78716C"} />
                <Text style={[styles.clockSegmentText, timePeriod === 'morning' && styles.clockSegmentTextActive]}>
                  Matin ({morningSlots.length > 0 ? `${morningSlots[0]} - ${morningSlots[morningSlots.length - 1]}` : ''})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.clockSegment, timePeriod === 'afternoon' && styles.clockSegmentActive]}
                onPress={() => setTimePeriod('afternoon')}
              >
                <Ionicons name="partly-sunny-outline" size={14} color={timePeriod === 'afternoon' ? "#F97316" : "#78716C"} />
                <Text style={[styles.clockSegmentText, timePeriod === 'afternoon' && styles.clockSegmentTextActive]}>
                  Après-midi ({afternoonSlots.length > 0 ? `${afternoonSlots[0]} - ${afternoonSlots[afternoonSlots.length - 1]}` : ''})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Grid of 30-min Clock Chips */}
            <View style={styles.clockGrid}>
              {activeSlots.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.clockChip, time === slot && styles.clockChipActive]}
                  onPress={() => {
                    setTime(slot);
                    setErrors(prev => ({ ...prev, time: undefined }));
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time" size={14} color={time === slot ? "#FFFDFB" : "#F97316"} />
                  <Text style={[styles.clockChipText, time === slot && styles.clockChipTextActive]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.time && <Text style={styles.fieldErrorText}>{errors.time}</Text>}
          </View>

          {/* IF NOT LOGGED IN: SHOW AUTH REQUIRED BANNER */}
          {!isLoggedIn ? (
            <View style={styles.authRequiredCard}>
              <View style={styles.authIconCircle}>
                <Ionicons name="lock-closed" size={24} color="#F97316" />
              </View>
              <Text style={styles.authRequiredTitle}>Connexion Requise</Text>
              <Text style={styles.authRequiredText}>
                Vous devez être connecté à votre compte QueuePay pour confirmer la réservation et obtenir votre ticket.
              </Text>

              <TouchableOpacity 
                style={styles.loginCtaBtn}
                onPress={() => router.push('/auth')}
                activeOpacity={0.88}
              >
                <Text style={styles.loginCtaBtnText}>Se connecter / S'inscrire</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFDFB" />
              </TouchableOpacity>
            </View>
          ) : (
            /* IF LOGGED IN: SHOW PIN & CONFIRMATION BUTTON */
            <>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>4. Confirmation par Code PIN <Text style={styles.asterisk}>*</Text></Text>
                <View style={[styles.inputContainer, errors.pin ? styles.inputContainerError : null]}>
                  <Ionicons name="lock-closed-outline" size={18} color={errors.pin ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
                  <TextInput 
                    style={styles.input} 
                    placeholder="Saisissez votre code PIN secret" 
                    placeholderTextColor="#A8A29E"
                    secureTextEntry
                    keyboardType="numeric"
                    value={pin}
                    onChangeText={(val) => {
                      setPin(val);
                      setErrors(prev => ({ ...prev, pin: undefined }));
                    }}
                  />
                </View>
                {errors.pin && <Text style={styles.fieldErrorText}>{errors.pin}</Text>}
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, isBalanceInsufficient && styles.submitBtnDisabled]} 
                onPress={handleBookingSubmit}
                disabled={loading || isBalanceInsufficient}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFDFB" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {isBalanceInsufficient ? 'Solde Insuffisant (Recharger)' : 'Confirmer le Ticket'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },
  scrollContainer: {
    paddingHorizontal: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
  },
  entityBanner: {
    marginBottom: 20,
  },
  entityNameText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  entitySubText: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '600',
  },
  generalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 12,
    borderRadius: 14,
    marginBottom: 20,
  },
  generalErrorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceCountBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F97316',
    backgroundColor: 'rgba(249,115,22,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  searchServiceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 14,
  },
  searchServiceInput: {
    flex: 1,
    fontSize: 12,
    color: '#1C1917',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  serviceGridCard: {
    width: '48%',
    backgroundColor: '#FAF6F0',
    borderWidth: 1.5,
    borderColor: '#EAD8C3',
    borderRadius: 18,
    padding: 14,
    justifyContent: 'space-between',
    minHeight: 100,
  },
  serviceGridCardActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  serviceCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceGridName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
    lineHeight: 17,
  },
  serviceGridNameActive: {
    color: '#FFFDFB',
  },
  serviceGridPrice: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '700',
    marginTop: 6,
  },
  serviceGridPriceActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  infoCard: {
    backgroundColor: '#1C1917',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowDivider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
    paddingTop: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: '#A8A29E',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: '#FFFDFB',
    fontWeight: '800',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F97316',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFDFB',
  },
  rechargeCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  rechargeCtaText: {
    color: '#FFFDFB',
    fontSize: 11,
    fontWeight: '800',
  },
  card: {
    gap: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  asterisk: {
    color: '#EF4444',
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '700',
    marginTop: 2,
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
  },
  dateChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  dateChipTextActive: {
    color: '#FFFDFB',
    fontWeight: '800',
  },
  clockSegmentBar: {
    flexDirection: 'row',
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAD8C3',
    padding: 4,
    marginBottom: 10,
  },
  clockSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clockSegmentActive: {
    backgroundColor: '#FFFDFB',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  clockSegmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  clockSegmentTextActive: {
    color: '#F97316',
    fontWeight: '900',
  },
  clockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clockChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  clockChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C1917',
  },
  clockChipTextActive: {
    color: '#FFFDFB',
  },
  authRequiredCard: {
    backgroundColor: '#FAF6F0',
    borderWidth: 1.5,
    borderColor: '#EAD8C3',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    textAlign: 'center',
  },
  authIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(249,115,22,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  authRequiredTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 6,
  },
  authRequiredText: {
    fontSize: 12,
    color: '#78716C',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  loginCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  loginCtaBtnText: {
    color: '#FFFDFB',
    fontSize: 14,
    fontWeight: '800',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EAD8C3',
    paddingHorizontal: 14,
    height: 48,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1C1917',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#A8A29E',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    color: '#FFFDFB',
    fontSize: 15,
    fontWeight: '900',
  },
});
