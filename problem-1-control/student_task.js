/* 
 * Aqua Software Recruitment Task
 * 
 * Your Goal: Implement the control logic for the ROV.
 * 
 * CONTROL LOGIC EXPLAINED:
 * 1. The ROV has two thrusters: Left and Right.
 *    - Use `leftMotorDriver(speed)` and `rightMotorDriver(speed)` to control them.
 *    - speed range: -1023 (Reverse) to 1023 (Forward).
 * 
 * 2. Depth is controlled by a Ballast Tank.
 *    - Use `injectorPump(speed)` to add water
 *    - Use `ejectorPump(speed)` to remove water
 *    - speed range: 0 to 1023.
 * 
 * GLOBAL VARIABLES:
 * - joystickLeft (Object): { x, y } - range -1024 to 1024
 * - joystickRight (Object): { x, y } - range -1024 to 1024
 */


/* 
 * TASK 1: BUTTON CONTROLS
 * Implement these functions to control the hardware.
 * Use valid values (e.g. 1023, 0, -1023) for the drivers.
 */

const MOVE_SPEED = 800;        // forward/backward power
const TURN_SPEED = 500;        // turning power
const PUMP_SPEED = 100;    // ballast pump power 

function moveForward() {
    leftMotorDriver(MOVE_SPEED);
    rightMotorDriver(MOVE_SPEED);
}

function moveBackward() {
    leftMotorDriver(-MOVE_SPEED);
    rightMotorDriver(-MOVE_SPEED);
}

function turnLeft() {
    leftMotorDriver(-TURN_SPEED);
    rightMotorDriver(TURN_SPEED);
}

function turnRight() {
    leftMotorDriver(TURN_SPEED);
    rightMotorDriver(-TURN_SPEED);
}

function ascend() {
    ejectorPump(PUMP_SPEED);
    injectorPump(0);
}

function descend() {
    injectorPump(PUMP_SPEED);
    ejectorPump(0);
}




/* 
 * TASK 2: JOYSTICK CONTROL
 * This function is called every frame when in Joystick Mode.
 * 
 * INPUTS:
 *  - joystickLeft.y: Forward/Backward (-1024 to 1024). Up is Positive (Forward).
 *  - joystickLeft.x: Turn Left/Right (-1024 to 1024).
 *  - joystickRight.y: Depth Control (-1024 to 1024).
 * 
 * TASK:
 *  - Calculate appropriate motor values based on joystick inputs.
 *  - Map outputs to -1023 to 1023.
 */
function handleJoystickControl() {

    //Getting the joystick inputs
    const forwardInput = joystickLeft.y;   
    const turnInput = joystickLeft.x;      
    const depthInput = joystickRight.y;

    //Calculating appropriate motor values based on joystick inputs
    const SCALE = 0.8; //.8 for smoother control and avoid always using maximum power :)
    let leftMotorSpeed = (forwardInput + turnInput) * SCALE;
    let rightMotorSpeed = (forwardInput - turnInput) * SCALE;

    // Clamp to valid range
    leftMotorSpeed = Math.max(-1023, Math.min(1023, leftMotorSpeed));
    rightMotorSpeed = Math.max(-1023, Math.min(1023, rightMotorSpeed));
    
    // Apply motor speeds
    leftMotorDriver(Math.round(leftMotorSpeed));
    rightMotorDriver(Math.round(rightMotorSpeed));

    /*
    * Tried to mimic trim ballast functionality :)
    * When joystick is within ±DEADZONE range, ROV automatically adjusts 50% ballast for stable depth maintenance.
    */
    const DEADZONE = 50;
    const Kp=10; // how aggressively we try to correct ballast error

    if (depthInput >= -DEADZONE && depthInput <= DEADZONE) {
        // Within deadzone: maintaining 50% ballast (neutral buoyancy)
        const targetBallast = 50;
        const currentBallast = rover.ballast; // Default if not available
        
        if (currentBallast < targetBallast) {
            // Need to inject water to increase ballast
            injectorPump(Math.min(1023, (targetBallast - currentBallast) * 10));
            ejectorPump(0);
        } 
        else if (currentBallast > targetBallast) {
            // Need to eject water to decrease ballast
            ejectorPump(Math.min(1023, (currentBallast - targetBallast) * 10));
            injectorPump(0);
        } 
        else {
            // Already at 50%
            injectorPump(0);
            ejectorPump(0);
        }
    }

    else if (depthInput > DEADZONE) {
        // Above deadzone (+DEADZONE to +1024): map to 50% to 100% ballast
        // Normalize input from [DEADZONE, 1024] to [0, 1]
        const normalized = (depthInput - DEADZONE) / (1024 - DEADZONE);

        const targetBallast = 50 + (normalized * 50);
        const currentBallast = rover.ballast;
        
        // Only inject to reach target ballast
        if (currentBallast < targetBallast) {
            injectorPump(Math.min(1023, (targetBallast - currentBallast) * Kp));
            ejectorPump(0);
        } else if (currentBallast > targetBallast) {
            ejectorPump(Math.min(1023, (currentBallast - targetBallast) * Kp));
            injectorPump(0);
        } else {
            injectorPump(0);
            ejectorPump(0);
        }
    }

    else if (depthInput < -DEADZONE) {
        // Below deadzone (-DEADZONE to -1024): map to 50% to 0% ballast
        // Normalize input from [-1024, -DEADZONE] to [0, 1]
        const normalized = (Math.abs(depthInput) - DEADZONE) / (1024 - DEADZONE);
        const targetBallast = 50 - (normalized * 50);
        const currentBallast = rover.ballast;
        
        // Only eject to reach target ballast
        if (currentBallast > targetBallast) {
            ejectorPump(Math.min(1023, (currentBallast - targetBallast) * Kp));
            injectorPump(0);
        } else if (currentBallast < targetBallast) {
            injectorPump(Math.min(1023, (targetBallast - currentBallast) * Kp));
            ejectorPump(0);
        } else {
            injectorPump(0);
            ejectorPump(0);
        }


}







// --- EVENT LISTENERS (DO NOT REMOVE) ---
function stop() {
    leftMotorDriver(0);
    rightMotorDriver(0);
    injectorPump(0);
    ejectorPump(0);
}

if (document.getElementById('btn-forward')) {
    const attachButton = (id, startHandler) => {
        const btn = document.getElementById(id);
        if(!btn) return;
        btn.addEventListener('mousedown', startHandler);
        btn.addEventListener('mouseup', stop);
        btn.addEventListener('mouseleave', stop);
    };

    attachButton('btn-forward', moveForward);
    attachButton('btn-backward', moveBackward);
    attachButton('btn-left', turnLeft);
    attachButton('btn-right', turnRight);
    attachButton('btn-ascend', ascend);
    attachButton('btn-descend', descend);
}

}