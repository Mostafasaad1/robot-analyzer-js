/**
 * Main application layout component
 */

function AppLayout() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>Robot Analyzer</h1>
      </header>
      <main className="app-main">
        <div className="placeholder">
          <h2>Welcome to Robot Analyzer</h2>
          <p>Upload a URDF file to get started</p>
        </div>
      </main>
    </div>
  );
}

export default AppLayout;
