# Robot Analyzer Frontend

A React + TypeScript + Three.js frontend for robot analysis and visualization.

## Features

- **Session Isolation**: Each user gets their own isolated robot session
- **URDF Loading**: Upload and visualize URDF robot models
- **Three.js Visualization**: 3D robot rendering with React Three Fiber
- **Real-time Updates**: WebSocket connection for live animation
- **Dynamics Computation**: Backend API for Pinocchio-based dynamics

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws/robot/
```

## Project Structure

```
src/
├── components/
│   ├── Layout/       # Layout components
│   ├── UI/           # UI components (buttons, panels, etc.)
│   └── Viewer/       # Three.js viewer components
├── hooks/            # Custom React hooks
├── services/         # API and WebSocket services
├── stores/           # Zustand state management
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── App.tsx           # Main app component
└── main.tsx          # Entry point
```

## Technology Stack

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Three.js**: 3D rendering
- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for React Three Fiber
- **urdf-loader**: URDF parsing and loading
- **Zustand**: State management
- **Axios**: HTTP client
- **JSZip**: ZIP file extraction

## Deployment

### GitHub Pages

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist` folder to GitHub Pages

### Environment Variables for Production

```env
VITE_API_URL=https://your-api-domain.com/api
VITE_WS_URL=wss://your-api-domain.com/ws/robot/
```

## License

MIT
