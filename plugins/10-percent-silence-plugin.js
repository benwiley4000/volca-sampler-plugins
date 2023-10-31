/**
 * 10 PERCENT SILENCE PLUGIN for Volca Sampler
 *
 * Created by Ben Wiley 2023
 *
 * Inspired by Chris Lody's technique for allowing up to 100% sample start time
 * (instead of 90%) by making the latest 10% of the transferred sample silent:
 * https://www.youtube.com/watch?v=ci_ReYDKUfI
 *
 * MIT License:
 * https://github.com/benwiley4000/volca-sampler-plugins/blob/master/LICENSE
 */

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const { length, sampleRate, numberOfChannels } = audioBuffer;
  // Input buffer length is 90% of target length, so we divide it by 9 then
  // multiply by 10.
  const newBufferLength = Math.ceil((length / 9) * 10);
  const newAudioBuffer = new AudioBuffer({
    length: newBufferLength,
    sampleRate,
    numberOfChannels,
  });
  // Copy sample data to front of buffer, leaving 10% of silence at the end.
  newAudioBuffer.copyToChannel(audioBuffer.getChannelData(0), 0);
  return newAudioBuffer;
}
