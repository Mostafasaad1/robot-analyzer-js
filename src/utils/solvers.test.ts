import { solveInverseKinematics } from './solvers';

describe('Inverse Kinematics Solver (DLS)', () => {
    it('should converge to the target position when achievable', () => {
        // Mock model and data
        const model = {
            njoints: 3, // World + 2 joints
            nv: 2, // 2 degrees of freedom
        };
        const data = {};

        // Mock target and initial positions
        const targetPosition = [1.0, 0.0, 0.0];
        const initialPositions = [0.1, -0.1];

        // Simple 2DOF planar arm mock (L1 = 0.5, L2 = 0.5)
        // End effector position: x = 0.5 * cos(q0) + 0.5 * cos(q0 + q1)
        //                        y = 0.5 * sin(q0) + 0.5 * sin(q0 + q1)
        //                        z = 0
        //
        // Jacobian: dx/dq0 = -0.5 * sin(q0) - 0.5 * sin(q0 + q1)
        //           dx/dq1 = -0.5 * sin(q0 + q1)
        //           dy/dq0 =  0.5 * cos(q0) + 0.5 * cos(q0 + q1)
        //           dy/dq1 =  0.5 * cos(q0 + q1)
        //           dz/dq0 = 0, dz/dq1 = 0

        let currentQ = new Float64Array(initialPositions);

        const pin = {
            forwardKinematics: jest.fn((_m, _d, q) => {
                currentQ = new Float64Array(q);
            }),
            updateFramePlacements: jest.fn(),
            getJointPlacement: jest.fn(() => {
                const q0 = currentQ[0];
                const q1 = currentQ[1];
                const x = 0.5 * Math.cos(q0) + 0.5 * Math.cos(q0 + q1);
                const y = 0.5 * Math.sin(q0) + 0.5 * Math.sin(q0 + q1);
                const z = 0.0;
                return { translation: new Float64Array([x, y, z]) };
            }),
            computeJointJacobians: jest.fn(),
            getJointJacobian: jest.fn(() => {
                const q0 = currentQ[0];
                const q1 = currentQ[1];
                // J is 6 x nv (6 x 2). We just need top 3 rows (translation).
                // Flat array goes column-major or row-major based on C++ bindings, 
                // in our wrapper logic, we iterate: `row.push(J_flat[c * 6 + r])`
                // Meaning J_flat is stored column by column.
                // Let's populate the 12 elements (6 rows, 2 columns).
                const J_flat = new Float64Array(12);

                // Column 0 (dq0)
                J_flat[0] = -0.5 * Math.sin(q0) - 0.5 * Math.sin(q0 + q1); // dx/dq0
                J_flat[1] = 0.5 * Math.cos(q0) + 0.5 * Math.cos(q0 + q1);  // dy/dq0
                J_flat[2] = 0.0; // dz/dq0
                // ... angular velocity terms can be 0 for this mock

                // Column 1 (dq1)
                J_flat[6] = -0.5 * Math.sin(q0 + q1); // dx/dq1
                J_flat[7] = 0.5 * Math.cos(q0 + q1);  // dy/dq1
                J_flat[8] = 0.0; // dz/dq1

                return J_flat;
            })
        };

        const result = solveInverseKinematics(
            pin,
            model,
            data,
            targetPosition,
            initialPositions,
            200 // Increased iterations to allow DLS to settle near singularity
        );

        // Verify it converged successfully
        expect(result.converged).toBe(true);
        expect(result.final_error).toBeLessThan(1e-4);

        // Instead of checking exact joint angles (which is unstable near singularities 
        // or has multiple solutions), we calculate the forward kinematics of the result
        // and verify the end effector matches the target position.
        const finalQ0 = result.positions[0];
        const finalQ1 = result.positions[1];

        const finalX = 0.5 * Math.cos(finalQ0) + 0.5 * Math.cos(finalQ0 + finalQ1);
        const finalY = 0.5 * Math.sin(finalQ0) + 0.5 * Math.sin(finalQ0 + finalQ1);
        const finalZ = 0.0;

        expect(finalX).toBeCloseTo(targetPosition[0], 3);
        expect(finalY).toBeCloseTo(targetPosition[1], 3);
        expect(finalZ).toBeCloseTo(targetPosition[2], 3);
    });

    it('should not hard crash if unachievable but should iterate up to maxIterations', () => {
        const model = { njoints: 3, nv: 2 };
        const data = {};
        const targetPosition = [10.0, 0.0, 0.0]; // Way out of bounds for an arm length 1.0!
        const initialPositions = [0.1, -0.1];

        let currentQ = new Float64Array(initialPositions);

        const pin = {
            forwardKinematics: jest.fn((_m, _d, q) => { currentQ = new Float64Array(q); }),
            updateFramePlacements: jest.fn(),
            getJointPlacement: jest.fn(() => {
                const q0 = currentQ[0];
                const q1 = currentQ[1];
                const x = 0.5 * Math.cos(q0) + 0.5 * Math.cos(q0 + q1);
                const y = 0.5 * Math.sin(q0) + 0.5 * Math.sin(q0 + q1);
                return { translation: new Float64Array([x, y, 0]) };
            }),
            computeJointJacobians: jest.fn(),
            getJointJacobian: jest.fn(() => {
                const q0 = currentQ[0];
                const q1 = currentQ[1];
                const J_flat = new Float64Array(12);
                J_flat[0] = -0.5 * Math.sin(q0) - 0.5 * Math.sin(q0 + q1);
                J_flat[1] = 0.5 * Math.cos(q0) + 0.5 * Math.cos(q0 + q1);
                J_flat[6] = -0.5 * Math.sin(q0 + q1);
                J_flat[7] = 0.5 * Math.cos(q0 + q1);
                return J_flat;
            })
        };

        const result = solveInverseKinematics(
            pin,
            model,
            data,
            targetPosition,
            initialPositions,
            50
        );

        expect(result.converged).toBe(false);
        expect(result.iterations).toBe(50);
        // Even if it didn't reach the target, the DLS should not blow up to Infinity or NaN
        expect(result.positions[0]).not.toBeNaN();
        expect(result.positions[1]).not.toBeNaN();
    });
});

describe('Max Torque Sampler', () => {
    it('should properly sample over the workspace and return maximum absolute torques', () => {
        const pin = {
            computeGeneralizedGravity: jest.fn((_m, _d, q) => {
                // Return dummy torque values based on position
                // e.g. T = q * 10
                return new Float64Array([q[0] * 10, -q[1] * 5]);
            })
        };

        const model = { njoints: 3, nv: 2 };
        const data = {};
        const positions = [1.0, 1.0];
        const robotInfo = {
            name: 'test',
            jointNames: ['J1', 'J2'],
            jointCount: 2,
            dof: 2,
            lowerLimits: [0, -2],
            upperLimits: [2, 2],
            neutralConfig: [0, 0]
        };

        const { sampleMaxTorques } = require('./solvers');
        const result = sampleMaxTorques(pin, model, data, positions, robotInfo);

        // Current torques for q=[1.0, 1.0] should be [10, -5]
        expect(result.current_gravity_torques).toEqual([10, -5]);

        // Limits are [0, 2] for J1 -> max gravity torque = 2 * 10 = 20
        // Limits are [-2, 2] for J2 -> max abs gravity torque = |-2 * 5| or |2 * 5| = 10
        // Monte carlo simulation will approach these values
        expect(result.max_torques[0]).toBeCloseTo(20, -1); // Check magnitude near 20
        expect(result.max_torques[1]).toBeCloseTo(10, -1); // Check magnitude near 10
        expect(result.joint_names).toEqual(['J1', 'J2']);
    });
});
