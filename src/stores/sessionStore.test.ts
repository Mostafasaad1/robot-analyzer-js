const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

import { useSessionStore, selectComputedDataSummary } from './sessionStore';

describe('useSessionStore', () => {
    // Clear the store before each test
    beforeEach(() => {
        useSessionStore.getState().clearSession();
    });

    const mockRobotInfo = {
        name: 'TestRobot',
        jointNames: ['J1', 'J2'],
        jointCount: 2,
        dof: 2,
        lowerLimits: [-1, -1],
        upperLimits: [1, 1],
        neutralConfig: [0, 0]
    };

    it('should initialize with an empty session', () => {
        const state = useSessionStore.getState();
        expect(state.sessionId).toBeNull();
        expect(state.robotInfo).toBeNull();
        expect(state.jointPositions).toEqual([]);
        expect(state.jointVelocities).toEqual([]);
        expect(state.isAnimating).toBe(false);
    });

    it('should correctly set a new session', () => {
        useSessionStore.getState().setSession('session-123', mockRobotInfo);

        const state = useSessionStore.getState();
        expect(state.sessionId).toBe('session-123');
        expect(state.robotInfo).toEqual(mockRobotInfo);
        expect(state.jointPositions).toEqual([0, 0]); // From neutral config
        expect(state.jointVelocities).toEqual([0, 0]); // Should init to zeroes
    });

    it('should update joint positions and velocities', () => {
        useSessionStore.getState().setSession('session-123', mockRobotInfo);

        useSessionStore.getState().setJointPositions([0.5, 0.5]);
        useSessionStore.getState().setJointVelocities([1.0, -1.0]);

        const state = useSessionStore.getState();
        expect(state.jointPositions).toEqual([0.5, 0.5]);
        expect(state.jointVelocities).toEqual([1.0, -1.0]);
    });

    it('should correctly store computed data and mark it fresh', () => {
        useSessionStore.getState().setSession('session-123', mockRobotInfo);

        const mockEnergy = { kinetic: 10, potential: 5 };
        useSessionStore.getState().updateComputedData({ energy: mockEnergy });

        const state = useSessionStore.getState();
        expect(state.computedData.energy).toEqual(mockEnergy);
        expect(state.computedData.lastComputed).toBeDefined();

        // Selectors
        const summary = selectComputedDataSummary(state);
        expect(summary.energy).toEqual(mockEnergy);
        expect(summary.isFresh).toBe(true);
    });

    it('should clear everything when clearSession is called', () => {
        useSessionStore.getState().setSession('session-123', mockRobotInfo);
        useSessionStore.getState().updateComputedData({ torques: [1, 2] });

        useSessionStore.getState().clearSession();

        const state = useSessionStore.getState();
        expect(state.sessionId).toBeNull();
        expect(state.robotInfo).toBeNull();
        expect(state.computedData).toEqual({});
    });
});
