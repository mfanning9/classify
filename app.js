// ============================================================
// TIMER STATE
// ============================================================

const state = {
  running: false,
  roundSeconds: 180,
  restSeconds: 60,
  phase: "rest",
  remaining: 60,
  timerId: null,
  audio: null
};


// ============================================================
// DEFAULT SOUND SETTINGS
// ============================================================

const defaults = {
  warning: {
    frequency: 1100,
    volume: 0.85,
    duration: 0.25,
    harmonic2: 0.40,
    harmonic3: 0.20,
    spacing: 280
  },

  end: {
    frequency: 700,
    volume: 0.95,
    duration: 0.30,
    harmonic2: 0.45,
    harmonic3: 0.20,
    spacing: 180
  }
};


// ============================================================
// LOAD SAVED SOUND SETTINGS
// ============================================================

const stored = localStorage.getItem(
  "roundTimerSoundSettings"
);

const sound = stored
  ? JSON.parse(stored)
  : JSON.parse(JSON.stringify(defaults));


// ============================================================
// DOM HELPER
// ============================================================

const $ = id => document.getElementById(id);


// ============================================================
// TIME FORMATTING
// ============================================================

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}


// ============================================================
// TIMER DISPLAY
// ============================================================

function render() {
  $("countdown").textContent =
    formatTime(state.remaining);

  // Timer is off
  if (!state.running) {
    $("phase").textContent = "READY";
    $("status").textContent = "TIMER OFF";

    $("timerDisplay").className =
      "timer-display";

    return;
  }

  // Current phase
  $("phase").textContent =
    state.phase === "round"
      ? "ROUND"
      : "REST";

  // Next phase
  $("status").textContent =
    state.phase === "round"
      ? `NEXT: REST • ${formatTime(state.restSeconds)}`
      : `NEXT: ROUND • ${formatTime(state.roundSeconds)}`;

  // Timer styling
  $("timerDisplay").className =
    `timer-display ${state.phase}${
      state.remaining <= 10
        ? " warning"
        : ""
    }`;
}


// ============================================================
// TOGGLE SELECTION
// ============================================================

function select(control, value) {
  document
    .querySelectorAll(
      `[data-control="${control}"]`
    )
    .forEach(button => {

      const selected =
        button.dataset.value === String(value);

      button.classList.toggle(
        "selected",
        selected
      );

      if (control === "power") {
        button.classList.toggle(
          "power-on",
          selected &&
          button.dataset.value === "on"
        );
      }
    });
}


// ============================================================
// AUDIO CONTEXT
// ============================================================

function audioContext() {
  if (!state.audio) {
    state.audio = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();
  }

  if (state.audio.state === "suspended") {
    state.audio.resume();
  }

  return state.audio;
}


// ============================================================
// BELL TONE
//
// Main tone
// + 2nd harmonic
// + 3rd harmonic
// ============================================================

function tone(
  frequency,
  duration,
  volume,
  harmonic2,
  harmonic3
) {
  const audio = audioContext();
  const now = audio.currentTime;

  const oscillators = [
    {
      multiplier: 1,
      level: 1
    },
    {
      multiplier: 2.01,
      level: harmonic2
    },
    {
      multiplier: 3.01,
      level: harmonic3
    }
  ];

  oscillators.forEach(
    ({ multiplier, level }) => {

      const oscillator =
        audio.createOscillator();

      const gain =
        audio.createGain();

      oscillator.type = "sine";

      oscillator.frequency.value =
        frequency * multiplier;

      oscillator.connect(gain);
      gain.connect(audio.destination);

      // Start almost silent
      gain.gain.setValueAtTime(
        0.0001,
        now
      );

      // Fast attack
      gain.gain.exponentialRampToValueAtTime(
        Math.max(
          0.0001,
          volume * level
        ),
        now + 0.008
      );

      // Decay
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + duration
      );

      oscillator.start(now);

      oscillator.stop(
        now + duration + 0.05
      );
    }
  );
}


// ============================================================
// 10 SECOND WARNING
//
// DING ... DING
// ============================================================

function warningBuzz() {
  const settings =
    sound.warning;

  tone(
    settings.frequency,
    settings.duration,
    settings.volume,
    settings.harmonic2,
    settings.harmonic3
  );

  setTimeout(() => {

    tone(
      settings.frequency,
      settings.duration,
      settings.volume,
      settings.harmonic2,
      settings.harmonic3
    );

  }, settings.spacing);
}


// ============================================================
// END OF ROUND / REST
//
// DING-DING-DING
// ============================================================

function endBuzz() {
  const settings =
    sound.end;

  for (let i = 0; i < 3; i++) {

    setTimeout(() => {

      tone(
        settings.frequency,
        settings.duration,
        settings.volume,
        settings.harmonic2,
        settings.harmonic3
      );

    }, i * settings.spacing);
  }
}


// ============================================================
// TIMER CONTROL
// ============================================================

function stopTimer() {
  if (state.timerId !== null) {

    clearInterval(
      state.timerId
    );

    state.timerId = null;
  }
}


// ============================================================
// START TIMER
// ============================================================

function startTimer() {
  stopTimer();

  state.running = true;
  state.phase = "rest";
  state.remaining =
    state.restSeconds;

  // User interaction enables audio
  audioContext();

  select(
    "power",
    "on"
  );

  render();

  state.timerId =
    setInterval(() => {

      state.remaining -= 1;


      // 10-second warning
      if (
        state.remaining === 10
      ) {
        warningBuzz();
      }


      // Phase complete
      if (
        state.remaining <= 0
      ) {

        endBuzz();


        // REST → ROUND
        if (
          state.phase === "rest"
        ) {

          state.phase = "round";

          state.remaining =
            state.roundSeconds;

        }


        // ROUND → REST
        else {

          state.phase = "rest";

          state.remaining =
            state.restSeconds;
        }
      }

      render();

    }, 1000);
}


// ============================================================
// TURN TIMER OFF
// ============================================================

function turnOff() {
  stopTimer();

  state.running = false;
  state.phase = "rest";
  state.remaining =
    state.restSeconds;

  select(
    "power",
    "off"
  );

  render();
}


// ============================================================
// RESET TIMER
// ============================================================

function reset() {
  stopTimer();

  state.running = false;
  state.phase = "rest";
  state.remaining =
    state.restSeconds;

  select(
    "power",
    "off"
  );

  select(
    "round",
    state.roundSeconds
  );

  select(
    "rest",
    state.restSeconds
  );

  render();
}


// ============================================================
// TIMER TOGGLE EVENTS
// ============================================================

document
  .querySelectorAll(
    ".toggle button"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const control =
          button.dataset.control;

        const value =
          button.dataset.value;


        // TIMER POWER
        if (
          control === "power"
        ) {

          if (
            value === "on"
          ) {
            startTimer();
          } else {
            turnOff();
          }

          return;
        }


        // ROUND LENGTH
        if (
          control === "round"
        ) {

          state.roundSeconds =
            Number(value);

          select(
            control,
            value
          );

          if (
            state.running &&
            state.phase === "round"
          ) {

            state.remaining =
              state.roundSeconds;
          }

          render();

          return;
        }


        // REST LENGTH
        if (
          control === "rest"
        ) {

          state.restSeconds =
            Number(value);

          select(
            control,
            value
          );

          if (
            state.running &&
            state.phase === "rest"
          ) {

            state.remaining =
              state.restSeconds;
          }

          render();
        }
      }
    );
  });


// ============================================================
// RESET BUTTON
// ============================================================

$("reset").addEventListener(
  "click",
  reset
);


// ============================================================
// SOUND SETTINGS
// ============================================================

function bind(
  id,
  settings,
  key,
  formatter
) {
  const input =
    document.getElementById(id);

  const output =
    document.getElementById(
      `${id}Value`
    );


  // Load saved value
  input.value =
    settings[key];


  // Display saved value
  output.textContent =
    formatter(settings[key]);


  // Save only when user changes slider
  input.addEventListener(
    "input",
    () => {

      settings[key] =
        Number(input.value);

      output.textContent =
        formatter(settings[key]);


      localStorage.setItem(
        "roundTimerSoundSettings",
        JSON.stringify(sound)
      );
    }
  );
}


// ============================================================
// WARNING SETTINGS
// ============================================================

bind(
  "warningFrequency",
  sound.warning,
  "frequency",
  value => `${value} Hz`
);

bind(
  "warningVolume",
  sound.warning,
  "volume",
  value => value.toFixed(2)
);

bind(
  "warningDuration",
  sound.warning,
  "duration",
  value => `${value.toFixed(2)} sec`
);

bind(
  "warningHarmonic2",
  sound.warning,
  "harmonic2",
  value => `${Math.round(value * 100)}%`
);

bind(
  "warningHarmonic3",
  sound.warning,
  "harmonic3",
  value => `${Math.round(value * 100)}%`
);

bind(
  "warningSpacing",
  sound.warning,
  "spacing",
  value => `${value} ms`
);


// ============================================================
// END SOUND SETTINGS
// ============================================================

bind(
  "endFrequency",
  sound.end,
  "frequency",
  value => `${value} Hz`
);

bind(
  "endVolume",
  sound.end,
  "volume",
  value => value.toFixed(2)
);

bind(
  "endDuration",
  sound.end,
  "duration",
  value => `${value.toFixed(2)} sec`
);

bind(
  "endHarmonic2",
  sound.end,
  "harmonic2",
  value => `${Math.round(value * 100)}%`
);

bind(
  "endHarmonic3",
  sound.end,
  "harmonic3",
  value => `${Math.round(value * 100)}%`
);

bind(
  "endSpacing",
  sound.end,
  "spacing",
  value => `${value} ms`
);


// ============================================================
// SOUND TEST BUTTONS
// ============================================================

$("testWarning").onclick =
  warningBuzz;


$("testEnd").onclick =
  endBuzz;


$("testSingle").onclick =
  () => {

    const settings =
      sound.end;

    tone(
      settings.frequency,
      settings.duration,
      settings.volume,
      settings.harmonic2,
      settings.harmonic3
    );
  };


// ============================================================
// SETTINGS PAGE
// ============================================================

$("settingsButton").onclick =
  () => {

    $("timerPage")
      .classList
      .remove("active");

    $("settingsPage")
      .classList
      .add("active");
  };


$("backButton").onclick =
  () => {

    $("settingsPage")
      .classList
      .remove("active");

    $("timerPage")
      .classList
      .add("active");
  };


// ============================================================
// RESTORE DEFAULT SOUND SETTINGS
// ============================================================

$("resetSoundButton").onclick =
  () => {

    Object.assign(
      sound.warning,
      defaults.warning
    );

    Object.assign(
      sound.end,
      defaults.end
    );


    localStorage.setItem(
      "roundTimerSoundSettings",
      JSON.stringify(sound)
    );


    // Reload so sliders display defaults
    location.reload();
  };


// ============================================================
// INITIAL TIMER SETTINGS
// ============================================================

select(
  "power",
  "off"
);

select(
  "round",
  "180"
);

select(
  "rest",
  "60"
);

render();