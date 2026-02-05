import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useFrameProcessor
} from 'react-native-vision-camera';
import { useFaceDetector, Face } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';
import {
    Canvas,
    Rect,
    Group,
    Circle,
    Skia,
    RuntimeShader,
} from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Shaders
const smoothingShaderSrc = `
uniform shader image;
uniform float2 resolution;
uniform float smoothingAmount;
vec4 main(vec2 pos) {
  vec4 color = image.eval(pos);
  vec2 offset = vec2(1.0 / resolution.x, 1.0 / resolution.y);
  vec4 sum = color * 0.4;
  sum += image.eval(pos + vec2(offset.x, 0)) * 0.15;
  sum += image.eval(pos - vec2(offset.x, 0)) * 0.15;
  sum += image.eval(pos + vec2(0, offset.y)) * 0.15;
  sum += image.eval(pos - vec2(0, offset.y)) * 0.15;
  return mix(color, sum, smoothingAmount);
}
`;

const distortionShaderSrc = `
uniform shader image;
uniform float2 center;
uniform float radius;
uniform float strength;
vec4 main(vec2 pos) {
  vec2 dir = pos - center;
  float dist = length(dir);
  if (dist < radius) {
    float normDist = dist / radius;
    float warp = pow(normDist, 1.0 / strength); 
    vec2 warpedPos = center + dir * (warp / normDist);
    return image.eval(warpedPos);
  }
  return image.eval(pos);
}
`;

const smoothingEffect = Skia.RuntimeEffect.Make(smoothingShaderSrc);
const distortionEffect = Skia.RuntimeEffect.Make(distortionShaderSrc);

export const CameraView = () => {
    const device = useCameraDevice('front');
    const { hasPermission, requestPermission } = useCameraPermission();
    const faceDetector = useFaceDetector({
        performanceMode: 'fast',
        landmarkMode: 'all',
        classificationMode: 'all',
    });

    const [faces, setFaces] = useState<Face[]>([]);
    const [activeFilter, setActiveFilter] = useState<'none' | 'beauty' | 'animal' | 'distortion'>('animal');

    const updateFaces = Worklets.createRunOnJS((detectedFaces: Face[]) => {
        setFaces(detectedFaces);
    });

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        const detectedFaces = faceDetector.detectFaces(frame);
        updateFaces(detectedFaces);
    }, [faceDetector]);

    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission]);

    // Uniform calculation for distortion
    const distortionUniforms = useMemo(() => {
        if (faces.length > 0 && activeFilter === 'distortion') {
            const face = faces[0];
            const frameWidth = 720;
            const frameHeight = 1280;

            const centerX = (face.bounds.x + face.bounds.width / 2) / frameWidth * SCREEN_WIDTH;
            const centerY = (face.bounds.y + face.bounds.height * 0.7) / frameHeight * SCREEN_HEIGHT;

            return {
                center: [centerX, centerY],
                radius: (face.bounds.width / frameWidth) * SCREEN_WIDTH * 0.4,
                strength: 1.8
            };
        }
        return null;
    }, [faces, activeFilter]);

    if (!hasPermission) return <View style={styles.container}><Text style={{ color: 'white' }}>No Camera Permission</Text></View>;
    if (!device) return <View style={styles.container}><Text style={{ color: 'white' }}>No Camera Device</Text></View>;

    return (
        <View style={styles.container}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                frameProcessor={frameProcessor}
                pixelFormat="yuv"
            />

            <Canvas style={styles.overlay}>
                {/* Underlays/Background Effects */}
                {activeFilter === 'beauty' && smoothingEffect && (
                    <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                        <RuntimeShader
                            source={smoothingEffect}
                            uniforms={{ resolution: [SCREEN_WIDTH, SCREEN_HEIGHT], smoothingAmount: 0.8 }}
                        />
                    </Rect>
                )}

                {faces.map((face, index) => {
                    const frameWidth = 720;
                    const frameHeight = 1280;

                    const scaledX = (face.bounds.x / frameWidth) * SCREEN_WIDTH;
                    const scaledY = (face.bounds.y / frameHeight) * SCREEN_HEIGHT;
                    const scaledWidth = (face.bounds.width / frameWidth) * SCREEN_WIDTH;
                    const scaledHeight = (face.bounds.height / frameHeight) * SCREEN_HEIGHT;

                    return (
                        <Group key={index}>
                            {activeFilter === 'animal' && (
                                <Group>
                                    <Circle cx={scaledX + scaledWidth * 0.25} cy={scaledY - 20} r={scaledWidth * 0.25} color="#FFC0CB" />
                                    <Circle cx={scaledX + scaledWidth * 0.75} cy={scaledY - 20} r={scaledWidth * 0.25} color="#FFC0CB" />
                                    <Circle cx={scaledX + scaledWidth * 0.5} cy={scaledY + scaledHeight * 0.6} r={scaledWidth * 0.12} color="#333" />
                                </Group>
                            )}
                        </Group>
                    );
                })}

                {activeFilter === 'distortion' && distortionEffect && distortionUniforms && (
                    <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                        <RuntimeShader
                            source={distortionEffect}
                            uniforms={{
                                center: distortionUniforms.center,
                                radius: distortionUniforms.radius,
                                strength: distortionUniforms.strength
                            }}
                        />
                    </Rect>
                )}
            </Canvas>

            <View style={styles.uiOverlay}>
                <Text style={styles.title}>TikTok Filters</Text>
                <View style={styles.filterRow}>
                    {['none', 'beauty', 'animal', 'distortion'].map((f) => (
                        <Text
                            key={f}
                            style={[styles.filterBtn, activeFilter === f && styles.activeBtn]}
                            onPress={() => setActiveFilter(f as any)}
                        >
                            {f.toUpperCase()}
                        </Text>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    uiOverlay: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 10,
    },
    filterRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 30,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    filterBtn: {
        color: 'white',
        paddingHorizontal: 15,
        paddingVertical: 8,
        fontSize: 11,
        fontWeight: '700',
    },
    activeBtn: {
        color: '#00ccff',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
    },
});
