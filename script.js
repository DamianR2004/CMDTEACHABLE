(async () => {
  const URL = "my_model/";

  const sounds = {
    "Duimpie": new Audio("my_sounds/mars.mp3"),
    "Class 2": new Audio("my_sounds/snickers.mp3"),
    "Class 3": new Audio("my_sounds/milkyway.mp3"),
  };

  const targetElement = document.querySelector(".gesture-target");
  const webcamContainer = document.getElementById("webcam-container");
  const predictionText = document.getElementById("prediction");

  if (!targetElement) {
    console.warn("⚠️ No element with class .gesture-target found — animation disabled.");
  }

  let model, webcam, ctx, maxPredictions;
  const size = 128;       // smaller for mobile
  const flip = true;

  // Use WebGL backend for mobile performance
  await tf.setBackend("webgl");
  await tf.ready();

  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";
  model = await tmPose.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();
  console.log("✅ Pose model loaded!");

  // Setup webcam
  webcam = new tmPose.Webcam(size, size, flip);
  await webcam.setup();
  await webcam.play();
  webcamContainer.appendChild(webcam.canvas);
  ctx = webcam.canvas.getContext("2d");

  // Throttle predictions
  let lastPredTime = 0;
  const PREDICT_INTERVAL = 200; // 5 FPS
  let lastPrediction = "";
  let lastSoundTime = 0;
  const cooldown = 2500; // 2.5s per gesture

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

    // Get the highest probability class
    let top = prediction.reduce((a, b) => a.probability > b.probability ? a : b);

    if (top.probability > 0.9) {
      const now = Date.now();
      const className = top.className;
      predictionText.innerText = `Detected: ${className}`;

      // Only trigger if new gesture and cooldown passed
      if (className !== lastPrediction && now - lastSoundTime > cooldown) {
        triggerAnimation(className);
        lastPrediction = className;
        lastSoundTime = now;
      }
    }
  }

  function triggerAnimation(className) {
    if (!targetElement) return;

    // sanitize class name for CSS
    const safeName = className.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

    // remove previous classes
    targetElement.classList.remove(
      "active-duimpie",
      "active-class-2",
      "active-class-3"
    );
    targetElement.classList.add(`active-${safeName}`);
    console.log(`✨ Animation triggered: ${safeName}`);

    // play sound
    const sound = sounds[className];
    if (sound) {
      sound.currentTime = 0;
      sound.play();
    }
  }

  function drawPose() {
    if (webcam.canvas) {
      ctx.drawImage(webcam.canvas, 0, 0);

      // Optional: draw keypoints and skeleton for debugging
      // Comment out for better mobile performance
      /*
      const pose = model.estimatePose(webcam.canvas);
      if (pose) {
        tmPose.drawKeypoints(pose.keypoints, 0.5, ctx);
        tmPose.drawSkeleton(pose.keypoints, 0.5, ctx);
      }
      */
    }
  }

  window.requestAnimationFrame(loop);
})();
