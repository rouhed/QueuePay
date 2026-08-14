import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface QueuePayLogoProps {
  size?: number;
  showText?: boolean;
}

export default function QueuePayLogo({ size = 30, showText = true }: QueuePayLogoProps) {
  return (
    <View style={styles.container}>
      {/* Icon Shape */}
      <View style={[styles.logoIcon, { width: size, height: size, borderRadius: size / 2 }]}>
        {/* Card outline inside logo */}
        <View style={styles.cardOutline} />
        {/* Glow chip inside logo */}
        <View style={styles.chipGlow} />
        {/* Ticket tail */}
        <View style={styles.ticketTail} />
      </View>
      
      {showText && (
        <Text style={[styles.logoText, { fontSize: size * 0.7 }]}>
          Queue<Text style={styles.highlightText}>Pay</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2.5,
    borderColor: '#F7EBE1',
  },
  cardOutline: {
    width: '60%',
    height: '40%',
    borderRadius: 2.5,
    backgroundColor: '#292524',
    position: 'relative',
  },
  chipGlow: {
    position: 'absolute',
    left: '25%',
    top: '40%',
    width: '20%',
    height: '25%',
    backgroundColor: '#FF9D5C',
    borderRadius: 0.5,
  },
  ticketTail: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: '35%',
    height: '20%',
    backgroundColor: '#F97316',
    borderRadius: 1,
    transform: [{ rotate: '45deg' }],
  },
  logoText: {
    fontFamily: 'Outfit',
    fontWeight: '800',
    color: '#292524',
    letterSpacing: -0.5,
  },
  highlightText: {
    color: '#F97316',
  },
});
