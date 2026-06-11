import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getHistory } from '../services/database';

export const HistoryScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [authorized, setAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Funkcja pomocnicza do formatowania daty
  const formatDisplayDate = (timestamp: string) => {
    // timestamp jest w formacie "YYYY-MM-DD HH:MM:SS"
    const measurementDate = timestamp.substring(0, 10);
    const today = new Date().toISOString().substring(0, 10);

    if (measurementDate === today) {
      return `Dzisiaj, ${timestamp.substring(11, 16)}`;
    }
    // Zwraca format DD.MM, HH:MM (np. 11.06, 23:40)
    const [year, month, day] = measurementDate.split('-');
    return `${day}.${month}, ${timestamp.substring(11, 16)}`;
  };

  const authenticateAndLoad = async () => {
    setIsChecking(true);
    const lastAuth = await AsyncStorage.getItem('lastAuthTime');
    const now = Date.now();

    if (lastAuth && now - parseInt(lastAuth) < 300000) {
      setMeasurements(getHistory());
      setAuthorized(true);
      setIsChecking(false);
      return;
    }

    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Autoryzacja dostępu do historii',
      fallbackLabel: 'Użyj kodu PIN',
    });

    if (auth.success) {
      await AsyncStorage.setItem('lastAuthTime', now.toString());
      setMeasurements(getHistory());
      setAuthorized(true);
    } else {
      navigation.navigate('Pomiar');
    }
    setIsChecking(false);
  };

  useFocusEffect(useCallback(() => { 
    authenticateAndLoad(); 
  }, []));

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Pomiar')} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1D1B20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historia pomiarów</Text>
      </View>

      {authorized && !isChecking ? (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.listContainer}>
            {measurements.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dbText}>{Math.round(item.db)} dB</Text>
                  <Text style={styles.locationText}>{item.location}</Text>
                  <Text style={styles.durationText}>Czas trwania: {item.duration}s</Text>
                </View>
                <Text style={styles.timeText}>
                  {item.timestamp ? formatDisplayDate(item.timestamp) : '--:--'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.fullScreenOverlay}>
          {!isChecking && <Text style={styles.authText}>Autoryzacja wymagana</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { backgroundColor: '#F3EDF7', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#1D1B20' },
  scroll: { flex: 1, padding: 24 },
  fullScreenOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  authText: { fontSize: 16, color: '#6B7280' },
  listContainer: { paddingBottom: 40 },
  listItem: { backgroundColor: '#FCE4FF', padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#F3DBF5' },
  dbText: { fontSize: 20, fontWeight: '700', color: '#4A0072' },
  locationText: { fontSize: 14, color: '#4B5563', marginTop: 4 },
  durationText: { fontSize: 12, color: '#888', fontStyle: 'italic', marginTop: 2 },
  timeText: { fontSize: 12, color: '#4A0072', fontWeight: 'bold', textAlign: 'right', marginLeft: 10 }
});