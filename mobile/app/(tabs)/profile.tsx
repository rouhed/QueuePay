import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationContext';
import { API_BASE_URL } from '@/constants/api';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshSocketConnection } = useNotifications();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      }
    } catch (err) {
      console.error('Fetch profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir déconnecter votre compte ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            setUser(null);
            refreshSocketConnection();
            router.push('/auth');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'QP';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {!user ? (
        <View style={styles.anonymousContainer}>
          <View style={styles.anonIconBadge}>
            <Ionicons name="person-outline" size={48} color="#F97316" />
          </View>
          <Text style={styles.anonTitle}>Votre Profil Client</Text>
          <Text style={styles.anonText}>
            Connectez-vous pour gérer vos informations personnelles, consulter le solde de votre portefeuille et sécuriser vos accès.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/auth')} activeOpacity={0.88}>
            <Text style={styles.loginButtonText}>Se connecter à mon compte</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>Profil & Réglages</Text>

          {/* Profile Header Card */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
            </View>
            
            <View style={styles.profileDetails}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              {(user.phone_number || user.phone) ? (
                <Text style={styles.userPhone}>{user.phone_number || user.phone}</Text>
              ) : null}
            </View>
          </View>

          {/* Wallet Mini Overview */}
          <View style={styles.walletMiniCard}>
            <View>
              <Text style={styles.walletMiniTitle}>Solde Portefeuille QueuePay</Text>
              <Text style={styles.walletMiniAmount}>
                {user.wallet_balance !== undefined ? user.wallet_balance : (user.balance || 0)} Ar
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.rechargeBtn}
              onPress={() => router.push('/explore')}
              activeOpacity={0.88}
            >
              <Ionicons name="add-circle" size={16} color="#FFFDFB" />
              <Text style={styles.rechargeBtnText}>Recharger</Text>
            </TouchableOpacity>
          </View>

          {/* Account Actions Group */}
          <Text style={styles.sectionHeaderTitle}>Compte & Sécurité</Text>

          <View style={styles.actionGroup}>
            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
              <View style={styles.actionIconBadge}>
                <Ionicons name="notifications-outline" size={20} color="#F97316" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Notifications & Alertes</Text>
                <Text style={styles.actionSubtitle}>Recevoir les e-mails et alertes SMS</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D6D3D1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
              <View style={styles.actionIconBadge}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Sécurité & Code PIN</Text>
                <Text style={styles.actionSubtitle}>Protéger les transactions Mobile Money</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D6D3D1" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} activeOpacity={0.7}>
              <View style={styles.actionIconBadge}>
                <Ionicons name="help-circle-outline" size={20} color="#6366F1" />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Centre d'aide & FAQ</Text>
                <Text style={styles.actionSubtitle}>Comment fonctionnent les tickets en ligne</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D6D3D1" />
            </TouchableOpacity>
          </View>

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Se déconnecter</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>QueuePay Mobile v1.2.0 • Madagascar 🇲🇬</Text>
        </ScrollView>
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
  profileHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: '#FFFDFB',
    fontSize: 20,
    fontWeight: '900',
  },
  profileDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1C1917',
  },
  userEmail: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '700',
    marginTop: 2,
  },
  walletMiniCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAD8C3',
    padding: 18,
    marginBottom: 28,
  },
  walletMiniTitle: {
    fontSize: 11,
    color: '#78716C',
    fontWeight: '700',
  },
  walletMiniAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 2,
  },
  rechargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rechargeBtnText: {
    color: '#FFFDFB',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 12,
  },
  actionGroup: {
    backgroundColor: '#FFFDFB',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#F2E8DF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 28,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F7EBE1',
  },
  actionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FAF6F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
  },
  actionSubtitle: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '800',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#A8A29E',
    fontWeight: '600',
  },
});
