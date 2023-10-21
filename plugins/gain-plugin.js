/**
 * GAIN PLUGIN for Volca Sampler
 * 
 * Created by Ben Wiley 2023
 * 
 * MIT License:
 * https://github.com/benwiley4000/volca-sampler-plugins/blob/master/LICENSE
 */

samplePlugin.params = {
  Gain: {
    value: 1,
    min: 0.1,
    max: 5,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const gain = samplePlugin.params.Gain.value;
  if (gain === 1) {
    // same as if bypassed
    return audioBuffer;
  }
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < channelData.length; i++) {
    channelData[i] *= gain;
  }
  return audioBuffer;
}
