# volca-sampler-plugins

This repository contains a handful of plugins that you can use with [Volca Sampler](https://github.com/benwiley4000/volca-sampler). They're also meant to serve as examples to help you write your own plugins. They are:

- [delay-plugin.js](plugins/delay-plugin.js)
- [gain-plugin.js](plugins/gain-plugin.js)
- [limiter-plugin.js](plugins/limiter-plugin.js)
- [lowpass-filter-plugin.js](plugins/lowpass-filter-plugin.js)
- [phaser-plugin.js](plugins/phaser-plugin.js)
- [timestretch-plugin.js](plugins/timestretch-plugin.js)
- [10-percent-silence-plugin.js](plugins/10-percent-silence-plugin.js)

Each of these plugins is briefly explained below.

## Table of contents

 * [What is a Volca Sampler plugin?](#what-is-a-volca-sampler-plugin)
 * [Getting started with plugins](#getting-started-with-plugins)
    + [gain-plugin.js](#gain-pluginjs)
    + [10-percent-silence-plugin.js](#10-percent-silence-plugin.js)
 * [Leveling up - using the Web Audio API](#leveling-up---using-the-web-audio-api)
    + [lowpass-filter-plugin.js](#lowpass-filter-pluginjs)
    + [limiter-plugin.js](#limiter-pluginjs)
 * [More complex audio processing](#more-complex-audio-processing)
    + [delay-plugin.js](#delay-pluginjs)
 * [Integrating third-party code in plugins](#integrating-third-party-code-in-plugins)
    + [phaser-plugin.js](#phaser-pluginjs)
    + [timestretch-plugin.js](#timestretch-pluginjs)
       - [Finding and embedding the third-party source code](#finding-and-embedding-the-third-party-source-code)

## What is a Volca Sampler plugin?

A Volca Sampler plugin is a JavaScript file that contains a function called `samplePlugin`, that accepts an [`AudioBuffer`](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) and returns an AudioBuffer (either the same buffer modified, or a new one). The simplest possible plugin, which acts as a passthrough for the input, is this one:

```js
// passthrough-plugin.js

function samplePlugin(audioBuffer) {
  return audioBuffer;
}
```

Plugins run in a secure iframe context that has access to useful browser APIs like the Web Audio API, but doesn't have network access, nor access to any of the data used by Volca Sampler, except for copies of whatever data Volca Sampler chooses to send it. This means you can share your plugin with other volca sample owners, who can confidently try out your plugin without necessarily understanding everything it's doing.

Read on to see some examples of plugins you can write.

## Getting started with plugins

### gain-plugin.js

[Source code](plugins/gain-plugin.js)

This plugin is pretty simple - it accepts a gain parameter, applies it to the provided AudioBuffer, then returns it. This allows a user more fine-tuned control over their sample volume than the normalization controls included in Volca Sampler by default.

The first thing to notice in the code, which we're seeing for the first time, is this `samplePlugin.params` declaration:

```js
samplePlugin.params = {
  gain: {
    label: "Gain",
    value: 1,
    min: 0.1,
    max: 5,
  },
};
```

This tells Volca Sampler which plugin parameters should be exposed to the user in the app UI. In this case we have one plugin parameter, called `gain`, which has a minimum value of `0.1`, a maximum value of `5`, and a value which is `1` by default (meaning no change in volume). This `value` will be overridden by Volca Sampler with whatever value the user has chosen.

Now let's take a look at the plugin itself:

```js
function samplePlugin(audioBuffer) {
  const gain = samplePlugin.params.gain.value;
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
```

We'll go over each part of this plugin in detail.

You can see that our plugin is first reading the `value` from its `gain` parameter and assigning it to a new variable (to save some typing later on):

```js
const gain = samplePlugin.params.gain.value;
```

After that, we make sure we actually need to perform any work, since a value of `1` won't change anything. In that case we just return the AudioBuffer unchanged. (This step isn't required for every plugin, but might save some processing time on a large multiple transfer to the volca sample.): 

```js
if (gain === 1) {
  // same as if bypassed
  return audioBuffer;
}
```

It's worth knowing that every sample in Volca Sampler is mono-channel, even if it was imported or recorded in stereo. So in order to get all the data we need to transform, we just need to get channel `0` (the first and only audio channel) from our AudioBuffer:

```js
const channelData = audioBuffer.getChannelData(0);
```

Our variable `channelData` is a reference to the [`Float32Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Float32Array) data inside of our AudioBuffer, and we can write to it directly, multiplying each sample frame by our gain amount:

```js
for (let i = 0; i < channelData.length; i++) {
  channelData[i] *= gain;
}
```

Finally, now that our data has been transformed, we just need to return it:

```js
return audioBuffer;
```

And that's it!

### 10-percent-silence-plugin.js

[Source code](plugins/10-percent-silence-plugin.js)

This plugin looks a bit like the Gain plugin, but instead of tweaking the sample contents, it extends the end of the sample so the last 10% of it is silent - bypassing the volca sample's limitation that a sample start point cannot exceed 90%. This is useful for slicing up breakbeats, as shown in [this video from Chris Lody](https://www.youtube.com/watch?v=ci_ReYDKUfI).

You might notice we don't have any params - we don't really need any, although you could add a param to adjust the amount of silence, if you wanted.

Because we're changing the length of the sample, we can't re-use the same ArrayBuffer like we did for the Gain plugin. So we create a new one that adds 10% of extra time:

```js
const newBufferLength = Math.ceil((length / 9) * 10);
const newAudioBuffer = new AudioBuffer({
  length: newBufferLength,
  sampleRate,
  numberOfChannels,
});
```

Next, all we need to do is copy the unmodified audio data from the old AudioBuffer to the new one (leaving silence at the end), and return it:

```js
newAudioBuffer.copyToChannel(audioBuffer.getChannelData(0), 0);
return newAudioBuffer;
```

## Leveling up - using the Web Audio API

To do more than just adjust sample volume or add silence to the end, most of our plugins will rely on a powerful audio toolkit included in all modern web browsers, called the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API). This API allows you to set up an audio effects chain with effects like delay, compression, filters, etc., kind of like you would in a DAW or on a guitar pedalboard.

The Web Audio API is normally used to process live audio playback in the browser, but it also offers a feature called [`OfflineAudioContext`](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext), which allows you to write the output of your effects chain directly to an AudioBuffer - which is exactly the type of data our plugin needs to return!

### lowpass-filter-plugin.js

[Source code](plugins/lowpass-filter-plugin.js)

This next plugin implements a basic low-pass filter with adjustable cutoff frequency and Q (resonance). For this we're using a feature of the Web Audio API called a [`BiquadFilterNode`](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode).

If you look at the source code, the beginning is familiar - we declare our `samplePlugin.params`, then we read these parameters at the beginning of our plugin code.

After that, we've got something new - we're creating an OfflineAudioContext whose internal AudioBuffer should match the size of our input AudioBuffer:

```js
const { numberOfChannels, sampleRate, length } = audioBuffer;

const audioContext = new OfflineAudioContext({
  numberOfChannels,
  sampleRate,
  length,
});
```

Next, we are setting up the components of our audio graph. First, we create an [`AudioBufferSourceNode`](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode) containing our input AudioBuffer:

```js
const bufferSource = audioContext.createBufferSource();
bufferSource.buffer = audioBuffer;
```

And then we create a new BiquadFilterNode, using the parameters we read earlier:

```js
const biquadFilter = audioContext.createBiquadFilter();
biquadFilter.frequency.value = frequency;
biquadFilter.Q.value = q;
biquadFilter.type = "lowpass";
```

Finally, we connect everything together and start the audio processing:

```js
bufferSource.connect(biquadFilter);
biquadFilter.connect(audioContext.destination);
bufferSource.start();
```

In order to get our resulting AudioBuffer, we need to call [`audioContext.startRendering()`](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext/startRendering), which returns an AudioBuffer, but [asynchronously](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous):

```js
return audioContext.startRendering();
```

You don't really need to know much about asynchronous JavaScript, you just need to know that other code might run in the browser while your audio is processing (which shouldn't be a big deal).

### limiter-plugin.js

[Source code](plugins/limiter-plugin.js)

If you tried out the previous plugins, you might have noticed some clipping at some point, which can happen if a plugin drives your peak volume above the limit.

The simplest solution to this problem is to make sure Normalization is turned on in your sample configuration in Volca Sampler. This will readjust your sample volume so that the peak volume is exactly at the limit (not above or below). Normalization is applied after your plugins, so if you already had this turned on, you probably didn't hear any clipping.

However, in some cases you might find the decrease in volume introduced by Normalization to be too dramatic, and you would prefer to just tame the loud sample peaks to be closer to the volume of the rest of your sample.

One solution is to use a [limiter](https://en.wikipedia.org/wiki/Limiter), an extreme type of compression whose job is to just turn down the volume on the loudest stuff without affecting anything else.

If you take a look at the source code, you'll see it's almost identical to `lowpass-filter-plugin.js`. What is different is the parameters (we have only one, called `gainReduction`), and that instead of a BiquadFilterNode, we use a [`DynamicsCompressorNode`](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode):

```js
const limiter = audioContext.createDynamicsCompressor();
limiter.ratio.value = 20;
limiter.attack.value = 0;
limiter.threshold.value = 0 - gainReduction;
```

Note that `20` is the maximum compression ratio available, and `0` is the minimum attack available. This is what turns our compressor into a limiter.

## More complex audio processing

### delay-plugin.js

[Source code](plugins/delay-plugin.js)

The Delay plugin is structured similarly to our other plugins, but it's doing a few things we haven't seen yet. Let's work backwords from the end of the file.

The first thing to notice is that our audio graph is processing in parallel. We have our `bufferSource` routed directly to the `audioContext.destination`, but we also have it routed through a delay circuit that is routed to the same destination. This means we can hear both the original audio and a delayed copy:

```js
bufferSource.connect(audioContext.destination);
delay.connect(audioContext.destination);
```

Continuing to work backwards, we can see that our delay processing is a bit more complicated than placing a single AudioNode between our bufferSource and its destination. Instead, we first route our bufferSource to a [`GainNode`](https://developer.mozilla.org/en-US/docs/Web/API/GainNode), which allows us to control the delay level independently of the regular sample volume. That node is then connected to the [`DelayNode`](https://developer.mozilla.org/en-US/docs/Web/API/DelayNode):

```js
const levelGain = audioContext.createGain();
levelGain.gain.value = level;

const delay = audioContext.createDelay();
delay.delayTime.value = delayTime;

// ...

bufferSource.connect(levelGain);
levelGain.connect(delay);
```

Also, in order to implement feedback, a popular feature of delay effect units, we have our DelayNode additionally routed to *another* GainNode, which is then looped back into the DelayNode:

```js
const feedbackGain = audioContext.createGain();
feedbackGain.gain.value = feedback;

// ...

delay.connect(feedbackGain);
feedbackGain.connect(delay);
```

You might be thinking this looks like a loop that could last forever, and you're right! The feedback will technically last for as long as the AudioBuffer we're writing to, although at some point you won't hear it anymore (as long as the feedback level is below 1).

And you'll notice near the top of the plugin, the code to create our OfflineAudioContext is a bit different. We have a parameter called `tailTime` that allows our output AudioBuffer to have a longer duration than our input. This allows us to hear the decaying delay effect, rather than cutting it off at the moment the original sample ended:

```js
const audioContext = new OfflineAudioContext({
  numberOfChannels,
  sampleRate,
  length: length + Math.floor(tailTime * sampleRate),
});
```


## Integrating third-party code in plugins

The JavaScript open source ecosystem is massive, and includes a good number of people building free audio effects code that you can incorporate in your own own code.

Some of this code uses the [`AudioNode`](https://developer.mozilla.org/en-US/docs/Web/API/AudioNode) interface, which makes it easy to integrate into your own code using the Web Audio API. Other code may accept lower-level data types like Float32Array.

### phaser-plugin.js

[Source code](plugins/phaser-plugin.js)

[Tuna.js](https://github.com/Theodeus/tuna) is a JavaScript library that includes more than a dozen configurable AudioNode effects, including overdrive, reverb, compression, tremolo, a Moog-style filter (in case you don't like the sound of the stock Web Audio filter), and more.

As an example, we have a Phaser plugin which accepts `rate` and `depth` parameters. It looks a lot like the Low-pass filter and Limiter plugins, but instead of including a stock Web Audio node, it uses a `Phaser` node from Tuna.js:

```js
const tuna = new Tuna(audioContext);
const phaser = new tuna.Phaser({ rate, depth });

bufferSource.connect(phaser);
phaser.connect(audioContext.destination);
```

At the bottom of my plugin file is the third-party Tuna.js code. In order to embed Tuna.js in my plugin code, we had to go find a build of it that will run directly in a web browser - which isn't always the easiest thing to do these days! Fortunately in the case of Tuna.js, there is a [useable copy directly in the GitHub repository](https://github.com/Theodeus/tuna/blob/master/tuna-min.js) (the minified version takes a bit less space on disk).

In other cases, such as the next one, finding an embeddable copy of the code is a bit more complicated, but we'll see how it's done.

### timestretch-plugin.js

[Source code](plugins/timestretch-plugin.js)

One audio effect that really isn't simple to implement using just the tools given by the Web Audio API, is [time stretching](https://en.wikipedia.org/wiki/Audio_time_stretching_and_pitch_scaling). To make audio faster or slower, the easiest method is [pitch-shifting resampling](https://en.wikipedia.org/wiki/Sample-rate_conversion), which both the volca sample and Volca Sampler have built-in. But time stretching without changing the pitch relies on one of several complicated algorithms that most of us don't want to implement ourselves.

Lucky for us, there's a library called [SoundTouchJS](https://github.com/cutterbl/SoundTouchJS) (itself based on the [SoundTouch C++ library](https://www.surina.net/soundtouch/)) which implements time stretching in JavaScript, and which is the basis for our Timestretch plugin.

The approach is a bit different than previous plugins, since although SoundTouchJS does work with the Web Audio API, it doesn't support the Web Audio API's OfflineAudioContext. Instead, we reimplement a little bit of SoundTouchJS's internal logic in order to write timestretched audio to a new AudioBuffer, whose size has been scaled by a factor of the provided `tempo` parameter.

#### Finding and embedding the third-party source code

As mentioned, finding a copy of SoundTouchJS to embed in the browser wasn't the simplest task. Many JavaScript GitHub repositories only include the source code, which sometimes is, but isn't always a copy of the code that you can easily copy and paste into a web browser. Often it's split into multiple files, or includes non-browser helper code that will be removed during a compilation step.

To find a distributable copy of SoundTouchJS, the first step is to find the name of its [npm package](https://www.npmjs.com/) (npm is the de facto code distribution service for JavaScript). The name of SoundTouchJS's package is [`soundtouchjs`](https://www.npmjs.com/package/soundtouchjs), as we can [see in its README.md file on GitHub](https://github.com/cutterbl/SoundTouchJS#installation).

With that information in hand, one way to get the distributable code is to download it with the `npm` command-line tool, but the easier way is to use [unpkg](https://unpkg.com/), a web service which allows you to browse the contents of npm packages without downloading them.

The way it works is that you visit `https://unpkg.com/[name of package]/` in a web browser, so for SoundTouchJS, that's [https://unpkg.com/soundtouchjs/](https://unpkg.com/soundtouchjs/) (the `/` at the end is important). Once you're there, you can usually see a folder called "dist/" or "build/", and inside of there, a JavaScript file that normally can run directly in a web browser.

For SoundTouchJS, [this is that file](https://unpkg.com/browse/soundtouchjs@0.1.30/dist/soundtouch.js). But there is a problem, which is that the line at the very end, starting with `export { AbstractFifoSamplePipe...`, will not run in the context of the Volca Sampler plugin iframe. Long story, but for the uninitiated, this is code related to JavaScript modules, and Volca Sampler plugins are not JavaScript modules.

The solution is easy though. We just need to copy all of the code in this file except for the last line, which we don't need, and include it in our plugin. In order to make the code small and take up less space, we can run it through an online JavaScript minification service like [UglifyJS Online](https://skalman.github.io/UglifyJS-online/).
