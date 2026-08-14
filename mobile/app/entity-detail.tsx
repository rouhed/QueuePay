import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/constants/api';

export default function EntityDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetch(`${API_BASE_URL}/client/entities/${id}`)
        .then(res => res.json())
        .then(resData => {
          setData(resData);
          setLoading(false);
        })
        .catch(err => {
          Alert.alert('Erreur', 'Impossible de récupérer les détails de cette entreprise.');
          setLoading(false);
        });
    }
  }, [id]);

  const handleBookService = async (service: any) => {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert(
        'Connexion requise',
        "Veuillez vous connecter d'abord pour réserver un ticket.",
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/auth') }
        ]
      );
      return;
    }

    // Go to booking screen, passing entity details and service details
    router.push({
      pathname: '/booking',
      params: {
        entityId: id,
        entityName: data.entity.name,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

  if (!data || !data.entity) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Entreprise introuvable.</Text>
      </View>
    );
  }

  const { entity, services, settings } = data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* Banner / Header Card */}
      <View style={styles.headerCard}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#292524" />
        </TouchableOpacity>
        
        <View style={styles.profileContainer}>
          {entity.logo_url ? (
            <Image source={{ uri: entity.logo_url }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="business" size={40} color="#F97316" />
            </View>
          )}
          <Text style={styles.title}>{entity.name}</Text>
          <Text style={styles.description}>{entity.description || "Aucune description fournie."}</Text>
        </View>
      </View>

      {/* Info settings */}
      {settings && (
        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>Disponibilités & Horaires</Text>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#78716C" />
            <Text style={styles.infoText}>
              Horaires : {settings.working_hours_start.slice(0, 5)} - {settings.working_hours_end.slice(0, 5)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#78716C" />
            <Text style={styles.infoText}>
              Jours : {settings.working_days.split(',').map((d: string) => {
                const map: any = { 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam', 7: 'Dim' };
                return map[d] || d;
              }).join(', ')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="hourglass-outline" size={16} color="#78716C" />
            <Text style={styles.infoText}>
              Durée estimée moyenne : {settings.average_duration_minutes} minutes par client
            </Text>
          </View>
        </View>
      )}

      {/* Services List */}
      <View style={styles.servicesContainer}>
        <Text style={styles.sectionTitle}>Sélectionnez un Service</Text>
        {services.length === 0 ? (
          <Text style={styles.emptyText}>Aucun service disponible pour le moment.</Text>
        ) : (
          services.map((s: any) => (
            <TouchableOpacity 
              key={s.id} 
              style={styles.serviceCard}
              onPress={() => handleBookService(s)}
            >
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceDesc}>{s.description || 'Service disponible en réservation'}</Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>{s.price} Ar</Text>
                <Ionicons name="chevron-forward" size={18} color="#F97316" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

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
    backgroundColor: '#FFFDFB',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    left: 12,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerCard: {
    backgroundColor: '#FAF6F0',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F7EBE1',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EAD8C3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontFamily: 'Outfit',
    fontSize: 22,
    fontWeight: '800',
    color: '#292524',
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#78716C',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  settingsCard: {
    backgroundColor: '#FFFDFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F7EBE1',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Outfit',
    fontSize: 15,
    fontWeight: '800',
    color: '#292524',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#78716C',
    fontWeight: '600',
  },
  servicesContainer: {
    marginBottom: 20,
  },
  serviceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F7EBE1',
    marginBottom: 10,
  },
  serviceInfo: {
    flex: 1,
    paddingRight: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#292524',
  },
  serviceDesc: {
    fontSize: 12,
    color: '#78716C',
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F97316',
  },
  emptyText: {
    fontSize: 13,
    color: '#78716C',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
