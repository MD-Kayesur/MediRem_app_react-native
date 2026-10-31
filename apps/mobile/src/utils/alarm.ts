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
    console.warn('[AlarmUtil] configureAudioMode fallback:', err);
  }
}

/**
 * Initialize or get expo-audio player at maximum volume
 */
function getNativeAudioPlayer() {
  if (!audioPlayerInstance) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createAudioPlayer } = require('expo-audio');
      if (typeof createAudioPlayer === 'function') {
        audioPlayerInstance = createAudioPlayer(
          'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'
        );
        audioPlayerInstance.loop = true;
        audioPlayerInstance.volume = 1.0;
      }
    } catch (err) {
      console.warn('[AlarmUtil] native audio player error:', err);
      audioPlayerInstance = null;
    }
  }
  return audioPlayerInstance;
}

/**
 * Web audio fallback using Web Audio API synthesis
 */
function startWebTone() {
  try {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      webAudioCtx = new AudioCtx();

      const playBeep = () => {
        if (!isRinging || !webAudioCtx) return;
        const osc = webAudioCtx.createOscillator();
        const gain = webAudioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, webAudioCtx.currentTime); // High-pitched A5 alarm
        gain.gain.setValueAtTime(0.3, webAudioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, webAudioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(webAudioCtx.destination);
        osc.start();
        osc.stop(webAudioCtx.currentTime + 0.35);
      };

      playBeep();
      webAudioInterval = setInterval(playBeep, 800);
    }
  } catch {
    // Web audio fallback safe catch
  }
}

function stopWebTone() {
  if (webAudioInterval) {
    clearInterval(webAudioInterval);
    webAudioInterval = null;
  }
  if (webAudioCtx) {
    try {
      webAudioCtx.close();
    } catch {
      // ignore
    }
    webAudioCtx = null;
  }
}

/**
 * Start loud 1-minute alarm sound and continuous urgent vibration pattern
 */
export async function triggerAudibleAlarm(medicationName = 'Medication'): Promise<void> {
  if (isRinging) return;
  notifyListeners(true);

  console.log(`[AlarmUtil] 🔔 TRIGGERING LOUD ALARM for ${medicationName}`);

  // 1. Continuous loud vibration pattern: [wait 0ms, vibrate 1000ms, wait 400ms, vibrate 1000ms...]
  try {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Vibration.vibrate([0, 1000, 400, 1000, 400, 1000, 400], true);
    }
  } catch {
    // safe fallback
  }

  // 2. Play Audio at maximum volume
  if (Platform.OS === 'web') {
    startWebTone();
  } else {
    try {
      await configureAudioMode();
      const player = getNativeAudioPlayer();
      if (player && typeof player.play === 'function') {
        player.play();
      }
    } catch (err) {
      console.warn('[AlarmUtil] Native audio play failed:', err);
    }
  }

  // 3. Clear any existing auto-stop timer
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
  }

  // 4. Automatically stop after 1 minute (60 seconds)
  autoStopTimer = setTimeout(() => {
    console.log('[AlarmUtil] 60s Ring Duration Reached -> Auto-stopping alarm until 3min repeat');
    stopAudibleAlarm();
  }, ALARM_RING_DURATION_MS);
}

/**
 * Stop alarm sound and vibration immediately
 */
export function stopAudibleAlarm(): void {
  if (!isRinging) return;
  notifyListeners(false);

  console.log('[AlarmUtil] 🔕 Silencing alarm sound and vibration');

  // Cancel auto-stop timer
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }

  // Stop vibration
  try {
    Vibration.cancel();
  } catch {
    // safe fallback
  }

  // Stop web audio
  if (Platform.OS === 'web') {
    stopWebTone();
  }

  // Pause native audio player
  if (audioPlayerInstance) {
    try {
      if (typeof audioPlayerInstance.pause === 'function') {
        audioPlayerInstance.pause();
      }
    } catch {
      // safe fallback
    }
  }
}

export function isAlarmActive(): boolean {
  return isRinging;
}

