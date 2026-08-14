import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QueuePayLogo from '@/components/QueuePayLogo';
import { useNotifications } from '@/contexts/NotificationContext';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const { refreshSocketConnection } = useNotifications();
  
  // Animation states
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Logo animations (fade in + scale up)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. ProgressBar animation (simulated loading)
    Animated.timing(progressAnim, {
      toValue: width * 0.6, // 60% of screen width
      duration: 2000,
      useNativeDriver: false, // width is not supported by native driver
    }).start();

    // 3. Routing decision after animation
    const checkAuthAndRoute = async () => {
      // Wait for the full 2.2 seconds splash animation
      await new Promise((resolve) => setTimeout(resolve, 2200));

      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          // Re-initialize socket connection
          await refreshSocketConnection();
        }
        // Redirect to Home Tabs
        router.replace('/(tabs)');
      } catch (err) {
        console.error('Splash routing error:', err);
        router.replace('/(tabs)');
      }
    };

    checkAuthAndRoute();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <QueuePayLogo size={90} />
          <Text style={styles.title}>QueuePay</Text>
          <Text style={styles.subtitle}>Votre file d'attente digitale premium</Text>
        </Animated.View>

        {/* Premium Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                { width: progressAnim },
              ]}
            />
          </View>
          <Text style={styles.loadingText}>Chargement sécurisé...</Text>
        </View>
      </View>
      
      <Text style={styles.footerText}>QueuePay v1.1 • Madagascar 2026</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFB', // Premium off-white background
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontFamily: 'Outfit',
    fontSize: 32,
    fontWeight: '900',
    color: '#292524',
    marginTop: 16,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#78716C',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  progressBarBackground: {
    width: width * 0.6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F7EBE1', // Light saffron border/bg
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#F97316', // Vibrant saffron
  },
  loadingText: {
    fontSize: 11,
    color: '#A8A29E',
    marginTop: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footerText: {
    fontSize: 11,
    color: '#A8A29E',
    fontWeight: '600',
  },
});
