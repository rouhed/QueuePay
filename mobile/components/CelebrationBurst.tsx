import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface CelebrationBurstProps {
  visible: boolean;
  ticketNumber?: string;
  entityName?: string;
  serviceName?: string;
  onClose: () => void;
}

export default function CelebrationBurst({
  visible,
  ticketNumber = '',
  entityName = 'Établissement',
  serviceName = 'Service',
  onClose
}: CelebrationBurstProps) {
  // 12 Animated Floating Balloons & Confetti particles
  const particleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      translateY: new Animated.Value(height * 0.7),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(0.4),
      opacity: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  // Modal scale & pulse animations
  const modalScale = useRef(new Animated.Value(0.5)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const badgePulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // 1. Animate Modal Bounce Entrance
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      // 2. Pulse Badge Icon continuous loop
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulse, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(badgePulse, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      ).start();

      // 3. Launch 12 Balloons & Confetti Particles
      particleAnims.forEach((anim, i) => {
        anim.translateY.setValue(height * 0.75);
        anim.translateX.setValue(0);
        anim.scale.setValue(0.6);
        anim.opacity.setValue(0);

        const delay = (i % 6) * 160 + Math.floor(i / 6) * 600;
        const targetX = (i % 2 === 0 ? 1 : -1) * (15 + (i * 8));

        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            // Fade in fast
            Animated.timing(anim.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            // Float upward
            Animated.timing(anim.translateY, {
              toValue: -height * 0.4 - (i * 25),
              duration: 2600 + (i * 120),
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            // Sway horizontally
            Animated.timing(anim.translateX, {
              toValue: targetX,
              duration: 2600 + (i * 120),
              useNativeDriver: true,
            }),
            // Scale and burst explosion near top
            Animated.sequence([
              Animated.timing(anim.scale, {
                toValue: 1.4,
                duration: 1600,
                useNativeDriver: true,
              }),
              Animated.timing(anim.scale, {
                toValue: 2.2,
                duration: 400,
                useNativeDriver: true,
              }),
            ]),
          ]),
          // Fade out / burst explosion
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [visible]);

  if (!visible) return null;

  const particles = [
    { emoji: '🎈', left: width * 0.08, size: 52 },
    { emoji: '🎉', left: width * 0.22, size: 48 },
    { emoji: '🎈', left: width * 0.36, size: 56 },
    { emoji: '🎊', left: width * 0.50, size: 46 },
    { emoji: '🎈', left: width * 0.64, size: 54 },
    { emoji: '🥳', left: width * 0.78, size: 48 },
    { emoji: '✨', left: width * 0.88, size: 44 },
    { emoji: '🎈', left: width * 0.15, size: 50 },
    { emoji: '🌟', left: width * 0.30, size: 46 },
    { emoji: '🎈', left: width * 0.45, size: 58 },
    { emoji: '🎉', left: width * 0.60, size: 50 },
    { emoji: '🎈', left: width * 0.75, size: 52 },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>

        {/* Floating & Exploding Balloons Layer (Z-index top) */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          {particles.map((p, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.particleContainer,
                {
                  left: p.left,
                  transform: [
                    { translateY: particleAnims[idx].translateY },
                    { translateX: particleAnims[idx].translateX },
                    { scale: particleAnims[idx].scale },
                  ],
                  opacity: particleAnims[idx].opacity,
                },
              ]}
            >
              <Text style={{ fontSize: p.size }}>{p.emoji}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Celebration Dialog Card */}
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ scale: modalScale }],
              opacity: modalOpacity,
            },
          ]}
        >
          {/* Top Pulsing Badge */}
          <Animated.View
            style={[
              styles.burstBadge,
              { transform: [{ scale: badgePulse }] }
            ]}
          >
            <Ionicons name="sparkles" size={42} color="#FFF" />
          </Animated.View>

          <Text style={styles.title}>🎉 FÉLICITATIONS & MERCI ! 🎉</Text>
          
          <View style={styles.statusBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.statusBadgeText}>SERVICE TERMINÉ AVEC SUCCÈS</Text>
          </View>

          <View style={styles.ticketBox}>
            <Text style={styles.ticketBoxLabel}>PASSAGE AU GUICHET EFFECTUÉ</Text>
            <Text style={styles.ticketBoxNumber}>N° {ticketNumber || '001'}</Text>
            <Text style={styles.ticketBoxEntity}>{entityName}</Text>
            {serviceName ? <Text style={styles.ticketBoxService}>{serviceName}</Text> : null}
          </View>

          <Text style={styles.messageText}>
            Votre passage au guichet est maintenant terminé avec succès. 🎈{'\n\n'}
            Un email de confirmation et d'attestation vous a été transmis. Merci pour votre confiance !
          </Text>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.closeButtonText}>MERCI ! (FERMER 🎈)</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 99999,
  },
  particleContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100000,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 2.5,
    borderColor: '#FFD8A8',
    zIndex: 99999,
  },
  burstBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -54,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#C2410C',
    textAlign: 'center',
    marginTop: 14,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#065F46',
    letterSpacing: 1,
  },
  ticketBox: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1.5,
    borderColor: '#FFD8A8',
  },
  ticketBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9A3412',
    letterSpacing: 1,
  },
  ticketBoxNumber: {
    fontSize: 36,
    fontWeight: '900',
    color: '#EA580C',
    marginVertical: 4,
    letterSpacing: 1,
  },
  ticketBoxEntity: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1F2937',
  },
  ticketBoxService: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  messageText: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 22,
    fontWeight: '500',
  },
  closeButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
