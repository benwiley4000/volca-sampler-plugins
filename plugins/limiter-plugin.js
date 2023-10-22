/**
 * LIMITER PLUGIN for Volca Sampler
 *
 * Created by Ben Wiley 2023
 * 
 * MIT License:
 * https://github.com/benwiley4000/volca-sampler-plugins/blob/master/LICENSE
 */

samplePlugin.params = {
  gainReduction: {
    label: "Gain reduction",
    value: 3,
    min: 0,
    max: 100,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const gainReduction = samplePlugin.params.gainReduction.value;

  const { numberOfChannels, sampleRate, length } = audioBuffer;

  const audioContext = new OfflineAudioContext({
    numberOfChannels,
    sampleRate,
    length,
  });

  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;

  const limiter = audioContext.createDynamicsCompressor();
  limiter.ratio.value = 20;
  limiter.attack.value = 0;
  limiter.threshold.value = 0 - gainReduction;

  bufferSource.connect(limiter);
  limiter.connect(audioContext.destination);
  bufferSource.start();

  return audioContext.startRendering();
}
