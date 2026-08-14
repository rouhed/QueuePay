import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { API_BASE_URL } from '@/constants/api';

export default function WalletScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  // Deposit modal states
  const [showModal, setShowModal] = useState(false);
  const [operator, setOperator] = useState<'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | null>(null);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [depositLoading, setDepositLoading] = useState(false);

  const fetchWalletData = async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      setUser(null);
      setTransactions([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Fetch user profile to get balance
      const userRes = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const userData = await userRes.json();
      if (userData.user) {
        setUser(userData.user);
        await AsyncStorage.setItem('user', JSON.stringify(userData.user));
      }

      // Fetch transactions
      const txRes = await fetch(`${API_BASE_URL}/client/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const txData = await txRes.json();
      if (txData.transactions) {
        setTransactions(txData.transactions);
      }
    } catch (err) {
      console.error('Fetch wallet error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchWalletData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleOpenDeposit = (op: 'MVOLA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY') => {
    setOperator(op);
    setAmount('');
    setPin('');
    if (user) {
      const userPhone = user.phone_number || user.phone || '';
      setPhone(userPhone);
    }
    setShowModal(true);
  };

  const handleDepositSubmit = async () => {
    if (!amount || !phone || !pin) {
      Alert.alert('Champs requis', 'Veuillez remplir le montant, le numéro et votre code PIN.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1000) {
      Alert.alert('Montant invalide', 'Le montant minimum de recharge est de 1 000 Ar.');
      return;
    }

    if (numAmount > 20000) {
      Alert.alert('Plafond dépassé', 'Le montant maximum de recharge par opération est de 20 000 Ar.');
      return;
    }

    if (!/^\d{4}$|^\d{6}$/.test(pin)) {
      Alert.alert('Code PIN invalide', 'Le code PIN doit comporter 4 ou 6 chiffres numériques.');
      return;
    }

    setDepositLoading(true);
    const token = await AsyncStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE_URL}/client/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: numAmount,
          payment_method: operator,
          phone_number: phone,
          pin_code: pin
        })
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert(
          'Recharge Réussie ! 🎉', 
          `Votre compte a été crédité de ${data.deposited_amount || numAmount} Ar via ${operator}.\nNouveau solde: ${data.new_balance} Ar`
        );
        setShowModal(false);
        fetchWalletData();
      } else {
        Alert.alert('Échec de la recharge', data.error || 'Une erreur est survenue.');
      }
    } catch (err) {
      Alert.alert('Erreur réseau', 'Impossible de se connecter au serveur.');
    } finally {
      setDepositLoading(false);
    }
  };

  const renderTxItem = ({ item }: { item: any }) => {
    const txType = (item.transaction_type || item.type || '').toUpperCase();
    const isCredit = txType === 'DEPOSIT' || txType === 'RECHARGE';
    const methodRaw = item.payment_method || '';
    const formattedMethod = methodRaw === 'MVOLA' ? 'Mvola' : methodRaw === 'ORANGE_MONEY' ? 'Orange Money' : methodRaw === 'AIRTEL_MONEY' ? 'Airtel Money' : 'Mobile Money';
    const titleText = isCredit ? `Dépôt ${formattedMethod}` : 'Réservation de Ticket';

    return (
      <View style={styles.txCard}>
        <View style={[styles.txIconContainer, { backgroundColor: isCredit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.1)' }]}>
          <Ionicons 
            name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'} 
            size={22} 
            color={isCredit ? '#10B981' : '#EF4444'} 
          />
        </View>
        
        <View style={styles.txInfo}>
          <Text style={styles.txTitle}>{titleText}</Text>
          <Text style={styles.txDate}>
            {new Date(item.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <Text style={[styles.txAmount, { color: isCredit ? '#10B981' : '#1C1917', fontWeight: '800' }]}>
          {isCredit ? `+${item.amount} Ar` : `-${item.amount} Ar`}
        </Text>
      </View>
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
      
      {/* 1. If not logged in, show Auth Banner */}
      {!user ? (
        <View style={styles.anonymousContainer}>
          <View style={styles.anonIconBadge}>
            <Ionicons name="wallet-outline" size={48} color="#F97316" />
          </View>
          <Text style={styles.anonTitle}>Portefeuille QueuePay</Text>
          <Text style={styles.anonText}>
            Connectez-vous pour créditer votre compte instantanément par Mobile Money (Mvola, Orange Money, Airtel Money) et payer vos tickets sans attente.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')} activeOpacity={0.88}>
            <Text style={styles.loginButtonText}>Se connecter à mon compte</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />}
        >
          {/* Top Title */}
          <Text style={styles.pageTitle}>Portefeuille Virtual</Text>

          {/* Premium Card Display */}
          <View style={styles.walletCard}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="card" size={18} color="#F97316" />
                <Text style={styles.cardLabel}>QueuePay Pay</Text>
              </View>
              <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
                <Ionicons name={showBalance ? "eye-outline" : "eye-off-outline"} size={20} color="#A8A29E" />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceContainer}>
              <Text style={styles.balanceTitle}>Solde disponible</Text>
              <Text style={styles.balanceAmount}>
                {showBalance ? `${user.wallet_balance !== undefined ? user.wallet_balance : (user.balance || 0)} Ar` : '•••••••• Ar'}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardHolderName}>{user.name || 'Client VIP'}</Text>
              <Text style={styles.cardRegion}>Madagascar 🇲🇬</Text>
            </View>
          </View>

          {/* Deposit Actions Section */}
          <Text style={styles.sectionTitle}>Recharger mon solde</Text>
          <Text style={styles.sectionSubtitle}>Choisissez votre opérateur Mobile Money</Text>

          <View style={styles.operatorsGrid}>
            <TouchableOpacity 
              style={[styles.operatorBtn, { borderColor: '#10B981', backgroundColor: '#F0FDF4' }]} 
              onPress={() => handleOpenDeposit('MVOLA')}
              activeOpacity={0.85}
            >
              <View style={[styles.operatorLogoBadge, { backgroundColor: '#10B981' }]}>
                <Ionicons name="phone-portrait" size={16} color="#FFFDFB" />
              </View>
              <Text style={[styles.operatorName, { color: '#065F46' }]}>MVOLA</Text>
              <Text style={styles.operatorSub}>Telma</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.operatorBtn, { borderColor: '#F97316', backgroundColor: '#FFF7ED' }]} 
              onPress={() => handleOpenDeposit('ORANGE_MONEY')}
              activeOpacity={0.85}
            >
              <View style={[styles.operatorLogoBadge, { backgroundColor: '#F97316' }]}>
                <Ionicons name="phone-portrait" size={16} color="#FFFDFB" />
              </View>
              <Text style={[styles.operatorName, { color: '#9A3412' }]}>Orange Money</Text>
              <Text style={styles.operatorSub}>Orange</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.operatorBtn, { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]} 
              onPress={() => handleOpenDeposit('AIRTEL_MONEY')}
              activeOpacity={0.85}
            >
              <View style={[styles.operatorLogoBadge, { backgroundColor: '#EF4444' }]}>
                <Ionicons name="phone-portrait" size={16} color="#FFFDFB" />
              </View>
              <Text style={[styles.operatorName, { color: '#991B1B' }]}>Airtel Money</Text>
              <Text style={styles.operatorSub}>Airtel</Text>
            </TouchableOpacity>
          </View>

          {/* Transactions History */}
          <View style={styles.txSectionHeader}>
            <Text style={styles.sectionTitle}>Dernières opérations</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyTxContainer}>
              <Ionicons name="swap-vertical-outline" size={36} color="#D6D3D1" />
              <Text style={styles.emptyTxText}>Aucune transaction récente</Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={renderTxItem}
              scrollEnabled={false}
            />
          )}

        </ScrollView>
      )}

      {/* Deposit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recharge via {operator}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#78716C" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <View style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Montant à recharger (Ar) (Min 1 000 Ar - Max 20 000 Ar)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="ex: 10000"
                    placeholderTextColor="#A8A29E"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <View style={styles.quickChipsContainer}>
                    {['2000', '5000', '10000', '20000'].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[
                          styles.quickChip,
                          amount === val ? styles.quickChipActive : null
                        ]}
                        onPress={() => setAmount(val)}
                      >
                        <Text style={[
                          styles.quickChipText,
                          amount === val ? styles.quickChipTextActive : null
                        ]}>
                          +{val} Ar
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Numéro {operator}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="034XX / 032XX / 033XX"
                    placeholderTextColor="#A8A29E"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Code Secret PIN (Simulation)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Code PIN à 4 ou 6 chiffres"
                    placeholderTextColor="#A8A29E"
                    secureTextEntry
                    keyboardType="numeric"
                    value={pin}
                    onChangeText={setPin}
                  />
                </View>

                <TouchableOpacity 
                  style={[styles.depositSubmitBtn, { backgroundColor: operator === 'MVOLA' ? '#10B981' : operator === 'ORANGE_MONEY' ? '#F97316' : '#EF4444' }]} 
                  onPress={handleDepositSubmit}
                  disabled={depositLoading}
                  activeOpacity={0.88}
                >
                  {depositLoading ? (
                    <ActivityIndicator color="#FFFDFB" />
                  ) : (
                    <Text style={styles.depositSubmitText}>Valider le dépôt</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 100,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  walletCard: {
    backgroundColor: '#1C1917',
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: '#F97316',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  balanceContainer: {
    marginVertical: 20,
  },
  balanceTitle: {
    color: '#A8A29E',
    fontSize: 12,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFFDFB',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingTop: 14,
  },
  cardHolderName: {
    color: '#E7E5E4',
    fontSize: 13,
    fontWeight: '700',
  },
  cardRegion: {
    color: '#A8A29E',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
    marginBottom: 16,
  },
  operatorsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  operatorBtn: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
  },
  operatorLogoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  operatorName: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  operatorSub: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 2,
  },
  txSectionHeader: {
    marginBottom: 14,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F2E8DF',
    padding: 14,
    marginBottom: 10,
  },
  txIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1C1917',
  },
  txDate: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
  emptyTxContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTxText: {
    fontSize: 13,
    color: '#A8A29E',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFDFB',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
  },
  modalBody: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#44403C',
  },
  modalInput: {
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1C1917',
  },
  quickChipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  quickChip: {
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#EAD8C3',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickChipActive: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#78716C',
  },
  quickChipTextActive: {
    color: '#FFFDFB',
  },
  depositSubmitBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  depositSubmitText: {
    color: '#FFFDFB',
    fontSize: 14,
    fontWeight: '800',
  },
});
