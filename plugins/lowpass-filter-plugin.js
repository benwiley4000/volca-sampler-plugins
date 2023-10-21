/**
 * LOWPASS FILTER PLUGIN for Volca Sampler
 *
 * Created by Ben Wiley 2023
 * 
 * MIT License:
 * https://github.com/benwiley4000/volca-sampler-plugins/blob/master/LICENSE
 */

samplePlugin.params = {
  "Cutoff frequency": {
    value: 1000,
    min: 30,
    max: 20000,
  },
  Q: {
    value: 3,
    min: 0,
    max: 25,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const frequency = samplePlugin.params["Cutoff frequency"].value;
  const q = samplePlugin.params.Q.value;

  const { numberOfChannels, sampleRate, length } = audioBuffer;

  const audioContext = new OfflineAudioContext({
    numberOfChannels,
    sampleRate,
    length,
  });

  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;

  const biquadFilter = audioContext.createBiquadFilter();
  biquadFilter.frequency.value = frequency;
  biquadFilter.Q.value = q;
  biquadFilter.type = "lowpass";

  bufferSource.connect(biquadFilter);
  biquadFilter.connect(audioContext.destination);
  bufferSource.start();

  return audioContext.startRendering();
}
