(() => {
    "use strict";

    let audioContext = null;
    const getAudioContext = () => {
        if (!audioContext) {
            const Context = window.AudioContext || window.webkitAudioContext;
            if (!Context) throw new Error("Web Audio is not supported by this browser.");
            audioContext = new Context();
        }
        if (audioContext.state === "suspended") audioContext.resume();
        return audioContext;
    };

    const tabs = [...document.querySelectorAll(".tool-tab")];
    const panels = [...document.querySelectorAll("[data-tool-panel]")];
    tabs.forEach(tab => tab.addEventListener("click", () => {
        const name = tab.dataset.tool;
        tabs.forEach(item => {
            const active = item === tab;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-selected", String(active));
        });
        panels.forEach(panel => {
            const active = panel.dataset.toolPanel === name;
            panel.classList.toggle("is-active", active);
            panel.hidden = !active;
        });
    }));

    // Reference tuner with selectable four-string bass tunings.
    const tunerTunings = {
        "e-standard": {
            label: "E standard",
            strings: [
                { note: "E", label: "E string", frequency: 41.2034 },
                { note: "A", label: "A string", frequency: 55.0000 },
                { note: "D", label: "D string", frequency: 73.4162 },
                { note: "G", label: "G string", frequency: 97.9989 }
            ]
        },
        "five-string": {
            label: "5-string",
            strings:[
{ note:"B", label:"B string", frequency:30.8677 },
{ note:"E", label:"E string", frequency:41.2034 },
{ note:"A", label:"A string", frequency:55.0 },
{ note:"D", label:"D string", frequency:73.4162 },
{ note:"G", label:"G string", frequency:97.9989 }
]
        },
        "drop-d": {
            label: "Drop D",
            strings: [
                { note: "D", label: "D string", frequency: 36.7081 },
                { note: "A", label: "A string", frequency: 55.0000 },
                { note: "D", label: "D string", frequency: 73.4162 },
                { note: "G", label: "G string", frequency: 97.9989 }
            ]
        },
        "d-standard": {
            label: "D standard",
            strings: [
                { note: "D", label: "D string", frequency: 36.7081 },
                { note: "G", label: "G string", frequency: 48.9994 },
                { note: "C", label: "C string", frequency: 65.4064 },
                { note: "F", label: "F string", frequency: 87.3071 }
            ]
        },
        "eb-standard": {
            label: "E♭ standard",
            strings: [
                { note: "E♭", label: "E♭ string", frequency: 38.8909 },
                { note: "A♭", label: "A♭ string", frequency: 51.9131 },
                { note: "D♭", label: "D♭ string", frequency: 69.2957 },
                { note: "G♭", label: "G♭ string", frequency: 92.4986 }
            ]
        },
        "drop-c": {
            label: "Drop C",
            strings: [
                { note: "C", label: "C string", frequency: 32.7032 },
                { note: "G", label: "G string", frequency: 48.9994 },
                { note: "C", label: "C string", frequency: 65.4064 },
                { note: "F", label: "F string", frequency: 87.3071 }
            ]
        },
        "c-standard": {
            label: "C standard",
            strings: [
                { note: "C", label: "C string", frequency: 32.7032 },
                { note: "F", label: "F string", frequency: 43.6535 },
                { note: "B♭", label: "B♭ string", frequency: 58.2705 },
                { note: "E♭", label: "E♭ string", frequency: 77.7817 }
            ]
        }
    };

    const tunerStringsContainer = document.querySelector(".tuner-strings");
    const getTunerButtons = () => [...tunerStringsContainer.querySelectorAll(".tuner-string")];
    const tunerStop = document.getElementById("tuner-stop");
    const tunerNote = document.getElementById("tuner-note");
    const tunerFrequency = document.getElementById("tuner-frequency");
    const tunerStatus = document.getElementById("tuner-status");
    const tunerVolume = document.getElementById("tuner-volume");
    const tunerVolumeValue = document.getElementById("tuner-volume-value");
    const tunerTuning = document.getElementById("tuner-tuning");
    const tunerHeading = document.getElementById("tuner-heading");
    let tunerNodes = null;

    const activeTuning = () => tunerTunings[tunerTuning.value] || tunerTunings["e-standard"];

    const ensureStringButtons = () => {
        const tuning = activeTuning();
        tunerStringsContainer.innerHTML = "";
        tunerStringsContainer.style.setProperty("--tuner-string-count", String(tuning.strings.length));

        tuning.strings.forEach((string, index) => {
            const button = document.createElement("button");
            button.className = "tuner-string";
            button.type = "button";
            button.dataset.stringIndex = String(index);
            button.dataset.note = string.note;
            button.dataset.frequency = String(string.frequency);
            button.dataset.stringLabel = string.label;
            button.setAttribute("aria-label", `Play ${string.label} reference tone`);
            button.innerHTML = `
                <span class="tuner-note-icon">${string.note}</span>
                <strong>${string.label}</strong>
                <span class="tuner-led" aria-hidden="true"></span>`;
            tunerStringsContainer.appendChild(button);
        });

        return getTunerButtons();
    };


    const updateTunerButtons = () => {
        const tunerButtons=ensureStringButtons();
        const tuning = activeTuning();
        tunerHeading.textContent = tuning.label;

        tunerButtons.forEach((button, index) => {
            const string = tuning.strings[index];
            button.dataset.note = string.note;
            button.dataset.frequency = String(string.frequency);
            button.dataset.stringLabel = string.label;
            button.querySelector(".tuner-note-icon").textContent = string.note;
            button.querySelector("strong").textContent = string.label;
            button.setAttribute("aria-label", `Play ${string.label} reference tone`);
        });
    };

    const releaseTunerNodes = (nodes, fadeSeconds = 0.16) => {
        if (!nodes) return;
        const now = nodes.context.currentTime;
        nodes.masterGain.gain.cancelScheduledValues(now);
        nodes.masterGain.gain.setTargetAtTime(0, now, Math.max(0.02, fadeSeconds / 4));
        nodes.oscillators.forEach(oscillator => {
            try { oscillator.stop(now + fadeSeconds + 0.08); } catch (_) {}
        });
    };

    const resetTunerDisplay = () => {
        getTunerButtons().forEach(button => button.classList.remove("is-playing"));
        tunerStop.disabled = true;
        tunerNote.textContent = "—";
        tunerFrequency.textContent = "Choose a string below";
        tunerStatus.textContent = "Ready";
    };

    const stopTuner = () => {
        const previous = tunerNodes;
        tunerNodes = null;
        releaseTunerNodes(previous, 0.18);
        resetTunerDisplay();
    };

    const tunerTargetVolume = () => (Number(tunerVolume.value) / 100) * 0.19;

    const playTuner = button => {
        try {
            const context = getAudioContext();
            const frequency = Number(button.dataset.frequency);
            const previous = tunerNodes;

            const masterGain = context.createGain();
            const compressor = context.createDynamicsCompressor();
            const filter = context.createBiquadFilter();

            filter.type = "lowpass";
            filter.frequency.value = 1500;
            filter.Q.value = 0.45;

            compressor.threshold.value = -20;
            compressor.knee.value = 18;
            compressor.ratio.value = 5;
            compressor.attack.value = 0.008;
            compressor.release.value = 0.22;

            masterGain.gain.value = 0;
            masterGain.connect(filter).connect(compressor).connect(context.destination);

            const partials = [
                { multiple: 1, gain: 1.00, type: "triangle" },
                { multiple: 2, gain: 0.80, type: "sine" },
                { multiple: 3, gain: 0.60, type: "sine" },
                { multiple: 4, gain: 0.40, type: "sine" },
                { multiple: 5, gain: 0.20, type: "sine" }
            ];

            const oscillators = partials.map(partial => {
                const oscillator = context.createOscillator();
                const partialGain = context.createGain();
                oscillator.type = partial.type;
                oscillator.frequency.value = frequency * partial.multiple;
                partialGain.gain.value = partial.gain;
                oscillator.connect(partialGain).connect(masterGain);
                oscillator.start();
                return oscillator;
            });

            tunerNodes = { context, masterGain, oscillators };
            const now = context.currentTime;
            masterGain.gain.setValueAtTime(0.0001, now);
            masterGain.gain.exponentialRampToValueAtTime(
                Math.max(0.0001, tunerTargetVolume()),
                now + 0.14
            );

            releaseTunerNodes(previous, 0.17);

            getTunerButtons().forEach(item => item.classList.toggle("is-playing", item === button));
            tunerStop.disabled = false;
            tunerNote.textContent = button.dataset.note;
            tunerFrequency.textContent = button.dataset.stringLabel;
            tunerStatus.textContent = `Playing ${button.dataset.stringLabel}`;
        } catch (error) {
            tunerStatus.textContent = error.message;
        }
    };

    tunerStringsContainer.addEventListener("click", event => {
        const button = event.target.closest(".tuner-string");
        if (!button) return;
        if (button.classList.contains("is-playing")) stopTuner();
        else playTuner(button);
    });

    tunerStop.addEventListener("click", stopTuner);

    tunerTuning.addEventListener("change", () => {
        stopTuner();
        updateTunerButtons();
    });

    tunerVolume.addEventListener("input", () => {
        tunerVolumeValue.textContent = `${tunerVolume.value}%`;
        if (tunerNodes) {
            tunerNodes.masterGain.gain.setTargetAtTime(
                tunerTargetVolume(),
                tunerNodes.context.currentTime,
                0.025
            );
        }
    });

    tunerVolume.value = "90";
    tunerVolumeValue.textContent = "90%";
    updateTunerButtons();

    // Metronome with selectable time signatures and a dynamic 3-level sequencer.
    const signatures = {
        "3/4": { beats: 3, subdivision: 4, defaults: [3, 1, 1] },
        "4/4": { beats: 4, subdivision: 4, defaults: [3, 1, 1, 1] },
        "5/4": { beats: 5, subdivision: 4, defaults: [3, 1, 2, 1, 1] },
        "7/4": { beats: 7, subdivision: 4, defaults: [3, 1, 2, 1, 2, 1, 1] },
        "6/8": { beats: 6, subdivision: 8, defaults: [3, 1, 1, 2, 1, 1] }
    };

    const bpmInput = document.getElementById("bpm-input");
    const bpmSlider = document.getElementById("bpm-slider");
    const signatureSelect = document.getElementById("time-signature");
    const sequencer = document.getElementById("stress-sequencer");
    const beatLightsContainer = document.getElementById("beat-lights");
    const playButton = document.getElementById("metronome-play");
    const pauseButton = document.getElementById("metronome-pause");
    const stopButton = document.getElementById("metronome-stop");
    const status = document.getElementById("metronome-status");
    const tapButton = document.getElementById("tap-tempo");
    const metroVolume = document.getElementById("metronome-volume");
    const metroVolumeValue = document.getElementById("metronome-volume-value");

    let beatLevels = [];
    let beatLights = [];
    let timerId = null;
    let nextBeatTime = 0;
    let currentBeat = 0;
    let running = false;
    let paused = false;
    let tapTimes = [];

    const scheduleAhead = 0.1;
    const lookahead = 25;

    const currentSignature = () => signatures[signatureSelect.value] || signatures["4/4"];

    const clampBpm = value => Math.min(240, Math.max(30, Number(value) || 90));
    const snapBpm = value => Math.round(clampBpm(value) / 3) * 3;
    const setBpm = value => {
        const bpm = snapBpm(value);
        bpmInput.value = String(bpm);
        bpmSlider.value = String(bpm);
    };

    bpmInput.addEventListener("change", () => setBpm(bpmInput.value));
    bpmSlider.addEventListener("input", () => setBpm(bpmSlider.value));
    document.querySelectorAll("[data-bpm-step]").forEach(button => {
        button.addEventListener("click", () => {
            setBpm(Number(bpmInput.value) + Number(button.dataset.bpmStep));
        });
    });

    const renderSequencer = (preserve = false) => {
        const signature = currentSignature();
        const previous = [...beatLevels];

        beatLevels = Array.from({ length: signature.beats }, (_, index) =>
            preserve && previous[index]
                ? previous[index]
                : signature.defaults[index]
        );

        sequencer.style.setProperty("--beat-count", String(signature.beats));
        sequencer.innerHTML = "";

        const corner = document.createElement("div");
        corner.className = "sequencer-corner";
        corner.setAttribute("aria-hidden", "true");
        sequencer.appendChild(corner);

        for (let beat = 0; beat < signature.beats; beat += 1) {
            const heading = document.createElement("strong");
            heading.className = "beat-heading";
            heading.textContent = String(beat + 1);
            heading.setAttribute("aria-label", `Beat ${beat + 1}`);
            sequencer.appendChild(heading);
        }

        [
            { level: 3, label: "Strong" },
            { level: 2, label: "Medium" },
            { level: 1, label: "Light" }
        ].forEach(({ level, label }) => {
            const rowLabel = document.createElement("strong");
            rowLabel.className = "level-heading";
            rowLabel.textContent = label;
            sequencer.appendChild(rowLabel);

            for (let beat = 0; beat < signature.beats; beat += 1) {
                const cell = document.createElement("button");
                const selected = beatLevels[beat] === level;

                cell.type = "button";
                cell.className = `stress-cell stress-level-${level}${selected ? " is-selected" : ""}`;
                cell.dataset.beat = String(beat);
                cell.dataset.level = String(level);
                cell.setAttribute(
                    "aria-label",
                    `Beat ${beat + 1}: ${label.toLowerCase()} accent`
                );
                cell.setAttribute("aria-pressed", String(selected));
                cell.innerHTML = `<span aria-hidden="true"></span>`;
                sequencer.appendChild(cell);
            }
        });

        beatLightsContainer.style.setProperty("--beat-count", String(signature.beats));
        beatLightsContainer.innerHTML = "";
        beatLights = Array.from({ length: signature.beats }, (_, index) => {
            const light = document.createElement("span");
            light.dataset.beatLight = String(index);
            light.textContent = String(index + 1);
            beatLightsContainer.appendChild(light);
            return light;
        });

        currentBeat = 0;
    };

    sequencer.addEventListener("click", event => {
        const cell = event.target.closest(".stress-cell");
        if (!cell) return;

        const beat = Number(cell.dataset.beat);
        const level = Number(cell.dataset.level);
        beatLevels[beat] = level;

        [...sequencer.querySelectorAll(`.stress-cell[data-beat="${beat}"]`)].forEach(item => {
            const selected = item === cell;
            item.classList.toggle("is-selected", selected);
            item.setAttribute("aria-pressed", String(selected));
        });
    });

    signatureSelect.addEventListener("change", () => {
        const wasRunning = running;
        stopMetronome();
        renderSequencer(false);
        if (wasRunning) playMetronome();
    });

    const clickBeat = (time, beat, level) => {
        const context = getAudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "square";
        oscillator.frequency.value = level === 3 ? 1320 : level === 2 ? 1030 : 790;

        const volume = Number(metroVolume.value) / 100;
        const peak = volume * (level === 3 ? 0.42 : level === 2 ? 0.30 : 0.20);
        gain.gain.setValueAtTime(peak, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);

        oscillator.connect(gain).connect(context.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.06);

        const delay = Math.max(0, (time - context.currentTime) * 1000);
        window.setTimeout(() => {
            beatLights.forEach((light, index) => {
                const active = index === beat;
                light.classList.toggle("is-current", active);
                if (active) {
                    light.classList.remove("is-pulse");
                    void light.offsetWidth;
                    light.classList.add("is-pulse");
                    window.setTimeout(() => light.classList.remove("is-pulse"), 150);
                }
            });
        }, delay);
    };

    const secondsPerPulse = () => 60 / snapBpm(bpmInput.value);

    const scheduler = () => {
        const context = getAudioContext();
        const signature = currentSignature();

        while (nextBeatTime < context.currentTime + scheduleAhead) {
            clickBeat(nextBeatTime, currentBeat, beatLevels[currentBeat]);
            nextBeatTime += secondsPerPulse();
            currentBeat = (currentBeat + 1) % signature.beats;
        }
    };

    const updateTransport = () => {
        playButton.disabled = running && !paused;
        pauseButton.disabled = !running || paused;
        stopButton.disabled = !running && !paused;
        status.textContent = paused ? "Paused" : running ? "Playing" : "Stopped";
        playButton.textContent = paused ? "Resume" : "Play";
    };

    function playMetronome() {
        try {
            const context = getAudioContext();
            if (!running) currentBeat = 0;
            running = true;
            paused = false;
            nextBeatTime = context.currentTime + 0.05;
            window.clearInterval(timerId);
            timerId = window.setInterval(scheduler, lookahead);
            scheduler();
            updateTransport();
        } catch (error) {
            status.textContent = error.message;
        }
    }

    function pauseMetronome() {
        if (!running) return;
        window.clearInterval(timerId);
        timerId = null;
        running = false;
        paused = true;
        beatLights.forEach(light => light.classList.remove("is-current"));
        updateTransport();
    }

    function stopMetronome() {
        window.clearInterval(timerId);
        timerId = null;
        running = false;
        paused = false;
        currentBeat = 0;
        beatLights.forEach(light => light.classList.remove("is-current"));
        updateTransport();
    }

    playButton.addEventListener("click", playMetronome);
    pauseButton.addEventListener("click", pauseMetronome);
    stopButton.addEventListener("click", stopMetronome);

    tapButton.addEventListener("click", () => {
        const now = performance.now();
        tapTimes = tapTimes.filter(time => now - time < 3000);
        tapTimes.push(now);

        if (tapTimes.length > 1) {
            const intervals = tapTimes.slice(1).map((time, index) => time - tapTimes[index]);
            const average = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
            setBpm(60000 / average);
        }

        tapButton.classList.add("is-tapped");
        window.setTimeout(() => tapButton.classList.remove("is-tapped"), 120);
    });

    metroVolume.addEventListener("input", () => {
        metroVolumeValue.textContent = `${metroVolume.value}%`;
    });

    window.addEventListener("beforeunload", () => {
        stopTuner();
        stopMetronome();
        if (audioContext) audioContext.close();
    });

    metroVolume.value = "90";
    metroVolumeValue.textContent = "90%";
    setBpm(90);
    renderSequencer(false);
    updateTransport();
})();
