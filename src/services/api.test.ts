import { apiService } from './api';

describe('APIService', () => {
    beforeEach(() => {
        // Reset WASM globals for isolated state
        apiService.pin = null;
        apiService.model = null;
        apiService.data = null;
    });

    const mockPin = {
        Data: jest.fn(() => ({ id: 'mock-data' })),
        rnea: jest.fn(() => new Float64Array([1, 2, 3])),
        aba: jest.fn(() => new Float64Array([0.1, 0.2, 0.3])),
        computeKineticEnergy: jest.fn(() => 15.0),
        computePotentialEnergy: jest.fn(() => 5.0),
        forwardKinematics: jest.fn(),
        computeJointJacobians: jest.fn(),
        getJointJacobian: jest.fn(() => new Float64Array(12).fill(0.5)), // 6x2 matrix flat
        crba: jest.fn(() => new Float64Array([1, 0, 0, 1])), // 2x2 identity flat
        centerOfMass: jest.fn(() => new Float64Array([0.1, 0.2, 0.3])),
        computeTotalMass: jest.fn(() => 10.0)
    };

    const mockModel = { id: 'mock-model', njoints: 3, nv: 2 };

    it('should throw Error if WASM not initialized', async () => {
        await expect(apiService.computeTorques([], [], [])).rejects.toThrow('WASM not initialized');
    });

    it('should initialize WASM successfully', () => {
        apiService.loadWasmModel(mockPin, mockModel);
        expect(apiService.pin).toBe(mockPin);
        expect(apiService.model).toBe(mockModel);
        expect(apiService.data).toBeDefined();
    });

    describe('with Initialized WASM', () => {
        beforeEach(() => {
            apiService.loadWasmModel(mockPin, mockModel);
        });

        it('should compute torques (RNEA)', async () => {
            const res = await apiService.computeTorques([0, 0], [0, 0], [0, 0]);
            expect(res.torques).toEqual([1, 2, 3]);
            expect(mockPin.rnea).toHaveBeenCalled();
        });

        it('should compute forward dynamics (ABA)', async () => {
            const res = await apiService.computeForwardDynamics([0, 0], [0, 0], [0, 0]);
            expect(res.accelerations).toEqual([0.1, 0.2, 0.3]);
            expect(mockPin.aba).toHaveBeenCalled();
        });

        it('should compute system energy', async () => {
            const res = await apiService.computeEnergy([0, 0], [0, 0]);
            expect(res.kinetic_energy).toBe(15.0);
            expect(res.potential_energy).toBe(5.0);
            expect(res.total_energy).toBe(20.0);
        });

        it('should compute generic Center of Mass', async () => {
            const res = await apiService.computeCenterOfMass([0, 0]);
            expect(res.com).toEqual([0.1, 0.2, 0.3]);
            expect(res.total_mass).toBe(10.0);
        });

        it('should shape the returned flat Jacobian Array into a 2D matrix', async () => {
            const res = await apiService.computeJacobian([0, 0]);
            // model.nv = 2, so columns = 2. Matrix is 6 rows by 2 columns.
            expect(res.jacobian.length).toBe(6);
            expect(res.jacobian[0].length).toBe(2);
            expect(res.jacobian[0][0]).toBe(0.5); // Derived from our flat array mock
        });

        it('should reshape the flat CRBA array into a 2D mass matrix', async () => {
            const res = await apiService.computeMassMatrix([0, 0]);
            // 2x2 mock M flat is [1, 0, 0, 1] (column major, but it's symmetric identity)
            expect(res.mass_matrix.length).toBe(2);
            expect(res.mass_matrix[0].length).toBe(2);
            expect(res.mass_matrix[0][0]).toBe(1);
            expect(res.mass_matrix[0][1]).toBe(0);
            expect(res.mass_matrix[1][0]).toBe(0);
            expect(res.mass_matrix[1][1]).toBe(1);
        });
    });
});
