/* ============================================================
   Highway Rush – Audio System (Web Audio API)
   All sounds are synthesized procedurally – no external files.
   ============================================================ */

const Audio = (() => {
  let ctx = null;
  let musicNodes = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function resume() {
    const c = getCtx();
    if (c.state === 'suspended') c.resume();
  }

  // ---------- Utilities ----------
  function osc(type, freq, start, duration, gainVal, destination) {
    const c = getCtx();
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    o.connect(g);
    g.connect(destination || sfxGain || c.destination);
    o.start(start);
    o.stop(start + duration);
  }

  function noise(start, duration, gainVal, destination) {
    const c = getCtx();
    const bufSize = c.sampleRate * duration;
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gainVal, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(g);
    g.connect(destination || sfxGain || c.destination);
    src.start(start);
  }

  // ---------- Init gains ----------
  function init() {
    const c = getCtx();
    musicGain = c.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(c.destination);

    sfxGain = c.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(c.destination);
  }

  // ---------- Background Music ----------
  // Upbeat pop/dance loop using oscillators
  function startMusic() {
    if (musicNodes) return;
    resume();
    if (!musicGain) init();

    const c = getCtx();
    const now = c.currentTime;
    const bpm = 128;
    const beat = 60 / bpm;

    // Chord progression: C maj, A min, F maj, G maj  (repeating 4-bar loop)
    const chords = [
      [261.63, 329.63, 392.00], // C
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [196.00, 246.94, 293.66], // G
    ];

    musicNodes = [];

    const loopDuration = beat * 16; // 4 bars of 4/4

    function playLoop(startTime) {
      const nodes = [];

      // Kick drum on beats 1 & 3
      for (let bar = 0; bar < 4; bar++) {
        for (let b of [0, 2]) {
          const t = startTime + (bar * 4 + b) * beat;
          const kOsc = c.createOscillator();
          const kGain = c.createGain();
          kOsc.type = 'sine';
          kOsc.frequency.setValueAtTime(120, t);
          kOsc.frequency.exponentialRampToValueAtTime(40, t + 0.08);
          kGain.gain.setValueAtTime(0.7, t);
          kGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
          kOsc.connect(kGain); kGain.connect(musicGain);
          kOsc.start(t); kOsc.stop(t + 0.2);
          nodes.push(kOsc, kGain);
        }
        // Snare on beats 2 & 4
        for (let b of [1, 3]) {
          const t = startTime + (bar * 4 + b) * beat;
          const bufSize = Math.floor(c.sampleRate * 0.15);
          const buf = c.createBuffer(1, bufSize, c.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
          const src = c.createBufferSource();
          src.buffer = buf;
          const sGain = c.createGain();
          sGain.gain.setValueAtTime(0.5, t);
          sGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
          const sOsc = c.createOscillator();
          sOsc.type = 'triangle';
          sOsc.frequency.value = 200;
          const sOscGain = c.createGain();
          sOscGain.gain.setValueAtTime(0.15, t);
          sOscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
          src.connect(sGain); sGain.connect(musicGain);
          sOsc.connect(sOscGain); sOscGain.connect(musicGain);
          src.start(t); sOsc.start(t); sOsc.stop(t + 0.1);
          nodes.push(src, sGain, sOsc, sOscGain);
        }
        // Hi-hat every 8th note
        for (let step = 0; step < 8; step++) {
          const t = startTime + (bar * 4 + step * 0.5) * beat;
          const hBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.04), c.sampleRate);
          const hData = hBuf.getChannelData(0);
          for (let i = 0; i < hData.length; i++) hData[i] = Math.random() * 2 - 1;
          const hSrc = c.createBufferSource();
          hSrc.buffer = hBuf;
          const hFilter = c.createBiquadFilter();
          hFilter.type = 'highpass';
          hFilter.frequency.value = 8000;
          const hGain = c.createGain();
          hGain.gain.setValueAtTime(0.18, t);
          hGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
          hSrc.connect(hFilter); hFilter.connect(hGain); hGain.connect(musicGain);
          hSrc.start(t);
          nodes.push(hSrc, hFilter, hGain);
        }
      }

      // Synth chords
      for (let i = 0; i < 4; i++) {
        const t = startTime + i * 4 * beat;
        const chord = chords[i];
        chord.forEach(freq => {
          for (let oct = 0; oct < 2; oct++) {
            const cOsc = c.createOscillator();
            const cGain = c.createGain();
            cOsc.type = oct === 0 ? 'sawtooth' : 'square';
            cOsc.frequency.value = freq * (oct === 0 ? 1 : 2);
            cOsc.detune.value = (Math.random() - 0.5) * 8; // slight detune for richness
            cGain.gain.setValueAtTime(0, t);
            cGain.gain.linearRampToValueAtTime(0.06, t + 0.02);
            cGain.gain.setValueAtTime(0.06, t + 4 * beat - 0.05);
            cGain.gain.linearRampToValueAtTime(0, t + 4 * beat);
            const filter = c.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1800;
            cOsc.connect(filter); filter.connect(cGain); cGain.connect(musicGain);
            cOsc.start(t); cOsc.stop(t + 4 * beat);
            nodes.push(cOsc, cGain, filter);
          }
        });
      }

      // Bass line
      const bassNotes = [
        { note: 65.41, bar: 0 }, { note: 65.41, bar: 0, beat: 2 },
        { note: 55.00, bar: 1 }, { note: 55.00, bar: 1, beat: 2 },
        { note: 43.65, bar: 2 }, { note: 43.65, bar: 2, beat: 2 },
        { note: 49.00, bar: 3 }, { note: 49.00, bar: 3, beat: 2 },
      ];
      bassNotes.forEach(bn => {
        const t = startTime + (bn.bar * 4 + (bn.beat || 0)) * beat;
        const bOsc = c.createOscillator();
        const bGain = c.createGain();
        bOsc.type = 'sawtooth';
        bOsc.frequency.value = bn.note * 2;
        bGain.gain.setValueAtTime(0.22, t);
        bGain.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.8);
        const bFilter = c.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.value = 400;
        bOsc.connect(bFilter); bFilter.connect(bGain); bGain.connect(musicGain);
        bOsc.start(t); bOsc.stop(t + beat * 2);
        nodes.push(bOsc, bGain, bFilter);
      });

      // Lead melody (simple pop hook)
      const melodyNotes = [
        [0, 523.25], [0.5, 587.33], [1, 659.25], [1.5, 698.46],
        [2, 783.99], [3, 659.25], [4, 440.00], [4.5, 493.88],
        [5, 523.25], [6, 659.25], [7, 587.33],
        [8, 523.25], [8.5, 440.00], [9, 392.00], [9.5, 349.23],
        [10, 392.00], [11, 440.00], [12, 523.25], [12.5, 587.33], [13, 659.25], [15, 523.25],
      ];
      melodyNotes.forEach(([b, freq]) => {
        const t = startTime + b * beat;
        const mOsc = c.createOscillator();
        const mGain = c.createGain();
        mOsc.type = 'square';
        mOsc.frequency.value = freq;
        mGain.gain.setValueAtTime(0.09, t);
        mGain.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.9);
        mOsc.connect(mGain); mGain.connect(musicGain);
        mOsc.start(t); mOsc.stop(t + beat);
        nodes.push(mOsc, mGain);
      });

      return { nodes, endTime: startTime + loopDuration };
    }

    let loopState = playLoop(now);
    musicNodes = loopState.nodes;

    // Keep looping
    function scheduleNextLoop() {
      const remaining = (loopState.endTime - getCtx().currentTime) * 1000 - 100;
      if (remaining < 0) {
        loopState = playLoop(getCtx().currentTime);
        musicNodes = loopState.nodes;
        setTimeout(scheduleNextLoop, (loopState.endTime - getCtx().currentTime) * 1000 - 100);
      } else {
        setTimeout(() => {
          if (!musicNodes) return;
          loopState = playLoop(loopState.endTime);
          musicNodes = loopState.nodes;
          scheduleNextLoop();
        }, remaining);
      }
    }
    scheduleNextLoop();
  }

  function stopMusic() {
    musicNodes = null; // Nodes will naturally stop; we just stop rescheduling
  }

  // ---------- SFX ----------
  function sfxAccelerate() {
    if (muted) return;
    resume();
    if (!sfxGain) init();
    const c = getCtx();
    const now = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(80, now);
    o.frequency.exponentialRampToValueAtTime(280, now + 0.35);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    o.connect(g); g.connect(sfxGain);
    o.start(now); o.stop(now + 0.4);
  }

  function sfxDodge() {
    if (muted) return;
    resume();
    if (!sfxGain) init();
    const c = getCtx();
    const now = c.currentTime;
    // Swoosh
    osc('sine', 600, now, 0.12, 0.25);
    osc('sine', 900, now + 0.04, 0.1, 0.15);
  }

  function sfxPassingCar() {
    if (muted) return;
    resume();
    if (!sfxGain) init();
    const c = getCtx();
    const now = c.currentTime;
    // Doppler-like whoosh
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(320, now);
    o.frequency.exponentialRampToValueAtTime(80, now + 0.25);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.2, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    o.connect(g); g.connect(sfxGain);
    o.start(now); o.stop(now + 0.3);
  }

  function sfxCrash() {
    if (muted) return;
    resume();
    if (!sfxGain) init();
    const c = getCtx();
    const now = c.currentTime;
    // Low boom
    osc('sine', 80, now, 0.6, 0.8);
    osc('sine', 50, now, 0.8, 0.9);
    // Noise burst
    noise(now, 0.5, 0.7);
    // Metal crunch (several short tones)
    [200, 340, 490, 680].forEach((f, i) => osc('sawtooth', f, now + i * 0.03, 0.15, 0.3));
  }

  function sfxNewRecord() {
    if (muted) return;
    resume();
    if (!sfxGain) init();
    const c = getCtx();
    const now = c.currentTime;
    // Ascending fanfare
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      osc('square', f, now + i * 0.1, 0.25, 0.3);
    });
  }

  function setMuted(val) {
    muted = val;
    if (musicGain) musicGain.gain.value = muted ? 0 : 0.35;
    if (sfxGain) sfxGain.gain.value = muted ? 0 : 0.6;
  }

  return {
    init,
    resume,
    startMusic,
    stopMusic,
    sfxAccelerate,
    sfxDodge,
    sfxPassingCar,
    sfxCrash,
    sfxNewRecord,
    setMuted,
    get muted() { return muted; }
  };
})();
