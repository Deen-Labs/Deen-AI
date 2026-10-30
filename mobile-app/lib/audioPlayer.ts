/**
 * DEEN AI - High-Performance Audio Playback Engine
 * Powered by expo-audio (Expo SDK 57 native architecture)
 * Fallback to HTML5 Audio and Linking.openURL
 */

import { Platform, Linking } from 'react-native';

export interface AudioPlaybackStatus {
  isPlaying: boolean;
  isBuffering: boolean;
  didJustFinish: boolean;
  currentTime?: number;
  duration?: number;
  error?: string;
}

export type PlaybackStatusListener = (status: AudioPlaybackStatus) => void;

class DeenAudioPlayerService {
  private activeExpoAudioPlayer: any = null;
  private activeWebAudio: any = null;
  private currentUrl: string | null = null;
  private statusListener: PlaybackStatusListener | null = null;
  private isConfigured: boolean = false;

  /**
   * Configure global audio subsystem to route through loudspeaker at 100% volume
   * and play through silent mode switch.
   */
  async configureAudioMode(): Promise<void> {
    if (this.isConfigured) return;

    try {
      const { setAudioModeAsync } = require('expo-audio');
      if (setAudioModeAsync) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
        this.isConfigured = true;
        console.log('[DeenAudio] expo-audio audio mode configured.');
      }
    } catch (e) {
      console.warn('[DeenAudio] expo-audio audio mode configuration failed:', e);
    }
  }

  /**
   * Stop any active audio and free native resources
   */
  async stop(): Promise<void> {
    // Stop expo-audio
    if (this.activeExpoAudioPlayer) {
      try {
        this.activeExpoAudioPlayer.pause();
        if (typeof this.activeExpoAudioPlayer.remove === 'function') {
          this.activeExpoAudioPlayer.remove();
        }
      } catch (e) {
        console.warn('[DeenAudio] Error cleaning expo-audio player:', e);
      }
      this.activeExpoAudioPlayer = null;
    }

    // Stop web
    if (this.activeWebAudio) {
      try {
        this.activeWebAudio.pause();
        this.activeWebAudio.src = '';
      } catch (e) {}
      this.activeWebAudio = null;
    }

    this.currentUrl = null;
    if (this.statusListener) {
      this.statusListener({
        isPlaying: false,
        isBuffering: false,
        didJustFinish: false,
      });
    }
  }

  /**
   * Play an audio URL (e.g. Surah or Asma-ul-Husna MP3 stream)
   */
  async play(url: string, listener?: PlaybackStatusListener): Promise<boolean> {
    // If already playing this exact track, stop it (toggle behavior)
    if (this.currentUrl === url) {
      await this.stop();
      return false;
    }

    // Stop any existing playback first
    await this.stop();

    this.currentUrl = url;
    this.statusListener = listener || null;

    // Notify listener that buffering has begun
    if (this.statusListener) {
      this.statusListener({
        isPlaying: false,
        isBuffering: true,
        didJustFinish: false,
      });
    }

    await this.configureAudioMode();

    // 1. Web Playback
    if (Platform.OS === 'web' && typeof (window as any).Audio !== 'undefined') {
      try {
        const audio = new (window as any).Audio(url);
        audio.volume = 1.0;
        this.activeWebAudio = audio;

        audio.onplaying = () => {
          if (this.statusListener) {
            this.statusListener({ isPlaying: true, isBuffering: false, didJustFinish: false });
          }
        };

        audio.onended = () => {
          this.activeWebAudio = null;
          this.currentUrl = null;
          if (this.statusListener) {
            this.statusListener({ isPlaying: false, isBuffering: false, didJustFinish: true });
          }
        };

        audio.onerror = () => {
          this.activeWebAudio = null;
          this.currentUrl = null;
          if (this.statusListener) {
            this.statusListener({ isPlaying: false, isBuffering: false, didJustFinish: false, error: 'Web playback failed' });
          }
        };

        await audio.play();
        return true;
      } catch (e) {
        console.warn('[DeenAudio] Web audio failed, falling through:', e);
      }
    }

    // 2. Primary Mobile: expo-audio (SDK 57 native module)
    try {
      const { createAudioPlayer } = require('expo-audio');
      if (createAudioPlayer) {
        const player = createAudioPlayer(url);
        player.volume = 1.0;
        this.activeExpoAudioPlayer = player;

        player.addListener('playbackStatusUpdate', (status: any) => {
          if (!this.statusListener) return;

          if (status.didJustFinish) {
            this.activeExpoAudioPlayer = null;
            this.currentUrl = null;
            this.statusListener({
              isPlaying: false,
              isBuffering: false,
              didJustFinish: true,
            });
            player.remove();
          } else {
            this.statusListener({
              isPlaying: Boolean(status.playing),
              isBuffering: Boolean(status.isBuffering),
              didJustFinish: false,
              currentTime: status.currentTime,
              duration: status.duration,
            });
          }
        });

        player.play();
        console.log('[DeenAudio] Playing via expo-audio:', url);
        return true;
      }
    } catch (err) {
      console.warn('[DeenAudio] expo-audio player error, attempting fallback:', err);
    }

    // 3. Final Fallback: External browser or audio handler
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        if (this.statusListener) {
          this.statusListener({
            isPlaying: true,
            isBuffering: false,
            didJustFinish: false,
          });
        }
        return true;
      }
    } catch (linkErr) {
      console.warn('[DeenAudio] Linking fallback failed:', linkErr);
    }

    // If all audio engines failed
    if (this.statusListener) {
      this.statusListener({
        isPlaying: false,
        isBuffering: false,
        didJustFinish: false,
        error: 'Unable to stream audio',
      });
    }
    this.currentUrl = null;
    return false;
  }

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }
}

export const audioPlayer = new DeenAudioPlayerService();

/**
 * Returns primary and fallback URLs for a given Surah number (1-114)
 * Primary: High-speed Cloudflare CDN (Mishary Rashid Alafasy)
 * Fallback: QuranicAudio CDN
 */
export function getSurahAudioUrls(surahNumber: number): { primary: string; fallback: string } {
  const surahStr = surahNumber.toString().padStart(3, '0');
  return {
    primary: `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${surahNumber}.mp3`,
    fallback: `https://download.quranicaudio.com/quran/mishaari_raashid_al_3afaasee/${surahStr}.mp3`,
  };
}
