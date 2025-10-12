import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface NotificationBadgeProps {
  title: string;
  message: string;
  type: 'interview' | 'followup' | 'application' | 'system';
  timestamp: Date;
  onPress?: () => void;
  onDismiss?: () => void;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  title,
  message,
  type,
  timestamp,
  onPress,
  onDismiss,
}) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'interview': return '#3B82F6';
      case 'followup': return '#8B5CF6';
      case 'application': return '#10B981';
      case 'system': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'interview': return '🎤';
      case 'followup': return '🔄';
      case 'application': return '📝';
      case 'system': return '⚙️';
      default: return '📱';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: getTypeColor(type) }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Text style={styles.typeIcon}>{getTypeIcon(type)}</Text>
          <Text style={[styles.typeText, { color: getTypeColor(type) }]}>
            {type.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <Text style={styles.timestamp}>
          {format(timestamp, 'dd/MM/yyyy HH:mm', { locale: fr })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default NotificationBadge;
