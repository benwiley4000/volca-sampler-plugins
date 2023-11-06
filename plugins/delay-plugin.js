/**
 * DELAY PLUGIN for Volca Sampler
 *
 * Created by Ben Wiley 2023
 * 
 * MIT License:
 * https://github.com/benwiley4000/volca-sampler-plugins/blob/master/LICENSE
 */

samplePlugin.params = {
  delayTime: {
    label: "Delay time (seconds)",
    value: 0.1,
    min: 0.01,
    max: 1,
  },
  level: {
    label: "Level",
    value: 0.5,
    min: 0,
    max: 1,
  },
  feedback: {
    label: "Feedback",
    value: 0.2,
    min: 0,
    max: 1.2,
  },
  tailTime: {
    label: "Tail time (seconds)",
    value: 0.1,
    min: 0,
    max: 3,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const delayTime = samplePlugin.params.delayTime.value;
  const level = samplePlugin.params.level.value;
  const feedback = samplePlugin.params.feedback.value;
  const tailTime = samplePlugin.params.tailTime.value;
  if (level === 0 && tailTime === 0) {
    // same as if bypassed
    return audioBuffer;
  }

  const { numberOfChannels, sampleRate, length } = audioBuffer;

  const audioContext = new OfflineAudioContext({
    numberOfChannels,
    sampleRate,
    length: length + Math.floor(tailTime * sampleRate),
  });

  const bufferSource = audioContext.createBufferSource();
  bufferSource.buffer = audioBuffer;

  const levelGain = audioContext.createGain();
  levelGain.gain.value = level;

  const delay = audioContext.createDelay();
  delay.delayTime.value = delayTime;

  const feedbackGain = audioContext.createGain();
  feedbackGain.gain.value = feedback;

  bufferSource.connect(levelGain);
  levelGain.connect(delay);
  delay.connect(feedbackGain);
  feedbackGain.connect(delay);

  bufferSource.connect(audioContext.destination);
  delay.connect(audioContext.destination);

  bufferSource.start();

  return audioContext.startRendering();
}
