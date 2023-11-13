/**
 * TRIM PLUGIN for Volca Sampler
 *
 * Created by Ben Wiley 2023
 *
 * MIT License:
 * https://github.com/benwiley4000/volca-sampler-plugins/blob/master/LICENSE
 */

samplePlugin.params = {
  trimStart: {
    label: "Trim start (%)",
    value: 0,
    min: 0,
    max: 100,
  },
  trimEnd: {
    label: "Trim end (%)",
    value: 0,
    min: 0,
    max: 100,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const trimStart = samplePlugin.params.trimStart.value;
  const trimEnd = samplePlugin.params.trimEnd.value;

  const { length, sampleRate, numberOfChannels } = audioBuffer;

  const trimStartFrames = Math.round((trimStart * length) / 100);
  const trimEndFrames = Math.round((trimEnd * length) / 100);

  const newBufferLength = length - trimStartFrames - trimEndFrames;

  if (newBufferLength <= 0) {
    // if we have nothing left return an audio buffer of length 1
    return new AudioBuffer({ length: 1, sampleRate, numberOfChannels });
  }

  const sourceChannelData = audioBuffer.getChannelData(0);
  const trimmedView = new Float32Array(
    sourceChannelData.buffer,
    // 32-bit = 4 bytes
    trimStartFrames * 4,
    newBufferLength
  );

  const newAudioBuffer = new AudioBuffer({
    length: newBufferLength,
    sampleRate,
    numberOfChannels,
  });
  newAudioBuffer.copyToChannel(trimmedView, 0);

  return newAudioBuffer;
}
