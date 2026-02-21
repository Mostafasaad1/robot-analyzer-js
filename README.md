# Robot Analyzer (WebAssembly Edition)

A high-performance, offline-first React + TypeScript web application for robotic kinematics and dynamics analysis. 
This tool visualizes URDF models in 3D and computes complex robotics math **entirely in the browser** using a WebAssembly port of the [Pinocchio](https://github.com/stack-of-tasks/pinocchio) rigid body dynamics library [`pinocchio-js`](https://github.com/Mostafasaad1/pinocchio-js).

<!-- ![Robot Analyzer Demo](https://raw.githubusercontent.com/stack-of-tasks/pinocchio/master/doc/images/pinocchio-logo-large.png) -->
[Robot-analyzer.io](https://mostafasaad1.github.io/robot-analyzer-js/)
> **AI-Assisted Development:** Over 70% of this **frontend** implementation was built using AI agents (specifically **Gemini 3 Pro** and **Kimi 2.5**). I only drove the architectural decisions, provided guidance, and assisted throughout the process.

## 🚀 Features

* **Zero-Backend Architecture:** No server required. All computations and parsing happen locally on the client.
* **WASM Pinocchio Integration:** Lightning-fast C++ dynamics algorithms compiled to WebAssembly using [`pinocchio-js`](https://github.com/Mostafasaad1/pinocchio-js).
* **Interactive 3D Viewer:** Built with `Three.js` and `@react-three/fiber` for smooth, 60FPS dragging and rendering.
* **Live Kinematics & Dynamics:**
  * **Inverse/Forward Kinematics:** End-effector targeting via Damped Least Squares (DLS).
  * **RNEA (Recursive Newton-Euler Algorithm):** Compute joint torques for given positions/velocities/accelerations.
  * **ABA (Articulated-Body Algorithm):** Compute forward dynamics accelerations.
  * **CRBA (Composite-Rigid-Body Algorithm):** Compute the joint space inertia (mass) matrix.
  * **Jacobian & Center of Mass:** Live calculation matrices.
* **Monte Carlo Sampling:** Estimates maximum required gravity torques by sampling the entire joint workspace.
* **Local URDF Parsing:** Drag-and-drop or upload URDF files and their associated meshes (`.dae`, `.stl`, `.obj`) directly into the browser.

## 🛠️ Technology Stack

* **Frontend:** React 18, TypeScript, Vite
* **3D Engine:** Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
* **Robotics Core:** `pinocchio-js` (Pinocchio WASM bindings), `urdf-loader`
* **State Management:** Zustand (with transient subscriptions to bypass React re-renders)
* **Testing:** Jest + JSDOM

## 💻 Getting Started

### Prerequisites

* Node.js 18+
* npm or yarn

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:5173`. 
Upload a URDF file and matching STL/DAE meshes to begin analyzing.

## 🧪 Testing

The mathematical integrity of the kinematics solvers and state stores are validated via Jest.

```bash
# Run unit tests
npm run test
```

## 📦 Building for Production

This application uses highly-optimized Vite chunking to separate large vendor binaries (like Three.js and Pinocchio WASM) from the main application logic, drastically reducing initial load times.

```bash
npm run build
```

The output in the `dist/` directory can be deployed statically to any web host (GitHub Pages, Netlify, Vercel) without needing a Node.js runtime or backend server.

## 📄 License

This project is licensed under the MIT License.
