import { Platform, Vibration } from 'react-native';

export const ALARM_RING_DURATION_SEC = 60; // 1 full minute of continuous ringing
export const ALARM_RING_DURATION_MS = 60 * 1000;
export const SNOOZE_REPEAT_DURATION_SEC = 180; // 3 minutes between repeating alarms
export const SNOOZE_REPEAT_DURATION_MS = 180 * 1000;

let audioPlayerInstance: any = null;
let isRinging = false;
let autoStopTimer: any = null;
let webAudioCtx: any = null;
let webAudioInterval: any = null;

type AlarmListener = (ringing: boolean) => void;
const listeners = new Set<AlarmListener>();

export function subscribeToAlarmState(listener: AlarmListener): () => void {
  listeners.add(listener);
  listener(isRinging);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(state: boolean) {
  isRinging = state;
  listeners.forEach((cb) => {
    try {
      cb(state);
    } catch {
      // safe fallback
    }
  });
}

/**
 * Configure audio mode to bypass silent mode and play through phone speakers
 */
async function configureAudioMode() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { setAudioModeAsync } = require('expo-audio');
    if (typeof setAudioModeAsync === 'function') {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
    }
  } catch (err) {
    console.warn('[SoundService] configureAudioMode fallback:', err);
  }
}

/**
 * Initialize or get expo-audio player at maximum volume
 */
function getNativeAudioPlayer() {
  if (!audioPlayerInstance) {
    try {
      configureAudioMode().catch(() => {});

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createAudioPlayer } = require('expo-audio');
      const soundAsset = require('../../assets/sounds/alarm.wav');

      audioPlayerInstance = createAudioPlayer(soundAsset);
      if (audioPlayerInstance) {
        audioPlayerInstance.volume = 1.0;
        audioPlayerInstance.loop = true;
      }
    } catch (err) {
      console.warn('[SoundService] expo-audio player init error:', err);
    }
  }
  return audioPlayerInstance;
}

/**
 * Web Audio synthesizer chime fallback for browser preview
 */
function playWebChime() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!webAudioCtx) {
      webAudioCtx = new AudioCtx();
    }
    if (webAudioCtx.state === 'suspended') {
      webAudioCtx.resume();
    }

    const tones = [880, 1174.66, 1480, 1760]; // Musical medical chime frequencies
    const now = webAudioCtx.currentTime;

    tones.forEach((freq, idx) => {
      const osc = webAudioCtx.createOscillator();
      const gain = webAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);

      osc.connect(gain);
      gain.connect(webAudioCtx.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.4);
    });
  } catch {
    // safe fallback
  }
}

/**
 * Play audible alarm sound through phone speakers and vibrate continuously for 1 full minute (60s)
 * @param onRingComplete Optional callback invoked when the 1 minute completes without manual interruption
 */
export function triggerAudibleAlarm(onRingComplete?: () => void): boolean {
  try {
    notifyListeners(true);

    // 1. Ensure maximum volume audio mode is active
    configureAudioMode().catch(() => {});

    // 2. Continuous rhythmic alarm vibration pattern with repeat throughout the 1 minute
    if (Platform.OS !== 'web') {
      // Strong continuous vibration pattern [delay, vibrate, pause, vibrate...]
      Vibration.vibrate([0, 1000, 300, 1000, 300, 1000, 300, 1000], true);
    }

    // 3. Clear any existing auto-stop timer
    if (autoStopTimer) {
      clearTimeout(autoStopTimer);
    }

    // 4. Ring continuously for 1 FULL MINUTE (60,000 ms)
    autoStopTimer = setTimeout(() => {
      stopAudibleAlarm();
      onRingComplete?.();
    }, ALARM_RING_DURATION_MS);

    // 5. Play audible alarm sound loudly via expo-audio looping
    let played = false;
    try {
      let player = getNativeAudioPlayer();
      if (!player) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createAudioPlayer } = require('expo-audio');
        const soundAsset = require('../../assets/sounds/alarm.wav');
        audioPlayerInstance = createAudioPlayer(soundAsset);
        player = audioPlayerInstance;
      }

      if (player) {
        player.volume = 1.0;
        player.loop = true;
        if (typeof player.seekTo === 'function') {
          player.seekTo(0).catch?.(() => {});
        }
        player.play();
        played = true;
      }
    } catch (err) {
      console.warn('[SoundService] player.play retry:', err);
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createAudioPlayer } = require('expo-audio');
        const soundAsset = require('../../assets/sounds/alarm.wav');
        audioPlayerInstance = createAudioPlayer(soundAsset);
        audioPlayerInstance.volume = 1.0;
        audioPlayerInstance.loop = true;
        audioPlayerInstance.play();
        played = true;
      } catch (err2) {
        console.warn('[SoundService] fallback failed:', err2);
      }
    }

    // 6. Web fallback chime loop for browser preview
    if (Platform.OS === 'web') {
      playWebChime();
      if (webAudioInterval) clearInterval(webAudioInterval);
      webAudioInterval = setInterval(playWebChime, 1200);
      played = true;
    }

    return played;
  } catch (err) {
    console.warn('[SoundService] Failed to trigger audible alarm:', err);
    Vibration.vibrate([0, 1000, 400, 1000]);
    return false;
  }
}

/**
 * Stop alarm audio and vibration immediately
 */
export function stopAudibleAlarm(): void {
  try {
    notifyListeners(false);

    // 1. Cancel vibration
    Vibration.cancel();

    // 2. Clear timers
    if (autoStopTimer) {
      clearTimeout(autoStopTimer);
      autoStopTimer = null;
    }
    if (webAudioInterval) {
      clearInterval(webAudioInterval);
      webAudioInterval = null;
    }

    // 3. Pause and reset native player
    if (audioPlayerInstance) {
      try {
        audioPlayerInstance.pause();
        if (typeof audioPlayerInstance.seekTo === 'function') {
          audioPlayerInstance.seekTo(0).catch?.(() => {});
        }
      } catch {
        // Safe fallback
      }
    }
  } catch {
    // Safe fallback
  }
}

/**
 * Check if the alarm is currently ringing
 */
export function isAlarmRinging(): boolean {
  return isRinging;
}
