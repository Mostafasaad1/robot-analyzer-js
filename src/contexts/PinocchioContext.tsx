import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// @ts-ignore
import initPinocchio from 'pinocchio-js';
// @ts-ignore
import pinocchioWasmUrl from 'pinocchio-js/build/pinocchio.wasm?url';

// Define the shape of the context
interface PinocchioContextType {
    pin: any | null;       // The initialized WASM module
    isReady: boolean;      // True when WASM is fully loaded
    error: string | null;  // Any initialization errors
}

const PinocchioContext = createContext<PinocchioContextType>({
    pin: null,
    isReady: false,
    error: null,
});

export const usePinocchio = () => useContext(PinocchioContext);

interface ProviderProps {
    children: ReactNode;
}

export const PinocchioProvider: React.FC<ProviderProps> = ({ children }) => {
    const [pin, setPin] = useState<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadWasm = async () => {
            try {
                console.log("Loading Pinocchio WASM module...");
                // Pass locateFile to Emscripten so it knows where Vite bundled the WASM file
                const module = await initPinocchio({
                    locateFile: (path: string) => {
                        if (path.endsWith('.wasm')) {
                            return pinocchioWasmUrl;
                        }
                        return path;
                    }
                });
                if (isMounted) {
                    setPin(module);
                    setIsReady(true);
                    console.log("Pinocchio WASM module loaded successfully!");
                }
            } catch (err: any) {
                console.error("Failed to load Pinocchio WASM:", err);
                if (isMounted) {
                    setError(err.message || "Failed to load WASM");
                }
            }
        };

        loadWasm();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <PinocchioContext.Provider value={{ pin, isReady, error }}>
            {/* Show a loading state until WASM is ready to prevent sync crashes */}
            {!isReady && !error && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', background: '#1e1e2f', flexDirection: 'column' }}>
                    <h2>Loading Dynamics Engine...</h2>
                    <p>Initializing WebAssembly module</p>
                </div>
            )}
            {error && (
                <div style={{ color: 'red', padding: '20px', background: '#1e1e2f', height: '100vh' }}>
                    <h2>Failed to initialize dynamics engine</h2>
                    <p>{error}</p>
                </div>
            )}
            {isReady && children}
        </PinocchioContext.Provider>
    );
};
