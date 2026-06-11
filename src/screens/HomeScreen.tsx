import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, PermissionsAndroid, Platform, StyleSheet, Vibration, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import Animated, { 
  useSharedValue, useAnimatedProps, withTiming, withRepeat, withSequence, useAnimatedStyle, cancelAnimation
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { initDatabase, updateOrSaveMeasurement } from '../services/database';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const HomeScreen = () => {
  useEffect(() => { initDatabase(); }, []);

  const insets = useSafeAreaInsets();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [dbLevel, setDbLevel] = useState(0);
  const [sensitivity, setSensitivity] = useState(2.5);
  const [alarmThreshold, setAlarmThreshold] = useState(85);
  const MEDICAL_THRESHOLD = 85;
  
  const [isAlertActive, setIsAlertActive] = useState(false);
  const [isThresholdExceeded, setIsThresholdExceeded] = useState(false);

  const isAlertActiveRef = useRef(false);
  const thresholdCounter = useRef(0);
  const violationCounter = useRef(0);
  const movingAverageBuffer = useRef<number[]>([]);
  const isMounted = useRef(true);
  const lastVibratedRef = useRef(0);

  const BUFFER_SIZE = 10; 
  const MAX_DB_DISPLAY = 120; 

  const progress = useSharedValue(0);
  const scale = useSharedValue(1); 
  const recordingRef = useRef<Audio.Recording | null>(null);

  const loadSettings = async () => {
    const savedSens = await AsyncStorage.getItem('sensitivity');
    const savedThresh = await AsyncStorage.getItem('alarmThreshold');
    if (savedSens) setSensitivity(parseFloat(savedSens));
    if (savedThresh) setAlarmThreshold(parseInt(savedThresh));
  };

  useFocusEffect(useCallback(() => { 
    isMounted.current = true;
    loadSettings();
    return () => { isMounted.current = false; };
  }, []));

const handleAlarmTrigger = async (finalDb: number) => {
  try {
    let locationString = 'MainRoom';
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const [address] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (address) locationString = `${address.street || 'Nieznana ul.'}, ${address.city || ''}`;
    }
    // Wywołujemy bez timestampu, funkcja wygeneruje go w odpowiednim formacie
    updateOrSaveMeasurement(finalDb, locationString);
  } catch (e) { console.log("Błąd zapisu:", e); }
};

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: (Math.PI * 100) - Math.min(progress.value, 1) * (Math.PI * 100),
  }));

  const getThresholdIndicatorAngle = () => {
    const percentage = alarmThreshold / MAX_DB_DISPLAY;
    return 180 - (percentage * 180);
  };
  const angle = getThresholdIndicatorAngle() * (Math.PI / 180);

  const animatedButtonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const getDynamicColor = () => isAlertActive ? '#C62828' : isThresholdExceeded ? '#FBC02D' : '#2E7D32';

  const startRecording = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: newRecording } = await Audio.Recording.createAsync(
        { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true },
        (status) => {
          if (!status.isRecording || !isMounted.current) return;
          if (typeof status.metering === 'number') {
            const currentDb = Math.round(Math.max(20, 100 + status.metering + sensitivity));
            movingAverageBuffer.current.push(currentDb);
            if (movingAverageBuffer.current.length > BUFFER_SIZE) movingAverageBuffer.current.shift();
            const averageDb = Math.round(movingAverageBuffer.current.reduce((a, b) => a + b, 0) / movingAverageBuffer.current.length);
            
            setDbLevel(averageDb);
            progress.value = withTiming(averageDb / MAX_DB_DISPLAY, { duration: 300 });
            
            if (averageDb >= alarmThreshold) {
              setIsThresholdExceeded(true);
              thresholdCounter.current += 1;
              // Zapis/Aktualizacja bazy co 1 sekundę (10 cykli x 100ms)
              if (thresholdCounter.current % 10 === 0) {
                handleAlarmTrigger(averageDb);
                if (Date.now() - lastVibratedRef.current > 2000) {
                  Vibration.vibrate(300);
                  lastVibratedRef.current = Date.now();
                }
              }
            } else {
              setIsThresholdExceeded(false);
              thresholdCounter.current = 0;
            }

            if (averageDb >= MEDICAL_THRESHOLD) {
              violationCounter.current += 1;
              if (violationCounter.current >= 30 && !isAlertActiveRef.current) {
                isAlertActiveRef.current = true;
                setIsAlertActive(true);
                scale.value = withRepeat(withSequence(withTiming(1.05, { duration: 500 }), withTiming(1, { duration: 500 })), -1);
              }
            } else {
              violationCounter.current = 0;
              if (isAlertActiveRef.current) {
                isAlertActiveRef.current = false;
                setIsAlertActive(false);
                cancelAnimation(scale);
                scale.value = withTiming(1, { duration: 300 });
              }
            }
          }
        }, 100
      );
      recordingRef.current = newRecording;
      setIsMonitoring(true);
    } catch (e) { setIsMonitoring(false); }
  };

  const stopRecording = async () => {
    setIsMonitoring(false);
    if (recordingRef.current) await recordingRef.current.stopAndUnloadAsync();
    setIsAlertActive(false);
    setIsThresholdExceeded(false);
    thresholdCounter.current = 0;
    violationCounter.current = 0;
    cancelAnimation(scale);
    scale.value = 1;
    progress.value = withTiming(0);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
      </View>
      <View style={styles.chartContainer}>
        <Svg width={260} height={160} viewBox="0 0 240 140">
          <Path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="#E8DEF8" strokeWidth={24} strokeLinecap="round" />
          <AnimatedPath d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke={getDynamicColor()} strokeWidth={24} strokeLinecap="round" strokeDasharray={Math.PI * 100} animatedProps={animatedProps} />
          <Path d={`M ${120 + 100 * Math.cos(angle)} ${130 - 100 * Math.sin(angle)} L ${120 + 125 * Math.cos(angle)} ${130 - 125 * Math.sin(angle)}`} stroke="#FF9800" strokeWidth={5} strokeLinecap="round" />
        </Svg>
        <View style={styles.readout}>
          <Text style={styles.dbValue}>{isMonitoring ? dbLevel : '--'}</Text>
          <Text style={styles.unit}>dB</Text>
        </View>
      </View>
      <View style={styles.statusContainer}>
        <Text style={[styles.statusText, isAlertActive ? styles.alertText : (isThresholdExceeded ? styles.warningText : {})]}>
          {!isMonitoring ? "Gotowy do pomiaru" : isAlertActive ? "RYZYKO USZKODZENIA SŁUCHU!" : (isThresholdExceeded ? "Przekroczono próg użytkownika" : "Monitorowanie w toku")}
        </Text>
      </View>
      <Animated.View style={[{ width: '100%' }, animatedButtonStyle]}>
        <TouchableOpacity onPress={isMonitoring ? stopRecording : startRecording} style={[styles.button, styles.buttonNeutral]}>
          <Text style={styles.buttonText}>{isMonitoring ? 'Zatrzymaj pomiar' : 'Rozpocznij pomiar'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 24, justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20 },
  header: { alignItems: 'center', marginTop: 20 },
  logo: { width: 100, height: 100 },
  chartContainer: { alignItems: 'center', justifyContent: 'center' },
  readout: { position: 'absolute', bottom: 16, alignItems: 'center' },
  dbValue: { fontSize: 48, fontWeight: '900', color: '#1D1B20' },
  unit: { fontSize: 14, fontWeight: 'bold', color: '#49454F', marginTop: 4 },
  statusContainer: { marginVertical: 10, paddingHorizontal: 20 },
  statusText: { fontSize: 14, color: '#49454F', fontWeight: '600', textAlign: 'center' },
  alertText: { color: '#C62828', fontWeight: '800' },
  warningText: { color: '#FBC02D', fontWeight: '800' },
  button: { width: '100%', paddingVertical: 16, borderRadius: 999, alignItems: 'center', elevation: 3, marginBottom: 35 },
  buttonNeutral: { backgroundColor: '#4A0072' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
});