// --- define your sounds FIRST ---
const sounds = {
  "Open": new Audio("my_sounds/loto.mp3"),
  "Close": new Audio("my_sounds/medi.mp3"),
  "Class 8": new Audio("my_sounds/party.mp3"),
  "Idle": null
};

// --- unlock audio after first tap ---
document.addEventListener("click", unlockAudio, { once: true });

function unlockAudio() {
  Object.values(sounds).forEach(sound => {
    if (sound) {
      sound.play().then(() => {
        sound.pause();
        sound.currentTime = 0;
      }).catch(() => {});
    }
  });
  console.log("🔓 Audio unlocked for mobile!");
}

(async () => {
  const URL = "my_model/";

  const targetElement = document.querySelector(".gesture-target");
  const webcamContainer = document.getElementById("webcam-container");
  const predictionText = document.getElementById("prediction");

  if (!targetElement) {
    console.warn("⚠️ No element with class .gesture-target found — animation disabled.");
  }

  let model, webcam, ctx, maxPredictions;
  const size = 128;
  const flip = true;

  await tf.setBackend("webgl");
  await tf.ready();

  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";
  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
  console.log("✅ Pose model loaded!");

  // --- wait for user interaction before starting camera (important on iPhone) ---
  document.addEventListener("click", async function startCamera() {
    document.removeEventListener("click", startCamera);

    webcam = new tmPose.Webcam(size, size, flip);
    await webcam.setup();
    await webcam.play();
    webcamContainer.appendChild(webcam.canvas);
    ctx = webcam.canvas.getContext("2d");
    window.requestAnimationFrame(loop);
  });

  let lastPredTime = 0;
  const PREDICT_INTERVAL = 200;
  let lastPrediction = "";
  let lastSoundTime = 0;
  const cooldown = 2500;

  async function loop(timestamp) {
    webcam.update();
    if (timestamp - lastPredTime > PREDICT_INTERVAL) {
      await predict();
      lastPredTime = timestamp;
    }
    drawPose();
    window.requestAnimationFrame(loop);
  }

  async function predict() {
    const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
    const prediction = await model.predict(posenetOutput);

    let top = prediction.reduce((a, b) => a.probability > b.probability ? a : b);
    const className = top.className;
    const prob = top.probability;
    const effectiveClass = prob < 0.9 ? "Idle" : className;

    predictionText.innerText = `Detected: ${effectiveClass}`;

    if (effectiveClass !== "Idle" && effectiveClass !== lastPrediction && Date.now() - lastSoundTime > cooldown) {
      triggerAnimation(effectiveClass);
      lastPrediction = effectiveClass;
      lastSoundTime = Date.now();
    }

    if (effectiveClass === "Idle") {
      lastPrediction = "Idle";
    }
  }

  function triggerAnimation(className) {
    if (!targetElement) return;

    const safeName = className.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    targetElement.classList.remove("active-open", "active-close", "active-class-8");
    targetElement.classList.add(`active-${safeName}`);

    const sound = sounds[className];
    if (sound) {
      sound.currentTime = 0;
      sound.play();
    }
  }

  function drawPose() {
    if (webcam.canvas) ctx.drawImage(webcam.canvas, 0, 0);
  }
})();
