const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const soundsDir = path.join(__dirname, '..', 'assets', 'sounds');

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Generate a crisp, harmonic medical alarm chime (3 repeating chime sequences)
function generateAlarmChimeSamples() {
  const sequenceTones = [
    { freq: 880, duration: 0.15, vol: 0.8 },      // A5
    { freq: 0, duration: 0.04, vol: 0 },         // pause
    { freq: 1108.73, duration: 0.15, vol: 0.85 }, // C#6
    { freq: 0, duration: 0.04, vol: 0 },         // pause
    { freq: 1318.51, duration: 0.22, vol: 0.9 },  // E6
    { freq: 0, duration: 0.04, vol: 0 },         // pause
    { freq: 1760, duration: 0.35, vol: 0.95 },    // A6 (high melodic peak)
    { freq: 0, duration: 0.3, vol: 0 },          // pause between cycles
  ];

  const totalCycles = 3;
  const samples = [];

  for (let cycle = 0; cycle < totalCycles; cycle++) {
    for (const tone of sequenceTones) {
      const numSamples = Math.floor(sampleRate * tone.duration);
      for (let i = 0; i < numSamples; i++) {
        if (tone.freq === 0) {
          samples.push(0);
        } else {
          const t = i / sampleRate;
          // Smooth ADSR envelope to prevent clicks
          const attack = Math.min(1, i / (sampleRate * 0.015));
          const decay = Math.max(0, 1 - (i / numSamples));
          const envelope = attack * decay;

          // Pure sine wave + soft harmonic overtone for clarity
          const fundamental = Math.sin(2 * Math.PI * tone.freq * t);
          const overtone = 0.25 * Math.sin(4 * Math.PI * tone.freq * t);
          const sample = (fundamental + overtone) * envelope * tone.vol;

          // 16-bit integer clamp (-32767 to 32767)
          const intSample = Math.floor(sample * 30000);
          samples.push(intSample);
        }
      }
    }
  }

  return samples;
}

function writeWavFile(filepath, samples) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF chunk descriptor
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " sub-chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);             // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);              // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);    // NumChannels
  buffer.writeUInt32LE(sampleRate, 24);     // SampleRate
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(16, 34);             // BitsPerSample

  // "data" sub-chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write PCM audio samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], offset);
    offset += 2;
  }

  fs.writeFileSync(filepath, buffer);
  console.log(`Generated ${filepath} (${(dataSize / 1024).toFixed(1)} KB, ${(samples.length / sampleRate).toFixed(2)}s)`);
}

const samples = generateAlarmChimeSamples();
writeWavFile(path.join(soundsDir, 'alarm.wav'), samples);

