import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { Alert } from 'react-native';
import { API_BASE_URL } from '@/constants/api';

import CelebrationBurst from '@/components/CelebrationBurst';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

interface InAppNotificationState {
  visible: boolean;
  title: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextProps {
  notification: InAppNotificationState;
  triggerNotification: (title: string, message?: string | NotificationType, type?: NotificationType) => void;
  dismissNotification: () => void;
  socket: any;
  userId: number | null;
  refreshSocketConnection: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<InAppNotificationState>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [socket, setSocket] = useState<any>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [celebration, setCelebration] = useState<{
    visible: boolean;
    ticketNumber?: string;
    entityName?: string;
    serviceName?: string;
  }>({ visible: false });

  const dismissNotification = () => {
    setNotification((prev) => ({ ...prev, visible: false }));
  };

  const triggerNotification = (title: string, messageOrType?: string | NotificationType, typeParam?: NotificationType) => {
    let finalMessage = '';
    let finalType: NotificationType = 'info';

    if (typeParam) {
      finalMessage = messageOrType as string;
      finalType = typeParam;
    } else if (messageOrType === 'success' || messageOrType === 'info' || messageOrType === 'warning' || messageOrType === 'error') {
      finalMessage = title;
      finalType = messageOrType as NotificationType;
    } else if (typeof messageOrType === 'string') {
      finalMessage = messageOrType;
      finalType = 'info';
    } else {
      finalMessage = title;
    }

    setNotification({
      visible: true,
      title,
      message: finalMessage,
      type: finalType,
    });
  };

  const refreshSocketConnection = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      let currentUserId: number | null = null;

      if (token) {
        try {
          const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (meRes.ok) {
            const data = await meRes.json();
            if (data.user && data.user.id) {
              currentUserId = data.user.id;
              setUserId(currentUserId);
            }
          }
        } catch (e) {
          console.error('Error fetching user for socket:', e);
        }
      } else {
        setUserId(null);
      }

      // Maintain persistent WS connection (even for guests to get entity/queue updates)
      if (socket) {
        socket.disconnect();
      }

      const newSocket = io(API_BASE_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('Mobile WS Connected successfully!');
        if (currentUserId) {
          newSocket.emit('joinClient', currentUserId);
        }
      });

      newSocket.on('ticketCall', (callData: any) => {
        console.log('WS Alert: ticketCall received', callData);
        triggerNotification(
          "C'est votre tour ! 🎫",
          `Ticket N°${callData.ticket_number} appelé au ${callData.desk_name} pour ${callData.service_name}.`,
          'success'
        );
        Alert.alert(
          "C'est votre tour !",
          `Veuillez vous présenter immédiatement au ${callData.desk_name} pour le service ${callData.service_name}.`
        );
      });

      newSocket.on('ticketApproaching', (approachData: any) => {
        console.log('WS Alert: ticketApproaching received', approachData);
        triggerNotification(
          "Votre tour approche ! ⚠️",
          `Ticket N°${approachData.ticket_number} : il reste 3 clients avant vous !`,
          'warning'
        );
      });

      newSocket.on('ticketCompleted', (compData: any) => {
        console.log('WS Alert: ticketCompleted received', compData);
        triggerNotification(
          "Service Terminé ! 🎉",
          `Passage au guichet terminé pour le Ticket N°${compData?.ticket_number || ''}. Merci !`,
          'success'
        );
        setCelebration({
          visible: true,
          ticketNumber: compData?.ticket_number,
          entityName: compData?.entity_name,
          serviceName: compData?.service_name,
        });
      });

      newSocket.on('disconnect', () => {
        console.log('Mobile WS Disconnected');
      });

    } catch (err) {
      console.error('Socket refresh error:', err);
    }
  };

  useEffect(() => {
    refreshSocketConnection();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notification,
        triggerNotification,
        dismissNotification,
        socket,
        userId,
        refreshSocketConnection,
      }}
    >
      {children}

      <CelebrationBurst
        visible={celebration.visible}
        ticketNumber={celebration.ticketNumber}
        entityName={celebration.entityName}
        serviceName={celebration.serviceName}
        onClose={() => setCelebration({ visible: false })}
      />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
