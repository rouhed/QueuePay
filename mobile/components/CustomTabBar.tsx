import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const getIconName = (routeName: string, focused: boolean) => {
    switch (routeName) {
      case 'index':
        return focused ? 'home' : 'home-outline';
      case 'explore':
        return focused ? 'wallet' : 'wallet-outline';
      case 'tickets':
        return focused ? 'ticket' : 'ticket-outline';
      case 'profile':
        return focused ? 'person' : 'person-outline';
      default:
        return 'grid-outline';
    }
  };

  const getLabel = (routeName: string) => {
    switch (routeName) {
      case 'index':
        return 'Accueil';
      case 'explore':
        return 'Portefeuille';
      case 'tickets':
        return 'Tickets';
      case 'profile':
        return 'Profil';
      default:
        return routeName;
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.floatingBar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconName = getIconName(route.name, isFocused);
          const label = getLabel(route.name);

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {/* Perfectly Circle Orange Disk */}
              <View style={[styles.circleBadge, isFocused && styles.circleBadgeActive]}>
                <Ionicons
                  name={iconName as any}
                  size={20}
                  color={isFocused ? '#FFFDFB' : '#78716C'}
                />
              </View>
              
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  floatingBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFDFB',
    borderRadius: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#F2E8DF',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  circleBadge: {
    width: 42,
    height: 42,
    borderRadius: 999, // Guaranteed 100% round circle
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  circleBadgeActive: {
    backgroundColor: '#F97316',
    borderRadius: 999, // Guaranteed 100% round circle
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#F97316',
    fontWeight: '900',
  },
});
