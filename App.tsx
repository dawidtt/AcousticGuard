import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importy ekranów
import { HomeScreen } from './src/screens/HomeScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#F3EDF7',
          borderTopWidth: 0,
          paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 10,
          height: 64 + (insets.bottom > 0 ? insets.bottom : 10),
        },
        tabBarActiveTintColor: '#1D1B20',
        tabBarInactiveTintColor: '#49454F',
        tabBarIcon: ({ focused, color }) => {
          let iconName = 'volume-medium';
          if (route.name === 'Pomiar') iconName = focused ? 'volume-high' : 'volume-medium';
          else if (route.name === 'Historia') iconName = 'history';
          else if (route.name === 'Ustawienia') iconName = focused ? 'cog' : 'cog-outline';
          return <MaterialCommunityIcons name={iconName} size={24} color={color} />;
        },
        tabBarItemStyle: { borderRadius: 20, marginHorizontal: 10, marginVertical: 5 },
      })}
    >
      <Tab.Screen name="Pomiar" component={HomeScreen} />
      <Tab.Screen name="Historia" component={HistoryScreen} />
      <Tab.Screen name="Ustawienia" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    console.log("AsyncStorage object:", AsyncStorage);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <NavigationContainer>
        <MainTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}