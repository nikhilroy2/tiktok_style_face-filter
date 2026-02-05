import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// We use dynamic require for CameraView to prevent the top-level VisionCamera 
// import from crashing when running inside Expo Go.
const getCameraView = () => {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo || Platform.OS === 'web') {
    return null;
  }
  return require('./src/components/CameraView').CameraView;
};

const CameraView = getCameraView();

export default function App() {
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {CameraView ? (
          <CameraView />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.errorText}>
              🚫 <Text style={{ fontWeight: 'bold' }}>{Platform.OS === 'web' ? 'Web' : 'Expo Go'} is not supported</Text>{"\n\n"}
              TikTok face filters require native AR engines (Vision Camera & Skia) that are not available in {Platform.OS === 'web' ? 'the browser' : 'the standard Expo Go app'}.{"\n\n"}
              Please run:{"\n"}
              <Text style={styles.code}>npx expo run:android</Text>{"\n"}
              to build and run the app on your phone.
            </Text>
          </View>
        )}
        <StatusBar style="light" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#00ccff',
    paddingHorizontal: 4,
    marginTop: 10,
  },
});
