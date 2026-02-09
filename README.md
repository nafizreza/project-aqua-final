# 🌊 Project Aqua – Software Subteam Recruitment 2026

This repository contains my submission for the **Project Aqua 2026 Software Subteam Technical Evaluation**. The project covers ROV control logic, real-time telemetry monitoring, and a custom underwater waste detection ML pipeline using YOLO26.

---

## 🧠 Problem 1: ROV Control Mission

### Objective
Implement the control logic for a simulated underwater ROV using differential steering and a ballast-based depth control system

### Key Features
* **Dual Control Modes:**
  * Button-based movement controls
  * Joystick-based continuous control

* **Advanced Differential Drive:**
  * Tank-style steering algorithm with motor mixing
  * Sensitivity scaling (0.8 factor) for smooth, precise control
  * Hardware-safe clamping (-1023 to 1023 range protection)

* **Intelligent Depth Control System:**
  * **Trim Ballast Emulation:** Mimics real ROV dual-ballast systems in single-ballast simulation
  * **Auto-Hover Mode:** Deadzone (±50) automatically maintains 50% ballast for neutral buoyancy
  * **Proportional Mapping:** Linear joystick-to-ballast mapping (50%→100% descent, 50%→0% ascent)
  * **Error-Based Correction:** Continuous proportional adjustment using Kp=10 gain constant

### How to Run
1. Navigate to the `problem-1-control/` directory.
2. Open `index.html` in a web browser.
3. Toggle between **Button Control** and **Joystick Control** modes using the switch.

## 📡 Problem 2: ROV Telemetry Monitoring System

### Objective
Build a real-time telemetry monitoring system that simulates sensor data, exposes it through a backend API, and visualizes it on a live dashboard.

---

### Backend (Node.js — Native HTTP, No Frameworks)
* **Dataset Loading:** Loads `sensor_data_500.json` into memory on startup.
* **Telemetry Simulation:** Streams one telemetry record every 5 seconds to emulate real-time sensor updates.
* **In-Memory Storage:** Maintains a FIFO (First-In-First-Out) history buffer capped at 100 records.
* **Data Validation:** Validates all incoming telemetry fields (type, range, and required keys) and rejects invalid payloads using appropriate 400-series HTTP status codes.
* **API Endpoints:**
  * `POST /api/telemetry` — Accept and validate incoming telemetry data.
  * `GET /api/telemetry/latest` — Retrieve the most recent telemetry record.
  * `GET /api/telemetry/history?limit=N` — Retrieve the last **N** telemetry records (1–100).

---

### Frontend (Vanilla JavaScript)
* **Live Polling:** Fetches the latest telemetry from the backend every 5 seconds.
* **Real-Time Visualization:**
  * Displays **Depth, Pressure, Temperature, Direction,** and **Timestamp** in individual sensor panels.
  * **System Status Indicator (Pressure-Based):**
    * 🟢 **NORMAL** — Pressure < 1.8 bar
    * ⚠️ **WARNING** — Pressure between 1.8 and 2.0 bar
    * 🚨 **CRITICAL** — Pressure > 2.0 bar (triggers a full-screen visual alert)
  * **Graphical Analysis:** Plots **Depth vs. Time** using **Chart.js**, showing a rolling window of recent telemetry points.
* **Error Handling:** Displays a system error state when backend data is unavailable or network requests fail.

---

### How to Run

1. **Start the Backend Server**
   ```bash
   cd problem-2-telemetry/backend
   node server.js

2. **Launch Frontend**
   Open `problem-2-telemetry/frontend/index.html` in a web browser.

# 🤖 Problem 3: Underwater Waste Detection (YOLO26)

## 📋 Objective
The objective of this module is to design and train a computer vision pipeline capable of **detecting and localizing anthropogenic waste in underwater environments**. The system is built using the **YOLO26** architecture and is optimized for efficient inference, making it suitable for real-time or near–real-time deployment on underwater ROV platforms.

---

## 🔍 Model Details

### Target Classes
The model is trained to detect three categories of commonly observed underwater waste:
- **Bottle:** Plastic or glass beverage containers.
- **Polythene:** Plastic bags, wrappers, and thin-film waste.
- **Styrofoam:** Disposable food containers and insulation fragments.

These classes were selected due to their prevalence in marine pollution and their visual ambiguity in underwater conditions.

### Technical Workflow
1. **Data Preparation:**  
   Images were collected and manually annotated using **Roboflow**, ensuring consistent bounding-box labeling across all classes.

2. **Dataset Partitioning:**  
   The dataset was split prior to augmentation to minimize data leakage:
   - **Train:** – model learning  
   - **Validation:** – monitoring generalization during training  
   - **Test:** – final evaluation on unseen data  

3. **Model Architecture:**  
   Training was performed using **YOLO26 (Ultralytics)**, selected for its balance between detection accuracy and computational efficiency.

4. **Deployment Formats:**  
   The trained model was exported to:
   - **`.pt` (PyTorch)** for native inference
   - **`.onnx`** for cross-platform compatibility and hardware-accelerated inference

---

## 📊 Performance Graphs
The evaluation metrics stored in the `problem-3-ml/performanceGraphs` directory provide insight into both **model convergence** and **generalization behavior** throughout training.

- **mAP@0.5 vs Epoch:**  
  Indicates detection accuracy at a 50% Intersection over Union (IoU) threshold. A steady increase followed by saturation suggests effective learning and stable convergence.

- **mAP@0.5–0.95 vs Epoch:**  
  Represents a stricter evaluation averaged across multiple IoU thresholds. This metric reflects the model’s ability to localize objects precisely under varying detection strictness.

- **Box Loss vs Epoch:**  
  Measures how accurately the model predicts bounding box position and size. The decreasing trend indicates improved localization of underwater waste objects.

- **Class Loss vs Epoch:**  
  Reflects the model’s confidence in correctly classifying detected objects into the three waste categories. A consistently decreasing class loss suggests strong class separability.

- **Normalized Confusion Matrix:**  
  Visualizes true versus predicted class distributions, highlighting correct detections and minor misclassifications. This helps identify class-level confusion, particularly important in visually ambiguous underwater scenes.

These graphs collectively demonstrate stable training behavior and effective learning despite the challenges posed by underwater imagery.

---

## 📂 Directory Structure
- `/weights`  
  Contains trained model weights (`best.pt`) and the exported ONNX model (`best.onnx`).

- `/outputs`  
  Stores inference results on unseen test images using both deployment formats.

- `/performanceGraphs`  
  Includes all required evaluation plots such as mAP curves, loss curves, and the normalized confusion matrix.

- `roboflowDatasetLink.txt`  
  Contains the direct link to the annotated dataset hosted on Roboflow.

- `report.md`  
  Provides detailed discussion on dataset decisions, training methodology, performance evaluation, and **critical reasoning regarding marine environment limitations**.

> [!IMPORTANT]  
> To run inference or retrain the model, ensure required dependencies are installed:  
> `pip install ultralytics`

---

## 🛠️ ML Tech Stack
- **Language:** Python 3.x  
- **Framework:** Ultralytics YOLO26  
- **Annotation Platform:** Roboflow  
- **Core Libraries:** NumPy, Matplotlib, OpenCV  
