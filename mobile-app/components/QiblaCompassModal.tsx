import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { getCurrentLocation, Coordinates } from '../lib/location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Holy Kaaba Coordinates (Makkah Al-Mukarramah)
const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

export interface QiblaInfo {
  bearing: number;        // Degrees 0-360 clockwise from True North
  cardinal: string;       // e.g. "WNW"
  distanceKm: number;     // Distance to Kaaba in km
  userCoords: Coordinates;
}

/**
 * Computes exact Great Circle forward azimuth (bearing) from user to the Kaaba.
 */
export function calculateQibla(userLat: number, userLng: number): QiblaInfo {
  const phi1 = (userLat * Math.PI) / 180;
  const phi2 = (KAABA_LAT * Math.PI) / 180;
  const deltaLambda = ((KAABA_LNG - userLng) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  // Haversine distance
  const R = 6371; // Earth radius in km
  const dPhi = ((KAABA_LAT - userLat) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c);

  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(bearing / 22.5) % 16;
  const cardinal = directions[index];

  return {
    bearing: Math.round(bearing),
    cardinal,
    distanceKm,
    userCoords: { latitude: userLat, longitude: userLng },
  };
}

interface QiblaCompassModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function QiblaCompassModal({ visible, onClose }: QiblaCompassModalProps) {
  const [qibla, setQibla] = useState<QiblaInfo>({
    bearing: 292,
    cardinal: 'WNW',
    distanceKm: 4240,
    userCoords: { latitude: 17.385044, longitude: 78.486671 }, // Hyderabad default
  });
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [sensorAvailable, setSensorAvailable] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);

  // Native animated value for silky-smooth 60fps/120fps rotation
  const animatedHeading = useRef(new Animated.Value(0)).current;
  const currentAngleRef = useRef<number>(0);
  const lastUiUpdateRef = useRef<number>(0);

  useEffect(() => {
    let headingSub: Location.LocationSubscription | null = null;
    let isMounted = true;

    if (visible) {
      loadLocationAndQibla();

      const startSensorWatch = async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            headingSub = await Location.watchHeadingAsync((headingData) => {
              if (!isMounted) return;
              const h = headingData.trueHeading >= 0 ? headingData.trueHeading : headingData.magHeading;
              if (typeof h === 'number' && !isNaN(h)) {
                setSensorAvailable(true);

                // Unwrapped continuous angle to prevent 360-degree spin flips
                const normHeading = ((h % 360) + 360) % 360;
                const current = currentAngleRef.current;
                const currentNorm = ((current % 360) + 360) % 360;

                let diff = normHeading - currentNorm;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;

                const targetAngle = current + diff;
                currentAngleRef.current = targetAngle;

                // Native UI thread spring for fluid, responsive compass movement
                Animated.spring(animatedHeading, {
                  toValue: targetAngle,
                  stiffness: 140,
                  damping: 18,
                  mass: 0.6,
                  overshootClamping: false,
                  useNativeDriver: Platform.OS !== 'web',
                }).start();

                // Throttle React state updates to keep JS thread free and eliminate lag
                const now = Date.now();
                if (now - lastUiUpdateRef.current > 120) {
                  lastUiUpdateRef.current = now;
                  setCompassHeading(Math.round(normHeading));
                }
              }
            });
          } else {
            if (isMounted) setSensorAvailable(false);
          }
        } catch (err) {
          console.warn('[QiblaCompass] Sensor heading error:', err);
          if (isMounted) setSensorAvailable(false);
        }
      };

      startSensorWatch();
    } else {
      setCompassHeading(null);
    }

    return () => {
      isMounted = false;
      if (headingSub) {
        headingSub.remove();
      }
    };
  }, [visible]);

  const loadLocationAndQibla = async () => {
    try {
      setLoading(true);
      const location = await getCurrentLocation();
      const lat = location?.latitude ?? 17.385044;
      const lng = location?.longitude ?? 78.486671;
      const computed = calculateQibla(lat, lng);
      setQibla(computed);
    } catch (err) {
      console.warn('[QiblaCompass] Location fetch failed, using fallback coordinates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Interpolate native animated heading to needle and north rotations
  const northRotate = animatedHeading.interpolate({
    inputRange: [-3600, 3600],
    outputRange: ['3600deg', '-3600deg'],
  });

  const needleRotate = animatedHeading.interpolate({
    inputRange: [-3600, 3600],
    outputRange: [`${qibla.bearing + 3600}deg`, `${qibla.bearing - 3600}deg`],
  });

  // Check if device is aligned with Qibla (within +/- 6 degrees)
  const angleDiff =
    compassHeading !== null
      ? (qibla.bearing - compassHeading + 360) % 360
      : null;

  const isFacingQibla =
    angleDiff !== null && (angleDiff <= 6 || angleDiff >= 354);

  // Directional guidance text
  const getGuidanceText = () => {
    if (compassHeading === null) {
      return sensorAvailable
        ? "Calibrating compass... Hold phone flat"
        : "Static bearing (sensors unavailable)";
    }
    if (isFacingQibla) {
      return "Aligned with the Kaaba";
    }
    if (angleDiff !== null) {
      if (angleDiff <= 180) {
        return `Turn ${Math.round(angleDiff)}° right to face Kaaba`;
      } else {
        return `Turn ${Math.round(360 - angleDiff)}° left to face Kaaba`;
      }
    }
    return `Heading: ${compassHeading}° • Rotate toward ${qibla.bearing}°`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={[styles.iconCircle, isFacingQibla && styles.iconCircleAligned]}>
                <Feather name="compass" size={20} color={isFacingQibla ? "#00ff66" : "#e2a23b"} />
              </View>
              <View>
                <Text style={styles.title}>Qibla Direction</Text>
                <Text style={styles.subtitle}>Al-Masjid al-Haram, Makkah</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={20} color="#94a4a2" />
            </TouchableOpacity>
          </View>

          {/* Compass Dial Display */}
          <View style={styles.compassWrapper}>
            {/* Outer Reference Dial with Alignment Target Gate at 12 o'clock */}
            <View
              style={[
                styles.outerRing,
                isFacingQibla && styles.outerRingAligned,
              ]}
            >
              {/* Target Gate at 12 o'clock (phone's forward orientation) */}
              <View style={[styles.targetGate, isFacingQibla && styles.targetGateAligned]}>
                <View style={[styles.targetNotch, isFacingQibla && styles.targetNotchAligned]} />
                <Text style={[styles.targetGateLabel, isFacingQibla && styles.targetGateLabelAligned]}>
                  QIBLA
                </Text>
              </View>

              {/* Quadrant reference offsets */}
              <Text style={[styles.refLabel, styles.refRight]}>+90°</Text>
              <Text style={[styles.refLabel, styles.refBottom]}>180°</Text>
              <Text style={[styles.refLabel, styles.refLeft]}>-90°</Text>
            </View>

            {/* True North Indicator (orbits dial perimeter to show Earth's physical North) */}
            <Animated.View
              style={[
                styles.northPivot,
                { transform: [{ rotate: northRotate }] },
              ]}
              pointerEvents="none"
            >
              <View style={styles.northMarker}>
                <Text style={styles.northMarkerText}>N</Text>
              </View>
            </Animated.View>

            {/* Dynamic Qibla Pointer Needle (sweeps smoothly to direct user toward Kaaba) */}
            <Animated.View
              style={[
                styles.needlePivot,
                { transform: [{ rotate: needleRotate }] },
              ]}
              pointerEvents="none"
            >
              {/* Arrowhead pointing towards Kaaba */}
              <View style={[styles.arrowHeadContainer, isFacingQibla && styles.arrowHeadContainerAligned]}>
                <View style={[styles.arrowTriangle, isFacingQibla && styles.arrowTriangleAligned]} />
              </View>
              {/* Needle shaft */}
              <View style={[styles.needleShaft, isFacingQibla && styles.needleShaftAligned]} />
              {/* Counter-weight tail */}
              <View style={styles.needleTail} />
            </Animated.View>

            {/* Center Hub displaying Qibla bearing coordinates */}
            <View style={[styles.centerHub, isFacingQibla && styles.centerHubAligned]}>
              <Text style={[styles.bearingText, isFacingQibla && styles.bearingTextAligned]}>
                {qibla.bearing}°
              </Text>
              <Text style={styles.cardinalText}>{qibla.cardinal}</Text>
            </View>
          </View>

          {/* Live Sensor Alignment Badge */}
          <View style={[styles.alignmentBadge, isFacingQibla ? styles.alignmentBadgeActive : styles.alignmentBadgeInactive]}>
            <Feather
              name={isFacingQibla ? "check-circle" : (compassHeading !== null ? "compass" : "alert-circle")}
              size={14}
              color={isFacingQibla ? "#00ff66" : "#e2a23b"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.alignmentBadgeText, isFacingQibla && styles.alignmentBadgeTextActive]}>
              {getGuidanceText()}
            </Text>
          </View>

          {/* Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>QIBLA BEARING</Text>
                <Text style={styles.detailValue}>
                  {qibla.bearing}° {qibla.cardinal}
                </Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>DISTANCE</Text>
                <Text style={styles.detailValue}>
                  {qibla.distanceKm.toLocaleString()} km
                </Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>DEVICE</Text>
                <Text style={styles.detailValue}>
                  {compassHeading !== null ? `${compassHeading}°` : 'Flat'}
                </Text>
              </View>
            </View>

            <Text style={styles.explanationText}>
              Turn your device until the green needle points straight up into the Qibla target. The dial will highlight emerald when facing the Kaaba.
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0a1d1e',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.25)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 255, 102, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  subtitle: {
    fontSize: 12,
    color: '#94a4a2',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  compassWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    alignSelf: 'center',
    position: 'relative',
  },
  outerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 102, 0.25)',
    backgroundColor: '#061617',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerRingAligned: {
    borderColor: '#00ff66',
    shadowColor: '#00ff66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 14,
    elevation: 10,
  },
  targetGate: {
    position: 'absolute',
    top: -1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#0a1f20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.3)',
  },
  targetGateAligned: {
    backgroundColor: 'rgba(0, 255, 102, 0.2)',
    borderColor: '#00ff66',
  },
  targetNotch: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#658081',
    marginBottom: 1,
  },
  targetNotchAligned: {
    borderTopColor: '#00ff66',
  },
  targetGateLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#658081',
    letterSpacing: 0.5,
  },
  targetGateLabelAligned: {
    color: '#00ff66',
  },
  refLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: '#3d5253',
  },
  refRight: {
    right: 10,
    top: 103,
  },
  refBottom: {
    bottom: 8,
  },
  refLeft: {
    left: 10,
    top: 103,
  },

  northPivot: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  northMarker: {
    top: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(226, 162, 59, 0.2)',
    borderWidth: 1,
    borderColor: '#e2a23b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  northMarkerText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#e2a23b',
  },

  needlePivot: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowHeadContainer: {
    position: 'absolute',
    top: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowHeadContainerAligned: {
    shadowColor: '#00ff66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  arrowTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 9,
    borderRightWidth: 9,
    borderBottomWidth: 17,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00ff66',
  },
  arrowTriangleAligned: {
    borderBottomColor: '#00ff66',
  },
  needleShaft: {
    position: 'absolute',
    top: 41,
    width: 4,
    height: 34,
    backgroundColor: '#00ff66',
    borderRadius: 2,
  },
  needleShaftAligned: {
    backgroundColor: '#00ff66',
    width: 5,
  },
  needleTail: {
    position: 'absolute',
    top: 144,
    width: 3,
    height: 22,
    backgroundColor: 'rgba(75, 100, 101, 0.7)',
    borderRadius: 2,
  },

  centerHub: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0d2527',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 102, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerHubAligned: {
    borderColor: '#00ff66',
    shadowColor: '#00ff66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  bearingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00ff66',
  },
  bearingTextAligned: {
    color: '#00ff66',
  },
  cardinalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e2a23b',
    marginTop: 1,
  },

  detailsCard: {
    backgroundColor: '#0d2527',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#658081',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f3f7f6',
  },
  detailDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  explanationText: {
    fontSize: 11,
    color: '#94a4a2',
    lineHeight: 16,
    textAlign: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },

  actionButton: {
    backgroundColor: '#00ff66',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#0b1b1c',
    fontSize: 15,
    fontWeight: '700',
  },
  iconCircleAligned: {
    backgroundColor: 'rgba(0, 255, 102, 0.25)',
  },
  alignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'center',
  },
  alignmentBadgeActive: {
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.4)',
  },
  alignmentBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  alignmentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a4a2',
  },
  alignmentBadgeTextActive: {
    color: '#00ff66',
    fontWeight: '700',
  },
});
