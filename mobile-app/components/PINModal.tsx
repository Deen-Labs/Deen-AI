import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Vibration,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PINModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  title?: string;
  subtitle?: string;
  mode?: 'verify' | 'set' | 'confirm';
  error?: string | null;
}

export default function PINModal({
  visible,
  onClose,
  onSubmit,
  title = 'Enter PIN',
  subtitle = 'Enter your 4-digit PIN to continue',
  mode = 'verify',
  error = null,
}: PINModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter');
  const [localError, setLocalError] = useState<string | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setPhase('enter');
      setLocalError(null);
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => {
    if (error) {
      setLocalError(error);
      triggerShake();
    }
  }, [error]);

  const triggerShake = () => {
    Vibration.vibrate(100);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleKeyPress = (key: string) => {
    setLocalError(null);

    if (key === 'delete') {
      if (phase === 'confirm') {
        setConfirmPin(prev => prev.slice(0, -1));
      } else {
        setPin(prev => prev.slice(0, -1));
      }
      return;
    }

    if (key === 'submit') {
      if (mode === 'set') {
        if (phase === 'enter') {
          if (pin.length < 4) {
            setLocalError('PIN must be exactly 4 digits');
            triggerShake();
            return;
          }
          setPhase('confirm');
          return;
        } else {
          if (confirmPin !== pin) {
            setLocalError('PINs do not match. Try again.');
            setConfirmPin('');
            triggerShake();
            return;
          }
          onSubmit(pin);
        }
      } else {
        if (pin.length < 4) {
          setLocalError('PIN must be exactly 4 digits');
          triggerShake();
          return;
        }
        onSubmit(pin);
      }
      return;
    }

    // Digit key
    if (phase === 'confirm') {
      if (confirmPin.length < 4) {
        setConfirmPin(prev => prev + key);
      }
    } else {
      if (pin.length < 4) {
        setPin(prev => prev + key);
      }
    }
  };

  const currentPin = phase === 'confirm' ? confirmPin : pin;
  const currentTitle = mode === 'set'
    ? (phase === 'enter' ? '🔐 Set New PIN' : '🔐 Confirm PIN')
    : title;
  const currentSubtitle = mode === 'set'
    ? (phase === 'enter'
      ? 'Choose a 4-digit PIN. Give this to a friend or family member.'
      : 'Re-enter your PIN to confirm')
    : subtitle;

  const displayError = localError || error;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              transform: [
                { translateX: shakeAnim },
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{currentTitle}</Text>
            <Text style={styles.subtitle}>{currentSubtitle}</Text>
          </View>

          {/* PIN Dots */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3].map(i => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < currentPin.length && styles.dotFilled,
                ]}
              />
            ))}
          </View>

          {/* Error */}
          {displayError && (
            <Text style={styles.errorText}>{displayError}</Text>
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'].map(
              (key, index) => {
                if (key === '') {
                  return <View key={index} style={styles.keyEmpty} />;
                }
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.key,
                      key === 'delete' && styles.keyDelete,
                    ]}
                    onPress={() => handleKeyPress(key)}
                    activeOpacity={0.6}
                  >
                    <Text
                      style={[
                        styles.keyText,
                        key === 'delete' && styles.keyDeleteText,
                      ]}
                    >
                      {key === 'delete' ? '⌫' : key}
                    </Text>
                  </TouchableOpacity>
                );
              }
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => handleKeyPress('submit')}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {mode === 'set' && phase === 'enter' ? 'Next' : 'Confirm'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0b2527',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(226, 162, 59, 0.2)',
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f3f7f6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#94a4a2',
    textAlign: 'center',
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#e2a23b',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#e2a23b',
  },
  dotOptional: {
    borderColor: 'rgba(226, 162, 59, 0.3)',
  },
  errorText: {
    fontSize: 13,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 12,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
    marginBottom: 16,
  },
  key: {
    width: 70,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
    borderRadius: 12,
    backgroundColor: '#0c3033',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  keyDelete: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  keyEmpty: {
    width: 70,
    height: 56,
    margin: 6,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f3f7f6',
  },
  keyDeleteText: {
    fontSize: 22,
    color: '#ff6b6b',
  },
  actions: {
    width: '100%',
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#e2a23b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1718',
  },
  cancelButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a4a2',
  },
});
