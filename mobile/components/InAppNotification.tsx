import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../contexts/NotificationContext';

const { width } = Dimensions.get('window');

export const InAppNotification: React.FC = () => {
  const { notification, dismissNotification } = useNotifications();
  const slideAnim = useRef(new Animated.Value(-150)).current;

  useEffect(() => {
    if (notification.visible) {
      // Slide Down Animation
      Animated.spring(slideAnim, {
        toValue: Platform.OS === 'ios' ? 50 : 20,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }).start();

      // Auto Dismiss after 4 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 4500);

      return () => clearTimeout(timer);
    } else {
      // Slide Up Animation
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [notification.visible]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      dismissNotification();
    });
  };

  if (!notification.visible) return null;

  // Set colors based on notification type
  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: '#ECFDF5',
          border: '#10B981',
          iconColor: '#10B981',
          iconName: 'checkmark-circle' as const,
        };
      case 'warning':
        return {
          bg: '#FFFBEB',
          border: '#F59E0B',
          iconColor: '#F59E0B',
          iconName: 'warning' as const,
        };
      case 'error':
        return {
          bg: '#FEF2F2',
          border: '#EF4444',
          iconColor: '#EF4444',
          iconName: 'alert-circle' as const,
        };
      case 'info':
      default:
        return {
          bg: '#F0F9FF',
          border: '#0284C7',
          iconColor: '#0284C7',
          iconName: 'information-circle' as const,
        };
    }
  };

  const currentConfig = getStyles();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          backgroundColor: currentConfig.bg,
          borderColor: currentConfig.border,
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.content} 
        activeOpacity={0.9}
        onPress={handleDismiss}
      >
        <Ionicons name={currentConfig.iconName} size={24} color={currentConfig.iconColor} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{notification.title}</Text>
          <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
        </View>
        <Ionicons name="close" size={18} color="#78716C" style={styles.closeIcon} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#292524',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  title: {
    fontFamily: 'Outfit',
    fontSize: 14,
    fontWeight: '800',
    color: '#292524',
  },
  message: {
    fontSize: 12,
    color: '#44403C',
    marginTop: 2,
    fontWeight: '500',
    lineHeight: 16,
  },
  closeIcon: {
    padding: 2,
  },
});
