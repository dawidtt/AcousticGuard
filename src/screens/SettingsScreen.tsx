import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [sensitivity, setSensitivity] = useState(2.5);
  const [alarmThreshold, setAlarmThreshold] = useState(85);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const savedSens = await AsyncStorage.getItem('sensitivity');
      const savedThresh = await AsyncStorage.getItem('alarmThreshold');
      if (savedSens) setSensitivity(parseFloat(savedSens));
      if (savedThresh) setAlarmThreshold(parseInt(savedThresh));
    };
    loadSettings();
  }, []);

  const handleSensitivityChange = async (val: number) => {
    setSensitivity(val);
    await AsyncStorage.setItem('sensitivity', val.toString());
  };

  const handleThresholdChange = async (val: number) => {
    setAlarmThreshold(val);
    await AsyncStorage.setItem('alarmThreshold', val.toString());
    setIsDropdownOpen(false);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Pomiar')} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1D1B20" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ustawienia</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Monitorowanie</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Czułość mikrofonu (Offset)</Text>
          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={-10}
              maximumValue={10}
              step={0.5}
              value={sensitivity}
              onValueChange={handleSensitivityChange}
              minimumTrackTintColor="#4A0072"
              maximumTrackTintColor="#E8DEF8"
              thumbTintColor="#4A0072"
            />
            <Text style={styles.sliderValue}>{sensitivity > 0 ? `+${sensitivity.toFixed(1)}` : sensitivity.toFixed(1)} dB</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Próg alarmu (dB)</Text>
          <TouchableOpacity onPress={() => setIsDropdownOpen(!isDropdownOpen)} style={styles.dropdownBtn}>
            <Text style={styles.dropdownText}>{alarmThreshold} dB</Text>
            <MaterialCommunityIcons name={isDropdownOpen ? "chevron-up" : "chevron-down"} size={24} color="#49454F" />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownList}>
              {[50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100].map((option) => (
                <TouchableOpacity 
                  key={option} 
                  onPress={() => handleThresholdChange(option)} 
                  style={[styles.option, alarmThreshold === option && styles.selectedOption]}
                >
                  <Text style={styles.optionText}>{option} dB</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { backgroundColor: '#F3EDF7', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: '#1D1B20' },
  scroll: { flex: 1, padding: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '500', color: '#1D1B20', marginBottom: 16 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 24, borderWidth: 2, borderColor: '#9CA3AF', marginBottom: 20 },
  label: { fontSize: 14, color: '#49454F', marginBottom: 12 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slider: { flex: 1, height: 40 },
  sliderValue: { fontSize: 14, fontWeight: '600', color: '#1D1B20', width: 64, textAlign: 'right' },
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 2, borderColor: '#4A0072', borderRadius: 12, padding: 12, marginTop: 4 },
  dropdownText: { fontSize: 16, color: '#1D1B20' },
  dropdownList: { borderWidth: 2, borderColor: '#9CA3AF', borderRadius: 12, backgroundColor: '#F3EDF7', marginTop: 4 },
  option: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  selectedOption: { backgroundColor: '#E8DEF8' },
  optionText: { fontSize: 16, color: '#1D1B20' }
});