import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const CameraView = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                📷 Face Filters are only available on Android/iOS native devices.{"\n\n"}
                Please use a Development Build or scan the QR code with a physical device in the Expo app.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    text: {
        color: 'white',
        textAlign: 'center',
        fontSize: 16,
        lineHeight: 24,
    },
});
