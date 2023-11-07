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
    label: "Gain reduction (dB)",
    value: 3,
    min: 0,
    max: 100,
  },
  attack: {
    label: "Attack time (seconds)",
    value: 0.01,
    min: 0,
    max: 0.3,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const gainReduction = samplePlugin.params.gainReduction.value;
  const attack = samplePlugin.params.attack.value;

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
  limiter.attack.value = attack;
  limiter.threshold.value = 0 - gainReduction;

  bufferSource.connect(limiter);
  limiter.connect(audioContext.destination);
  bufferSource.start();

  return audioContext.startRendering();
}
