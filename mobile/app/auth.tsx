import React, { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QueuePayLogo from '@/components/QueuePayLogo';
import { useNotifications } from '@/contexts/NotificationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/constants/api';

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshSocketConnection, triggerNotification } = useNotifications();
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'forgot' | 'reset'>('login');
  const [loading, setLoading] = useState(false);

  // Form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Field error messages
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string; phone?: string; otp?: string; general?: string }>({});

  const handleLogin = async () => {
    const newErrors: any = {};
    if (!email) newErrors.email = 'L\'adresse email ou numéro est requis.';
    if (!password) newErrors.password = 'Le mot de passe est obligatoire.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login_id: email, password })
      });
      const data = await res.json();
      if (res.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        triggerNotification('Connexion réussie', `Bienvenue, ${data.user.name} ! 👋`, 'success');
        refreshSocketConnection();
        router.replace('/(tabs)');
      } else {
        setErrors({ general: data.error || 'Identifiants incorrects.' });
      }
    } catch (err) {
      setErrors({ general: 'Erreur réseau. Impossible de contacter le serveur.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    const newErrors: any = {};
    if (!name) newErrors.name = 'Votre nom complet est obligatoire.';
    if (!email) newErrors.email = 'L\'adresse email est obligatoire.';
    if (!phone) newErrors.phone = 'Le numéro de téléphone est obligatoire.';
    if (!password) newErrors.password = 'Veuillez créer un mot de passe (min. 6 caractères).';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone_number: phone, password })
      });
      const data = await res.json();
      if (res.ok) {
        setMode('otp');
        triggerNotification('Code envoyé', 'Code de vérification envoyé à votre email.', 'info');
      } else {
        setErrors({ general: data.error || 'Impossible de vous inscrire.' });
      }
    } catch (err) {
      setErrors({ general: 'Erreur réseau. Vérifiez votre connexion.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      setErrors({ otp: 'Veuillez saisir le code OTP à 6 chiffres.' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (res.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        triggerNotification('Compte vérifié avec succès ! 🎉', 'success');
        refreshSocketConnection();
        router.replace('/(tabs)');
      } else {
        setErrors({ general: data.error || 'Code de vérification incorrect.' });
      }
    } catch (err) {
      setErrors({ general: 'Erreur réseau.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
        
        {/* Top Header */}
        <View style={styles.header}>
          <QueuePayLogo size={42} />
          <Text style={styles.title}>QueuePay Client</Text>
          <Text style={styles.subtitle}>Gagnez du temps, organisez vos réservations de tickets à Madagascar</Text>
        </View>

        {/* Global Error Banner */}
        {errors.general && (
          <View style={styles.generalErrorBanner}>
            <Ionicons name="alert-circle" size={18} color="#EF4444" />
            <Text style={styles.generalErrorText}>{errors.general}</Text>
          </View>
        )}

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connexion à votre compte</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Adresse email ou Téléphone <Text style={styles.asterisk}>*</Text></Text>
              <View style={[styles.inputContainer, errors.email ? styles.inputContainerError : null]}>
                <Ionicons name="mail-outline" size={18} color={errors.email ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="votre.email@gmail.com" 
                  placeholderTextColor="#A8A29E"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.fieldErrorText}>{errors.email}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Mot de passe <Text style={styles.asterisk}>*</Text></Text>
              <View style={[styles.inputContainer, errors.password ? styles.inputContainerError : null]}>
                <Ionicons name="lock-closed-outline" size={18} color={errors.password ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Mot de passe" 
                  placeholderTextColor="#A8A29E"
                  secureTextEntry
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                />
              </View>
              {errors.password && <Text style={styles.fieldErrorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFDFB" />
              ) : (
                <Text style={styles.submitBtnText}>Se Connecter</Text>
              )}
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Nouveau sur QueuePay ?</Text>
              <TouchableOpacity onPress={() => { setMode('register'); setErrors({}); }}>
                <Text style={styles.switchBtnText}>Créer un compte</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MODE: REGISTER */}
        {mode === 'register' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Créer un compte Client</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Nom complet <Text style={styles.asterisk}>*</Text></Text>
              <View style={[styles.inputContainer, errors.name ? styles.inputContainerError : null]}>
                <Ionicons name="person-outline" size={18} color={errors.name ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="ex: Jean Rabe" 
                  placeholderTextColor="#A8A29E"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    setErrors(prev => ({ ...prev, name: undefined }));
                  }}
                />
              </View>
              {errors.name && <Text style={styles.fieldErrorText}>{errors.name}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Adresse email <Text style={styles.asterisk}>*</Text></Text>
              <View style={[styles.inputContainer, errors.email ? styles.inputContainerError : null]}>
                <Ionicons name="mail-outline" size={18} color={errors.email ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="jean.rabe@gmail.com" 
                  placeholderTextColor="#A8A29E"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              {errors.email && <Text style={styles.fieldErrorText}>{errors.email}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Numéro de téléphone <Text style={styles.asterisk}>*</Text></Text>
              <View style={[styles.inputContainer, errors.phone ? styles.inputContainerError : null]}>
                <Ionicons name="phone-portrait-outline" size={18} color={errors.phone ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="034XX / 032XX / 033XX" 
                  placeholderTextColor="#A8A29E"
                  value={phone}
                  onChangeText={(val) => {
                    setPhone(val);
                    setErrors(prev => ({ ...prev, phone: undefined }));
                  }}
                  keyboardType="phone-pad"
                />
              </View>
              {errors.phone && <Text style={styles.fieldErrorText}>{errors.phone}</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Mot de passe <Text style={styles.asterisk}>*</Text></Text>
              <View style={[styles.inputContainer, errors.password ? styles.inputContainerError : null]}>
                <Ionicons name="lock-closed-outline" size={18} color={errors.password ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Au moins 6 caractères" 
                  placeholderTextColor="#A8A29E"
                  secureTextEntry
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                />
              </View>
              {errors.password && <Text style={styles.fieldErrorText}>{errors.password}</Text>}
            </View>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFDFB" />
              ) : (
                <Text style={styles.submitBtnText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchText}>Vous avez déjà un compte ?</Text>
              <TouchableOpacity onPress={() => { setMode('login'); setErrors({}); }}>
                <Text style={styles.switchBtnText}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MODE: OTP */}
        {mode === 'otp' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Vérification Email (OTP)</Text>
            <Text style={styles.cardSubTitle}>
              Saisissez le code à 6 chiffres envoyé à <Text style={{ fontWeight: '800', color: '#1C1917' }}>{email}</Text>
            </Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Code OTP <Text style={styles.asterisk}>*</Text></Text>
              <View style={[styles.inputContainer, errors.otp ? styles.inputContainerError : null]}>
                <Ionicons name="key-outline" size={18} color={errors.otp ? "#EF4444" : "#78716C"} style={styles.inputIcon} />
                <TextInput 
                  style={styles.input} 
                  placeholder="Code OTP (ex: 123456)" 
                  placeholderTextColor="#A8A29E"
                  keyboardType="numeric"
                  value={otp}
                  onChangeText={(val) => {
                    setOtp(val);
                    setErrors(prev => ({ ...prev, otp: undefined }));
                  }}
                />
              </View>
              {errors.otp && <Text style={styles.fieldErrorText}>{errors.otp}</Text>}
            </View>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={handleVerifyOtp}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#FFFDFB" />
              ) : (
                <Text style={styles.submitBtnText}>Valider mon compte</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 16, alignItems: 'center' }} onPress={() => setMode('login')}>
              <Text style={{ fontSize: 13, color: '#78716C', fontWeight: '600' }}>Retour à la connexion</Text>
            </TouchableOpacity>
          </View>
        )}

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
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1C1917',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
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
  card: {
    backgroundColor: '#FFFDFB',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#F2E8DF',
    padding: 24,
    gap: 16,
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1C1917',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubTitle: {
    fontSize: 13,
    color: '#78716C',
    lineHeight: 18,
    marginBottom: 10,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EAD8C3',
    paddingHorizontal: 14,
    height: 50,
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
    marginTop: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFDFB',
    fontSize: 15,
    fontWeight: '900',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  switchText: {
    fontSize: 13,
    color: '#78716C',
  },
  switchBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F97316',
  },
});
