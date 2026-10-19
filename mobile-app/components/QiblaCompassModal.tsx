import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
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
                setCompassHeading(Math.round(h));
                setSensorAvailable(true);
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

  // Outer ring rotation (N points to real physical North)
  const dialRotation = compassHeading !== null ? -compassHeading : 0;

  // Needle angle relative to the top of the device screen pointing toward Kaaba
  const needleRotation =
    compassHeading !== null
      ? (qibla.bearing - compassHeading + 360) % 360
      : qibla.bearing;

  // Check if device is aligned with Qibla (within +/- 6 degrees)
  const isFacingQibla =
    compassHeading !== null &&
    (needleRotation <= 6 || needleRotation >= 354);

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
            {/* Outer Cardinal Ring that rotates with device heading */}
            <View
              style={[
                styles.outerRing,
                isFacingQibla && styles.outerRingAligned,
                { transform: [{ rotate: `${dialRotation}deg` }] },
              ]}
            >
              {/* Cardinal Markers */}
              <Text style={[styles.cardinalLabel, styles.north]}>N</Text>
              <Text style={[styles.cardinalLabel, styles.east]}>E</Text>
              <Text style={[styles.cardinalLabel, styles.south]}>S</Text>
              <Text style={[styles.cardinalLabel, styles.west]}>W</Text>
            </View>

            {/* Rotated Needle Dial pointing to Kaaba in real-time */}
            <View
              style={[
                styles.needleContainer,
                { transform: [{ rotate: `${needleRotation}deg` }] },
              ]}
              pointerEvents="none"
            >
              {/* Directional arrow tip pointing to Kaaba */}
              <View style={[styles.needleTip, isFacingQibla && styles.needleTipAligned]}>
                <Feather name="navigation" size={15} color={isFacingQibla ? "#00ff66" : "#e2a23b"} />
              </View>
              <View style={[styles.needleLine, isFacingQibla && styles.needleLineAligned]} />
              <View style={styles.needleBase} />
            </View>

            {/* Center Hub */}
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
              {isFacingQibla
                ? "Aligned with the Kaaba"
                : (compassHeading !== null
                    ? `Heading: ${compassHeading}° • Rotate toward ${qibla.bearing}°`
                    : (sensorAvailable ? "Calibrating compass... Hold phone flat" : "Static bearing (sensors unavailable)"))}
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
              Turn your device until the needle points straight up. The dial will highlight emerald when facing the Kaaba.
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
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  outerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 102, 0.3)',
    backgroundColor: '#061617',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardinalLabel: {
    position: 'absolute',
    fontSize: 13,
    fontWeight: '800',
    color: '#4b6465',
  },
  north: { top: 8, color: '#e2a23b' },
  east: { right: 12 },
  south: { bottom: 8 },
  west: { left: 10, color: '#00ff66' },

  needleContainer: {
    position: 'absolute',
    width: 40,
    height: 190,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  needleTip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 102, 0.2)',
    borderWidth: 1.5,
    borderColor: '#00ff66',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kaabaSymbol: {
    fontSize: 16,
  },
  needleLine: {
    width: 3,
    height: 60,
    backgroundColor: '#00ff66',
    borderRadius: 2,
  },
  needleBase: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4b6465',
  },

  centerHub: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#0d2527',
    borderWidth: 2,
    borderColor: '#00ff66',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bearingText: {
    fontSize: 18,
    fontWeight: '800',
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
  outerRingAligned: {
    borderColor: '#00ff66',
    shadowColor: '#00ff66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  needleTipAligned: {
    borderColor: '#00ff66',
    backgroundColor: 'rgba(0, 255, 102, 0.35)',
  },
  needleLineAligned: {
    backgroundColor: '#00ff66',
    width: 4,
  },
  centerHubAligned: {
    borderColor: '#00ff66',
    shadowColor: '#00ff66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  bearingTextAligned: {
    color: '#00ff66',
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
