/**
 * TIMESTRETCH PLUGIN for Volca Sampler
 *
 * Created by Ben Wiley 2023
 *
 * MIT License:
 * https://github.com/benwiley4000/volca-sampler-plugins/blob/master/LICENSE
 *
 * SoundTouchJS is LGPL licensed:
 * https://github.com/cutterbl/SoundTouchJS/blob/master/LICENSE
 */

samplePlugin.params = {
  tempo: {
    label: "Tempo",
    value: 1,
    min: 0.5,
    max: 2,
  },
};

/**
 * @param {AudioBuffer} audioBuffer
 */
function samplePlugin(audioBuffer) {
  const tempo = samplePlugin.params.tempo.value;
  if (tempo === 1) {
    // same as if bypassed
    return audioBuffer;
  }

  const { numberOfChannels, sampleRate, length } = audioBuffer;

  const newAudioBuffer = new AudioBuffer({
    numberOfChannels,
    sampleRate,
    length: Math.floor(length / tempo),
  });

  writeTimestretchedAudio(audioBuffer, newAudioBuffer, tempo);

  return newAudioBuffer;
}

/**
 * Note: assuming a maximum possible sample length around 130 seconds, prebuffer
 * an AudioBuffer 200 seconds long. This demands about 25MB of static memory
 * allocation. If this is too much for some reason, the user can lower this
 * to something that is reasonably above the maximum sample length the plugin
 * will be used for. For example if all samples are below 5 seconds long, a
 * 15 second buffer should be plenty.
 */
const EXTRA_LONG_BUFFER_LENGTH_SECS = 200;

/**
 * For some reason SoundTouchJS doesn't do well with audio buffers
 * that are only as long as the data they contain. The solution is
 * to preload an audio buffer larger than any data we could process,
 * copy our audio data to this buffer, and then continue to work
 * until we get to the end of the output buffer.
 */
const extraLongAudioBuffer = new AudioBuffer({
  numberOfChannels: 1,
  length: EXTRA_LONG_BUFFER_LENGTH_SECS * 31250,
  sampleRate: 31250,
});

/**
 * Use SoundTouchJS to write a timestretched copy to destBuffer
 * @param {AudioBuffer} srcBuffer
 * @param {AudioBuffer} destBuffer
 * @param {number} tempo
 */
function writeTimestretchedAudio(srcBuffer, destBuffer, tempo) {
  // dest buffer is currently silent so copy that to the area we
  // will write, so we don't carry over artifacts from previous
  // operations.
  extraLongAudioBuffer.copyToChannel(destBuffer.getChannelData(0), 0);

  // now copy the source audio
  extraLongAudioBuffer.copyToChannel(srcBuffer.getChannelData(0), 0);
  const source = new WebAudioBufferSource(extraLongAudioBuffer);

  const channelData = destBuffer.getChannelData(0);

  const soundTouch = new SoundTouch();
  soundTouch.tempo = tempo;

  const filter = new SimpleFilter(source, soundTouch);

  const bufferSize = 4096;
  const tempBuffer = new Float32Array(bufferSize * 2);
  let frames = 0;
  let offset = 0;
  do {
    frames = filter.extract(tempBuffer, bufferSize);
    if (!frames) break;
    for (let i = 0; i < frames && offset + i < channelData.length; i++) {
      channelData[offset + i] = tempBuffer[i * 2]; // read left channel only
    }
    offset += frames;
  } while (frames && offset < channelData.length);
}

/**
 * SoundTouchJS is LGPL licensed: https://github.com/cutterbl/SoundTouchJS/blob/master/LICENSE
 */
// prettier-ignore
class FifoSampleBuffer{constructor(){this._vector=new Float32Array,this._position=0,this._frameCount=0}get vector(){return this._vector}get position(){return this._position}get startIndex(){return 2*this._position}get frameCount(){return this._frameCount}get endIndex(){return 2*(this._position+this._frameCount)}clear(){this.receive(this._frameCount),this.rewind()}put(t){this._frameCount+=t}putSamples(t,e,s=0){const i=2*(e=e||0);s>=0||(s=(t.length-i)/2);const r=2*s;this.ensureCapacity(s+this._frameCount);const o=this.endIndex;this.vector.set(t.subarray(i,i+r),o),this._frameCount+=s}putBuffer(t,e,s=0){e=e||0,s>=0||(s=t.frameCount-e),this.putSamples(t.vector,t.position+e,s)}receive(t){t>=0&&!(t>this._frameCount)||(t=this.frameCount),this._frameCount-=t,this._position+=t}receiveSamples(t,e=0){const s=2*e,i=this.startIndex;t.set(this._vector.subarray(i,i+s)),this.receive(e)}extract(t,e=0,s=0){const i=this.startIndex+2*e,r=2*s;t.set(this._vector.subarray(i,i+r))}ensureCapacity(t=0){const e=parseInt(2*t);if(this._vector.length<e){const t=new Float32Array(e);t.set(this._vector.subarray(this.startIndex,this.endIndex)),this._vector=t,this._position=0}else this.rewind()}ensureAdditionalCapacity(t=0){this.ensureCapacity(this._frameCount+t)}rewind(){this._position>0&&(this._vector.set(this._vector.subarray(this.startIndex,this.endIndex)),this._position=0)}}class AbstractFifoSamplePipe{constructor(t){t?(this._inputBuffer=new FifoSampleBuffer,this._outputBuffer=new FifoSampleBuffer):this._inputBuffer=this._outputBuffer=null}get inputBuffer(){return this._inputBuffer}set inputBuffer(t){this._inputBuffer=t}get outputBuffer(){return this._outputBuffer}set outputBuffer(t){this._outputBuffer=t}clear(){this._inputBuffer.clear(),this._outputBuffer.clear()}}class RateTransposer extends AbstractFifoSamplePipe{constructor(t){super(t),this.reset(),this._rate=1}set rate(t){this._rate=t}reset(){this.slopeCount=0,this.prevSampleL=0,this.prevSampleR=0}clone(){const t=new RateTransposer;return t.rate=this._rate,t}process(){const t=this._inputBuffer.frameCount;this._outputBuffer.ensureAdditionalCapacity(t/this._rate+1);const e=this.transpose(t);this._inputBuffer.receive(),this._outputBuffer.put(e)}transpose(t=0){if(0===t)return 0;const e=this._inputBuffer.vector,s=this._inputBuffer.startIndex,i=this._outputBuffer.vector,r=this._outputBuffer.endIndex;let o=0,n=0;for(;this.slopeCount<1;)i[r+2*n]=(1-this.slopeCount)*this.prevSampleL+this.slopeCount*e[s],i[r+2*n+1]=(1-this.slopeCount)*this.prevSampleR+this.slopeCount*e[s+1],n+=1,this.slopeCount+=this._rate;if(this.slopeCount-=1,1!==t)t:for(;;){for(;this.slopeCount>1;)if(this.slopeCount-=1,(o+=1)>=t-1)break t;const h=s+2*o;i[r+2*n]=(1-this.slopeCount)*e[h]+this.slopeCount*e[h+2],i[r+2*n+1]=(1-this.slopeCount)*e[h+1]+this.slopeCount*e[h+3],n+=1,this.slopeCount+=this._rate}return this.prevSampleL=e[s+2*t-2],this.prevSampleR=e[s+2*t-1],n}}class FilterSupport{constructor(t){this._pipe=t}get pipe(){return this._pipe}get inputBuffer(){return this._pipe.inputBuffer}get outputBuffer(){return this._pipe.outputBuffer}fillInputBuffer(){throw new Error("fillInputBuffer() not overridden")}fillOutputBuffer(t=0){for(;this.outputBuffer.frameCount<t;){const t=16384-this.inputBuffer.frameCount;if(this.fillInputBuffer(t),this.inputBuffer.frameCount<16384)break;this._pipe.process()}}clear(){this._pipe.clear()}}const noop=function(){};class SimpleFilter extends FilterSupport{constructor(t,e,s=noop){super(e),this.callback=s,this.sourceSound=t,this.historyBufferSize=22050,this._sourcePosition=0,this.outputBufferPosition=0,this._position=0}get position(){return this._position}set position(t){if(t>this._position)throw new RangeError("New position may not be greater than current position");const e=this.outputBufferPosition-(this._position-t);if(e<0)throw new RangeError("New position falls outside of history buffer");this.outputBufferPosition=e,this._position=t}get sourcePosition(){return this._sourcePosition}set sourcePosition(t){this.clear(),this._sourcePosition=t}onEnd(){this.callback()}fillInputBuffer(t=0){const e=new Float32Array(2*t),s=this.sourceSound.extract(e,t,this._sourcePosition);this._sourcePosition+=s,this.inputBuffer.putSamples(e,0,s)}extract(t,e=0){this.fillOutputBuffer(this.outputBufferPosition+e);const s=Math.min(e,this.outputBuffer.frameCount-this.outputBufferPosition);this.outputBuffer.extract(t,this.outputBufferPosition,s);const i=this.outputBufferPosition+s;return this.outputBufferPosition=Math.min(this.historyBufferSize,i),this.outputBuffer.receive(Math.max(i-this.historyBufferSize,0)),this._position+=s,s}handleSampleData(t){this.extract(t.data,4096)}clear(){super.clear(),this.outputBufferPosition=0}}const USE_AUTO_SEQUENCE_LEN=0,DEFAULT_SEQUENCE_MS=0,USE_AUTO_SEEKWINDOW_LEN=0,DEFAULT_SEEKWINDOW_MS=0,DEFAULT_OVERLAP_MS=8,_SCAN_OFFSETS=[[124,186,248,310,372,434,496,558,620,682,744,806,868,930,992,1054,1116,1178,1240,1302,1364,1426,1488,0],[-100,-75,-50,-25,25,50,75,100,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[-20,-15,-10,-5,5,10,15,20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],[-4,-3,-2,-1,1,2,3,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]],AUTOSEQ_TEMPO_LOW=.5,AUTOSEQ_TEMPO_TOP=2,AUTOSEQ_AT_MIN=125,AUTOSEQ_AT_MAX=50,AUTOSEQ_K=(AUTOSEQ_AT_MAX-AUTOSEQ_AT_MIN)/1.5,AUTOSEQ_C=AUTOSEQ_AT_MIN-.5*AUTOSEQ_K,AUTOSEEK_AT_MIN=25,AUTOSEEK_AT_MAX=15,AUTOSEEK_K=(AUTOSEEK_AT_MAX-AUTOSEEK_AT_MIN)/1.5,AUTOSEEK_C=AUTOSEEK_AT_MIN-.5*AUTOSEEK_K;class Stretch extends AbstractFifoSamplePipe{constructor(t){super(t),this._quickSeek=!0,this.midBufferDirty=!1,this.midBuffer=null,this.overlapLength=0,this.autoSeqSetting=!0,this.autoSeekSetting=!0,this._tempo=1,this.setParameters(44100,DEFAULT_SEQUENCE_MS,DEFAULT_SEEKWINDOW_MS,DEFAULT_OVERLAP_MS)}clear(){super.clear(),this.clearMidBuffer()}clearMidBuffer(){this.midBufferDirty&&(this.midBufferDirty=!1,this.midBuffer=null)}setParameters(t,e,s,i){t>0&&(this.sampleRate=t),i>0&&(this.overlapMs=i),e>0?(this.sequenceMs=e,this.autoSeqSetting=!1):this.autoSeqSetting=!0,s>0?(this.seekWindowMs=s,this.autoSeekSetting=!1):this.autoSeekSetting=!0,this.calculateSequenceParameters(),this.calculateOverlapLength(this.overlapMs),this.tempo=this._tempo}set tempo(t){let e;this._tempo=t,this.calculateSequenceParameters(),this.nominalSkip=this._tempo*(this.seekWindowLength-this.overlapLength),this.skipFract=0,e=Math.floor(this.nominalSkip+.5),this.sampleReq=Math.max(e+this.overlapLength,this.seekWindowLength)+this.seekLength}get tempo(){return this._tempo}get inputChunkSize(){return this.sampleReq}get outputChunkSize(){return this.overlapLength+Math.max(0,this.seekWindowLength-2*this.overlapLength)}calculateOverlapLength(t=0){let e;e=(e=this.sampleRate*t/1e3)<16?16:e,e-=e%8,this.overlapLength=e,this.refMidBuffer=new Float32Array(2*this.overlapLength),this.midBuffer=new Float32Array(2*this.overlapLength)}checkLimits(t,e,s){return t<e?e:t>s?s:t}calculateSequenceParameters(){let t,e;this.autoSeqSetting&&(t=AUTOSEQ_C+AUTOSEQ_K*this._tempo,t=this.checkLimits(t,AUTOSEQ_AT_MAX,AUTOSEQ_AT_MIN),this.sequenceMs=Math.floor(t+.5)),this.autoSeekSetting&&(e=AUTOSEEK_C+AUTOSEEK_K*this._tempo,e=this.checkLimits(e,AUTOSEEK_AT_MAX,AUTOSEEK_AT_MIN),this.seekWindowMs=Math.floor(e+.5)),this.seekWindowLength=Math.floor(this.sampleRate*this.sequenceMs/1e3),this.seekLength=Math.floor(this.sampleRate*this.seekWindowMs/1e3)}set quickSeek(t){this._quickSeek=t}clone(){const t=new Stretch;return t.tempo=this._tempo,t.setParameters(this.sampleRate,this.sequenceMs,this.seekWindowMs,this.overlapMs),t}seekBestOverlapPosition(){return this._quickSeek?this.seekBestOverlapPositionStereoQuick():this.seekBestOverlapPositionStereo()}seekBestOverlapPositionStereo(){let t,e,s,i=0;for(this.preCalculateCorrelationReferenceStereo(),t=0,e=Number.MIN_VALUE;i<this.seekLength;i+=1)(s=this.calculateCrossCorrelationStereo(2*i,this.refMidBuffer))>e&&(e=s,t=i);return t}seekBestOverlapPositionStereoQuick(){let t,e,s,i,r,o=0;for(this.preCalculateCorrelationReferenceStereo(),e=Number.MIN_VALUE,t=0,i=0,r=0;o<4;o+=1){let n=0;for(;_SCAN_OFFSETS[o][n]&&!((r=i+_SCAN_OFFSETS[o][n])>=this.seekLength);)(s=this.calculateCrossCorrelationStereo(2*r,this.refMidBuffer))>e&&(e=s,t=r),n+=1;i=t}return t}preCalculateCorrelationReferenceStereo(){let t,e,s=0;for(;s<this.overlapLength;s+=1)e=s*(this.overlapLength-s),t=2*s,this.refMidBuffer[t]=this.midBuffer[t]*e,this.refMidBuffer[t+1]=this.midBuffer[t+1]*e}calculateCrossCorrelationStereo(t,e){const s=this._inputBuffer.vector;t+=this._inputBuffer.startIndex;let i=0,r=2;const o=2*this.overlapLength;let n;for(;r<o;r+=2)i+=s[n=r+t]*e[r]+s[n+1]*e[r+1];return i}overlap(t){this.overlapStereo(2*t)}overlapStereo(t){const e=this._inputBuffer.vector;t+=this._inputBuffer.startIndex;const s=this._outputBuffer.vector,i=this._outputBuffer.endIndex;let r,o,n=0;const h=1/this.overlapLength;let u,a,f;for(;n<this.overlapLength;n+=1)o=(this.overlapLength-n)*h,u=n*h,a=(r=2*n)+t,s[(f=r+i)+0]=e[a+0]*u+this.midBuffer[r+0]*o,s[f+1]=e[a+1]*u+this.midBuffer[r+1]*o}process(){let t,e,s;if(null===this.midBuffer){if(this._inputBuffer.frameCount<this.overlapLength)return;this.midBuffer=new Float32Array(2*this.overlapLength),this._inputBuffer.receiveSamples(this.midBuffer,this.overlapLength)}for(;this._inputBuffer.frameCount>=this.sampleReq;){t=this.seekBestOverlapPosition(),this._outputBuffer.ensureAdditionalCapacity(this.overlapLength),this.overlap(Math.floor(t)),this._outputBuffer.put(this.overlapLength),(e=this.seekWindowLength-2*this.overlapLength)>0&&this._outputBuffer.putBuffer(this._inputBuffer,t+this.overlapLength,e);const i=this._inputBuffer.startIndex+2*(t+this.seekWindowLength-this.overlapLength);this.midBuffer.set(this._inputBuffer.vector.subarray(i,i+2*this.overlapLength)),this.skipFract+=this.nominalSkip,s=Math.floor(this.skipFract),this.skipFract-=s,this._inputBuffer.receive(s)}}}const testFloatEqual=function(t,e){return(t>e?t-e:e-t)>1e-10};class SoundTouch{constructor(){this.transposer=new RateTransposer(!1),this.stretch=new Stretch(!1),this._inputBuffer=new FifoSampleBuffer,this._intermediateBuffer=new FifoSampleBuffer,this._outputBuffer=new FifoSampleBuffer,this._rate=0,this._tempo=0,this.virtualPitch=1,this.virtualRate=1,this.virtualTempo=1,this.calculateEffectiveRateAndTempo()}clear(){this.transposer.clear(),this.stretch.clear()}clone(){const t=new SoundTouch;return t.rate=this.rate,t.tempo=this.tempo,t}get rate(){return this._rate}set rate(t){this.virtualRate=t,this.calculateEffectiveRateAndTempo()}set rateChange(t){this._rate=1+.01*t}get tempo(){return this._tempo}set tempo(t){this.virtualTempo=t,this.calculateEffectiveRateAndTempo()}set tempoChange(t){this.tempo=1+.01*t}set pitch(t){this.virtualPitch=t,this.calculateEffectiveRateAndTempo()}set pitchOctaves(t){this.pitch=Math.exp(.69314718056*t),this.calculateEffectiveRateAndTempo()}set pitchSemitones(t){this.pitchOctaves=t/12}get inputBuffer(){return this._inputBuffer}get outputBuffer(){return this._outputBuffer}calculateEffectiveRateAndTempo(){const t=this._tempo,e=this._rate;this._tempo=this.virtualTempo/this.virtualPitch,this._rate=this.virtualRate*this.virtualPitch,testFloatEqual(this._tempo,t)&&(this.stretch.tempo=this._tempo),testFloatEqual(this._rate,e)&&(this.transposer.rate=this._rate),this._rate>1?this._outputBuffer!=this.transposer.outputBuffer&&(this.stretch.inputBuffer=this._inputBuffer,this.stretch.outputBuffer=this._intermediateBuffer,this.transposer.inputBuffer=this._intermediateBuffer,this.transposer.outputBuffer=this._outputBuffer):this._outputBuffer!=this.stretch.outputBuffer&&(this.transposer.inputBuffer=this._inputBuffer,this.transposer.outputBuffer=this._intermediateBuffer,this.stretch.inputBuffer=this._intermediateBuffer,this.stretch.outputBuffer=this._outputBuffer)}process(){this._rate>1?(this.stretch.process(),this.transposer.process()):(this.transposer.process(),this.stretch.process())}}class WebAudioBufferSource{constructor(t){this.buffer=t,this._position=0}get dualChannel(){return this.buffer.numberOfChannels>1}get position(){return this._position}set position(t){this._position=t}extract(t,e=0,s=0){this.position=s;let i=this.buffer.getChannelData(0),r=this.dualChannel?this.buffer.getChannelData(1):this.buffer.getChannelData(0),o=0;for(;o<e;o++)t[2*o]=i[o+s],t[2*o+1]=r[o+s];return Math.min(e,i.length-s)}}const getWebAudioNode=function(t,e,s=noop,i=4096){const r=t.createScriptProcessor(i,2,2),o=new Float32Array(2*i);return r.onaudioprocess=(t=>{let r=t.outputBuffer.getChannelData(0),n=t.outputBuffer.getChannelData(1),h=e.extract(o,i);s(e.sourcePosition),0===h&&e.onEnd();let u=0;for(;u<h;u++)r[u]=o[2*u],n[u]=o[2*u+1]}),r},pad=function(t,e,s){return s=s||"0",(t+="").length>=e?t:new Array(e-t.length+1).join(s)+t},minsSecs=function(t){const e=Math.floor(t/60);return`${e}:${s=parseInt(t-60*e),i=2,r=r||"0",(s+="").length>=i?s:new Array(i-s.length+1).join(r)+s}`;var s,i,r},onUpdate=function(t){const e=this.timePlayed,s=this.sampleRate;if(this.sourcePosition=t,this.timePlayed=t/s,e!==this.timePlayed){const t=new CustomEvent("play",{detail:{timePlayed:this.timePlayed,formattedTimePlayed:this.formattedTimePlayed,percentagePlayed:this.percentagePlayed}});this._node.dispatchEvent(t)}};class PitchShifter{constructor(t,e,s,i=noop){this._soundtouch=new SoundTouch;const r=new WebAudioBufferSource(e);this.timePlayed=0,this.sourcePosition=0,this._filter=new SimpleFilter(r,this._soundtouch,i),this._node=getWebAudioNode(t,this._filter,t=>onUpdate.call(this,t),s),this.tempo=1,this.rate=1,this.duration=e.duration,this.sampleRate=t.sampleRate,this.listeners=[]}get formattedDuration(){return minsSecs(this.duration)}get formattedTimePlayed(){return minsSecs(this.timePlayed)}get percentagePlayed(){return 100*this._filter.sourcePosition/(this.duration*this.sampleRate)}set percentagePlayed(t){this._filter.sourcePosition=parseInt(t*this.duration*this.sampleRate),this.sourcePosition=this._filter.sourcePosition,this.timePlayed=this.sourcePosition/this.sampleRate}get node(){return this._node}set pitch(t){this._soundtouch.pitch=t}set pitchSemitones(t){this._soundtouch.pitchSemitones=t}set rate(t){this._soundtouch.rate=t}set tempo(t){this._soundtouch.tempo=t}connect(t){this._node.connect(t)}disconnect(){this._node.disconnect()}on(t,e){this.listeners.push({name:t,cb:e}),this._node.addEventListener(t,t=>e(t.detail))}off(t=null){let e=this.listeners;t&&(e=e.filter(e=>e.name===t)),e.forEach(t=>{this._node.removeEventListener(t.name,e=>t.cb(e.detail))})}}
