class Ball {
    constructor(x, y, radius, color, number = null, isStriped = false) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.number = number;
        this.isStriped = isStriped;
        this.velocity = { x: 0, y: 0 };
        this.mass = 1;
        this.friction = 0.99;
        this.rotationAngle = 0;
        this.spinSpeed = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAngle);

        // Draw main ball circle
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        if (this.isStriped) {
            // Draw white stripes
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, -Math.PI/3, Math.PI/3);
            ctx.arc(0, 0, this.radius, 2*Math.PI/3, 4*Math.PI/3);
            ctx.fillStyle = 'white';
            ctx.fill();
        }

        // Draw shine effect
        ctx.beginPath();
        ctx.arc(-this.radius/3, -this.radius/3, this.radius/3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // Draw ball number
        if (this.number !== null) {
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = this.isStriped ? this.color : 'white';
            ctx.fill();
            
            ctx.fillStyle = this.isStriped ? 'white' : 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `${this.radius}px Arial`;
            ctx.fillText(this.number.toString(), 0, 0);
        }

        ctx.restore();
    }

    update() {
        // Update position based on velocity
        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Calculate rotation based on movement
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        this.spinSpeed = speed / this.radius; // Rotation speed based on linear velocity
        this.rotationAngle += this.spinSpeed;

        // Apply friction
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;

        // Stop very small movements
        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.01) this.velocity.y = 0;
    }
}

class PoolGame {
    constructor() {
        this.canvas = document.getElementById('poolCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 400;

        this.balls = [];
        this.cueBall = null;
        this.powerBar = document.getElementById('powerBar');
        this.power = 0;
        this.maxPower = 100;
        this.powerStep = 5; // Amount to change power by with arrow keys
        this.isChargingPower = false;
        this.aimAngle = 0;
        this.mouseX = null;
        this.mouseY = null;

        // Key states
        this.keyStates = {
            ArrowUp: false,
            ArrowDown: false,
            Space: false
        };

        // Initialize sound effects
        this.collisionSound = new Audio('sounds/ballscollide.wav');
        this.pocketSound = new Audio('sounds/hole.wav');
        this.sideSound = new Audio('sounds/side.wav');
        this.strikeSound = new Audio('sounds/strike.wav');
        
        // Set volume levels
        this.collisionSound.volume = 0.3;
        this.pocketSound.volume = 0.5;
        this.sideSound.volume = 0.4;
        this.strikeSound.volume = 0.4;
        
        this.lastCollisionTime = 0;

        // Game state
        this.currentPlayer = 1;
        this.player1Score = 0;
        this.player2Score = 0;
        this.player1Type = null; // 'solid' or 'stripe'
        this.player2Type = null;
        this.gameStarted = false;

        // Add pockets
        this.pockets = [
            { x: 0, y: 0 },                    // Top-left
            { x: this.canvas.width / 2, y: 0 },  // Top-middle
            { x: this.canvas.width, y: 0 },    // Top-right
            { x: 0, y: this.canvas.height },   // Bottom-left
            { x: this.canvas.width / 2, y: this.canvas.height }, // Bottom-middle
            { x: this.canvas.width, y: this.canvas.height }    // Bottom-right
        ];
        this.pocketRadius = 20;

        this.robotPrediction = null;
        this.isShowingPrediction = false;

        this.canvasOffsetX = null;
        this.canvasOffsetY = null;

        this.setupGame();
        this.setupEventListeners();
        this.gameLoop();
    }

    setupGame() {
        // Clear existing balls
        this.balls = [];
        this.cueBall = null;

        // Reset game state
        this.power = 0;
        this.isChargingPower = false;
        this.currentPlayer = 1;
        this.player1Score = 0;
        this.player2Score = 0;
        this.player1Type = null;
        this.player2Type = null;
        this.gameStarted = false;
        this.updateScoreDisplay();
        this.updateTurnDisplay();

        // Create cue ball
        this.cueBall = new Ball(200, this.canvas.height / 2, 10, 'white', 0);
        this.balls.push(this.cueBall);

        // Create colored balls in triangle formation
        const ballRadius = 10;
        const startX = 600;
        const startY = this.canvas.height / 2;
        const colors = [
            'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'maroon',
            'black', 'yellow', 'blue', 'red', 'purple', 'orange', 'green', 'maroon'
        ];
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        let ballIndex = 0;
        
        // Position balls in a triangle
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col <= row; col++) {
                if (ballIndex < colors.length) {
                    const x = startX + (row * 2 * ballRadius * Math.cos(Math.PI / 6));
                    const y = startY + ((col - row/2) * 2 * ballRadius);
                    const isStriped = numbers[ballIndex] > 8;
                    this.balls.push(new Ball(x, y, ballRadius, colors[ballIndex], numbers[ballIndex], isStriped));
                    ballIndex++;
                }
            }
        }

        this.updatePowerBar();
    }

    updateScoreDisplay() {
        document.getElementById('player1Score').textContent = this.player1Score;
        document.getElementById('player2Score').textContent = this.player2Score;
    }

    updateTurnDisplay() {
        const turnText = `Player ${this.currentPlayer}'s Turn`;
        document.getElementById('currentTurn').textContent = turnText;
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.updateTurnDisplay();
    }

    handlePocketedBall(ball) {
        if (ball === this.cueBall) {
            // Scratch - switch players and respawn cue ball
            ball.x = 200;
            ball.y = this.canvas.height / 2;
            ball.velocity = { x: 0, y: 0 };
            this.switchPlayer();
            return true;
        }

        // First ball pocketed determines player types
        if (!this.gameStarted && ball.number !== 8) {
            this.gameStarted = true;
            if (ball.isStriped) {
                this.player1Type = 'solid';
                this.player2Type = 'stripe';
            } else {
                this.player1Type = 'stripe';
                this.player2Type = 'solid';
            }
        }

        // Handle scoring
        if (ball.number === 8) {
            // Game over logic
            alert(`Game Over! Player ${this.currentPlayer} wins!`);
            this.setupGame();
            return false;
        }

        const currentPlayerType = this.currentPlayer === 1 ? this.player1Type : this.player2Type;
        if (currentPlayerType === null ||
            (ball.isStriped && currentPlayerType === 'stripe') ||
            (!ball.isStriped && currentPlayerType === 'solid')) {
            // Correct ball type pocketed
            if (this.currentPlayer === 1) {
                this.player1Score++;
            } else {
                this.player2Score++;
            }
            this.updateScoreDisplay();
            return false;
        } else {
            // Wrong ball type pocketed
            this.switchPlayer();
            return false;
        }
    }

    checkCollisions() {
        // Check for pocketed balls
        this.balls = this.balls.filter(ball => {
            // Check if ball is in any pocket
            for (const pocket of this.pockets) {
                const dx = ball.x - pocket.x;
                const dy = ball.y - pocket.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.pocketRadius) {
                    // Play pocket sound
                    this.pocketSound.currentTime = 0;
                    this.pocketSound.play().catch(e => console.log('Error playing pocket sound:', e));
                    return this.handlePocketedBall(ball);
                }
            }
            return true;
        });

        // Ball to ball collisions
        for (let i = 0; i < this.balls.length; i++) {
            const ball1 = this.balls[i];

            // Wall collisions
            if (ball1.x - ball1.radius < 0 || ball1.x + ball1.radius > this.canvas.width) {
                ball1.velocity.x *= -1;
                ball1.x = ball1.x - ball1.radius < 0 ? ball1.radius : this.canvas.width - ball1.radius;
                // Play side collision sound
                this.sideSound.currentTime = 0;
                this.sideSound.play().catch(e => console.log('Error playing side sound:', e));
            }
            if (ball1.y - ball1.radius < 0 || ball1.y + ball1.radius > this.canvas.height) {
                ball1.velocity.y *= -1;
                ball1.y = ball1.y - ball1.radius < 0 ? ball1.radius : this.canvas.height - ball1.radius;
                // Play side collision sound
                this.sideSound.currentTime = 0;
                this.sideSound.play().catch(e => console.log('Error playing side sound:', e));
            }

            // Ball to ball collisions
            for (let j = i + 1; j < this.balls.length; j++) {
                const ball2 = this.balls[j];
                const dx = ball2.x - ball1.x;
                const dy = ball2.y - ball1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < ball1.radius + ball2.radius) {
                    // Play ball collision sound
                    this.playCollisionSound();

                    // Collision response
                    const angle = Math.atan2(dy, dx);
                    const sin = Math.sin(angle);
                    const cos = Math.cos(angle);

                    // Rotate velocities
                    const vel1 = {
                        x: ball1.velocity.x * cos + ball1.velocity.y * sin,
                        y: ball1.velocity.y * cos - ball1.velocity.x * sin
                    };
                    const vel2 = {
                        x: ball2.velocity.x * cos + ball2.velocity.y * sin,
                        y: ball2.velocity.y * cos - ball2.velocity.x * sin
                    };

                    // Swap velocities
                    ball1.velocity.x = vel2.x * cos - vel1.y * sin;
                    ball1.velocity.y = vel2.x * sin + vel1.y * cos;
                    ball2.velocity.x = vel1.x * cos - vel2.y * sin;
                    ball2.velocity.y = vel1.x * sin + vel2.y * cos;

                    // Move balls apart
                    const overlap = (ball1.radius + ball2.radius - distance) / 2;
                    ball1.x -= overlap * Math.cos(angle);
                    ball1.y -= overlap * Math.sin(angle);
                    ball2.x += overlap * Math.cos(angle);
                    ball2.y += overlap * Math.sin(angle);
                }
            }
        }
    }

    calculateCollision(ball1, ball2, velocity1, velocity2) {
        const dx = ball2.x - ball1.x;
        const dy = ball2.y - ball1.y;
        const dvx = velocity2.x - velocity1.x;
        const dvy = velocity2.y - velocity1.y;

        const a = dvx * dvx + dvy * dvy;
        const b = 2 * (dx * dvx + dy * dvy);
        const c = dx * dx + dy * dy - (ball1.radius + ball2.radius) * (ball1.radius + ball2.radius);

        const discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return null;

        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t < 0 || t > 1) return null;

        return {
            x: ball1.x + velocity1.x * t,
            y: ball1.y + velocity1.y * t,
            time: t
        };
    }

    calculateBestShot() {
        if (!this.cueBall || this.isBallsMoving()) return null;

        let bestShot = null;
        let bestScore = -Infinity;

        // Try different angles
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 180) {
            // Try different powers
            for (let power = 30; power <= 100; power += 10) {
                const shot = this.evaluateShot(angle, power);
                if (shot && shot.score > bestScore) {
                    bestScore = shot.score;
                    bestShot = { angle, power, targetBall: shot.targetBall };
                }
            }
        }

        return bestShot;
    }

    evaluateShot(angle, power) {
        if (!this.cueBall) return null;

        const speed = power * 0.5;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        // Find potential collision with other balls
        let closestBall = null;
        let closestDistance = Infinity;
        let ghostBallPosition = null;

        for (const ball of this.balls) {
            if (ball === this.cueBall) continue;

            const intersection = this.calculateBallIntersection(
                this.cueBall.x, this.cueBall.y,
                this.cueBall.x + dirX * 1000,
                this.cueBall.y + dirY * 1000,
                ball.x, ball.y,
                ball.radius * 2
            );

            if (intersection && intersection.distance < closestDistance) {
                closestBall = ball;
                closestDistance = intersection.distance;
                ghostBallPosition = intersection;
            }
        }

        if (!closestBall || !ghostBallPosition) return null;

        // Calculate score based on various factors
        let score = 0;

        // Distance to closest pocket
        const closestPocket = this.findClosestPocket(closestBall.x, closestBall.y);
        if (closestPocket) {
            const distToPocket = Math.sqrt(
                Math.pow(closestBall.x - closestPocket.x, 2) +
                Math.pow(closestBall.y - closestPocket.y, 2)
            );
            score -= distToPocket * 0.5; // Prefer shots closer to pockets
        }

        // Penalize if path to pocket is blocked
        const pathBlocked = this.isPathBlocked(
            closestBall.x, closestBall.y,
            closestPocket.x, closestPocket.y,
            closestBall
        );
        if (pathBlocked) {
            score -= 500;
        }

        // Prefer medium power shots
        const powerPenalty = Math.abs(power - 50);
        score -= powerPenalty;

        return { score, targetBall: closestBall };
    }

    findClosestPocket(x, y) {
        let closestPocket = null;
        let minDistance = Infinity;

        for (const pocket of this.pockets) {
            const distance = Math.sqrt(
                Math.pow(x - pocket.x, 2) +
                Math.pow(y - pocket.y, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestPocket = pocket;
            }
        }

        return closestPocket;
    }

    isPathBlocked(x1, y1, x2, y2, excludeBall) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const dirX = dx / distance;
        const dirY = dy / distance;

        for (const ball of this.balls) {
            if (ball === excludeBall || ball === this.cueBall) continue;

            const intersection = this.calculateBallIntersection(
                x1, y1,
                x2, y2,
                ball.x, ball.y,
                ball.radius * 2
            );

            if (intersection) return true;
        }

        return false;
    }

    showRobotPrediction() {
        const bestShot = this.calculateBestShot();
        if (!bestShot) return;

        // Store the current state
        const currentAngle = this.aimAngle;
        const currentPower = this.power;

        // Set the predicted values
        this.aimAngle = bestShot.angle;
        this.power = bestShot.power;

        // Draw the prediction
        this.drawAimingSystem();

        // Restore the original state
        this.aimAngle = currentAngle;
        this.power = currentPower;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw pockets
        this.pockets.forEach(pocket => {
            this.ctx.beginPath();
            this.ctx.arc(pocket.x, pocket.y, this.pocketRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#000000';
            this.ctx.fill();
            this.ctx.closePath();
        });

        // Draw robot prediction
        if (this.isShowingPrediction && this.robotPrediction) {
            // Draw predicted path
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);

            this.ctx.moveTo(this.robotPrediction.path[0].x, this.robotPrediction.path[0].y);
            for (let i = 1; i < this.robotPrediction.path.length; i++) {
                this.ctx.lineTo(this.robotPrediction.path[i].x, this.robotPrediction.path[i].y);
            }

            this.ctx.stroke();
            this.ctx.setLineDash([]); // Reset line dash

            // Draw aim line
            this.ctx.beginPath();
            this.ctx.moveTo(this.cueBall.x, this.cueBall.y);
            this.ctx.lineTo(
                this.cueBall.x + Math.cos(this.robotPrediction.angle) * 50,
                this.cueBall.y + Math.sin(this.robotPrediction.angle) * 50
            );
            this.ctx.strokeStyle = '#e74c3c';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
        // Draw aim line when not moving and not showing prediction
        else if (!this.isBallsMoving()) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.cueBall.x, this.cueBall.y);
            this.ctx.lineTo(
                this.cueBall.x + Math.cos(this.aimAngle) * 50,
                this.cueBall.y + Math.sin(this.aimAngle) * 50
            );
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }

        // Draw balls
        this.balls.forEach(ball => ball.draw(this.ctx));

        this.drawAimingSystem();
    }

    drawAimingSystem() {
        if (!this.cueBall || this.isBallsMoving()) return;

        const ctx = this.ctx;
        const power = this.power * 0.5; // Same multiplier as in shoot()

        // Find closest ball in trajectory
        let closestBall = null;
        let closestDistance = Infinity;
        let ghostBallPosition = null;

        // Calculate aim line endpoint
        const lineLength = 1000;
        const endX = this.cueBall.x + Math.cos(this.aimAngle) * lineLength;
        const endY = this.cueBall.y + Math.sin(this.aimAngle) * lineLength;

        // Calculate predicted final position of cue ball
        const finalX = this.cueBall.x + Math.cos(this.aimAngle) * power * 2;
        const finalY = this.cueBall.y + Math.sin(this.aimAngle) * power * 2;

        // Draw dotted line for trajectory
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(this.cueBall.x, this.cueBall.y);
        ctx.lineTo(finalX, finalY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw ghost ball at final position
        ctx.beginPath();
        ctx.arc(finalX, finalY, this.cueBall.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        for (const ball of this.balls) {
            if (ball === this.cueBall) continue;

            const intersection = this.calculateBallIntersection(
                this.cueBall.x, this.cueBall.y,
                endX, endY,
                ball.x, ball.y,
                ball.radius * 2
            );

            if (intersection && intersection.distance < closestDistance) {
                closestBall = ball;
                closestDistance = intersection.distance;
                ghostBallPosition = intersection;
            }
        }

        // Draw ghost ball and impact lines for target ball
        if (ghostBallPosition && closestBall) {
            // Draw ghost ball
            ctx.beginPath();
            ctx.arc(ghostBallPosition.x, ghostBallPosition.y, this.cueBall.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.stroke();

            // Calculate and draw impact angle
            const impactAngle = Math.atan2(
                closestBall.y - ghostBallPosition.y,
                closestBall.x - ghostBallPosition.x
            );

            // Draw impact line
            ctx.beginPath();
            ctx.moveTo(ghostBallPosition.x, ghostBallPosition.y);
            ctx.lineTo(closestBall.x, closestBall.y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.stroke();

            // Draw predicted path of target ball
            const targetLineLength = 300;
            const targetEndX = closestBall.x + Math.cos(impactAngle) * targetLineLength;
            const targetEndY = closestBall.y + Math.sin(impactAngle) * targetLineLength;

            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(closestBall.x, closestBall.y);
            ctx.lineTo(targetEndX, targetEndY);
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
            ctx.stroke();
        }

        // Reset line dash
        ctx.setLineDash([]);

        // Draw aim line with gradient
        const gradient = ctx.createLinearGradient(
            this.cueBall.x, this.cueBall.y,
            this.cueBall.x + Math.cos(this.aimAngle) * 200,
            this.cueBall.y + Math.sin(this.aimAngle) * 200
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(this.cueBall.x, this.cueBall.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw power indicator
        this.drawPowerIndicator();
    }

    drawPowerIndicator() {
        if (!this.cueBall || this.isBallsMoving()) return;

        const ctx = this.canvas.getContext('2d');
        const barWidth = 10;
        const barHeight = 100;
        const barX = this.canvas.width - 30;
        const barY = this.canvas.height - 120;

        // Draw power bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Create power bar gradient
        const gradient = ctx.createLinearGradient(
            barX, barY + barHeight,
            barX, barY
        );
        gradient.addColorStop(0, '#00ff00');    // Green at bottom
        gradient.addColorStop(0.5, '#ffff00');  // Yellow in middle
        gradient.addColorStop(1, '#ff0000');    // Red at top

        // Draw power level
        const powerHeight = (this.power / 100) * barHeight;
        ctx.fillStyle = gradient;
        ctx.fillRect(barX, barY + barHeight - powerHeight, barWidth, powerHeight);

        // Draw border
        ctx.strokeStyle = 'white';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    gameLoop() {
        this.checkCollisions();
        this.balls.forEach(ball => ball.update());
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    setupEventListeners() {
        // Make canvas focusable and focus it by default
        this.canvas.tabIndex = 1;
        this.canvas.style.outline = 'none'; // Remove focus outline
        this.canvas.focus();

        // Reset button event listener
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.setupGame();
                this.draw();
            });
        }

        // Refocus canvas when clicking on it
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });

        // Store canvas position for mouse calculations
        const updateCanvasPosition = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvasOffsetX = rect.left + window.scrollX;
            this.canvasOffsetY = rect.top + window.scrollY;
        };
        
        // Update canvas position initially and on window resize
        updateCanvasPosition();
        window.addEventListener('resize', updateCanvasPosition);
        window.addEventListener('scroll', updateCanvasPosition);

        // Mouse move for aiming - now using window event
        window.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX - this.canvasOffsetX;
            const mouseY = e.clientY - this.canvasOffsetY;
            
            if (this.cueBall) {
                this.aimAngle = Math.atan2(
                    mouseY - this.cueBall.y,
                    mouseX - this.cueBall.x
                );
            }
        });

        // Mouse down for power
        this.canvas.addEventListener('mousedown', () => {
            if (!this.isBallsMoving() && this.cueBall) {
                this.isChargingPower = true;
                this.startPowerCharge();
            }
        });

        // Mouse up for shooting
        this.canvas.addEventListener('mouseup', () => {
            if (this.isChargingPower) {
                this.isChargingPower = false;
                this.shoot();
                this.power = 0;
                this.updatePowerBar();
            }
        });

        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            // Prevent default behavior for game controls
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }

            if (this.keyStates.hasOwnProperty(e.code)) {
                this.keyStates[e.code] = true;
            }

            // Handle robot prediction
            if (e.key.toLowerCase() === 'r' && !this.isBallsMoving()) {
                const bestShot = this.calculateBestShot();
                if (bestShot) {
                    // Store current state
                    const currentAngle = this.aimAngle;
                    const currentPower = this.power;

                    // Apply robot's shot
                    this.aimAngle = bestShot.angle;
                    this.power = bestShot.power;

                    // Force a redraw to show the prediction
                    this.draw();

                    // Reset after a short delay
                    setTimeout(() => {
                        this.aimAngle = currentAngle;
                        this.power = currentPower;
                        this.draw();
                    }, 2000);
                }
            }

            this.handleKeyboardControls();
        });

        window.addEventListener('keyup', (e) => {
            if (this.keyStates.hasOwnProperty(e.code)) {
                this.keyStates[e.code] = false;
            }

            if (e.code === 'Space' && this.isChargingPower) {
                this.isChargingPower = false;
                this.shoot();
                this.power = 0;
                this.updatePowerBar();
            }

            // Handle robot prediction
            if (e.key.toLowerCase() === 'r') {
                this.showRobotPrediction = false;
            }
        });

        // Add animation frame loop
        this.gameLoop();
    }

    handleKeyboardControls() {
        if (this.isBallsMoving() || !this.cueBall) return;

        // Start charging power with space
        if (this.keyStates.Space && !this.isChargingPower) {
            this.isChargingPower = true;
            this.startPowerCharge();
        }

        // Adjust power with arrow keys
        if (this.keyStates.ArrowUp) {
            this.power = Math.min(this.maxPower, this.power + this.powerStep);
            this.updatePowerBar();
        }
        if (this.keyStates.ArrowDown) {
            this.power = Math.max(0, this.power - this.powerStep);
            this.updatePowerBar();
        }
    }

    updatePowerBar() {
        const powerBar = document.getElementById('powerBar');
        if (powerBar) {
            powerBar.style.width = this.power + '%';
            
            // Update color based on power level
            if (this.power < 33) {
                powerBar.style.backgroundColor = '#2ecc71'; // Green for low power
            } else if (this.power < 66) {
                powerBar.style.backgroundColor = '#f1c40f'; // Yellow for medium power
            } else {
                powerBar.style.backgroundColor = '#e74c3c'; // Red for high power
            }
        }
    }

    startPowerCharge() {
        if (this.isChargingPower) {
            // Only auto-increment power if using mouse control
            if (!this.keyStates.Space) {
                this.power = Math.min(this.maxPower, this.power + 2);
                this.updatePowerBar();
            }
            requestAnimationFrame(() => this.startPowerCharge());
        }
    }

    shoot() {
        if (this.isBallsMoving() || !this.cueBall) return;

        // Play strike sound when shooting
        this.strikeSound.currentTime = 0;
        this.strikeSound.play().catch(e => console.log('Error playing strike sound:', e));

        // Calculate velocity based on power and aim angle
        const speed = this.power * 0.5; // Adjust this multiplier to control maximum shot power
        const velocityX = Math.cos(this.aimAngle) * speed;
        const velocityY = Math.sin(this.aimAngle) * speed;

        // Apply velocity to cue ball
        this.cueBall.velocity.x = velocityX;
        this.cueBall.velocity.y = velocityY;
    }

    isBallsMoving() {
        return this.balls.some(ball => ball.velocity.x !== 0 || ball.velocity.y !== 0);
    }

    // Add new method for playing collision sounds with debouncing
    playCollisionSound() {
        const now = Date.now();
        // Only play sound if more than 50ms has passed since last collision
        if (now - this.lastCollisionTime > 50) {
            this.collisionSound.currentTime = 0;
            this.collisionSound.play().catch(e => console.log('Error playing collision sound:', e));
            this.lastCollisionTime = now;
        }
    }

    calculateBallIntersection(x1, y1, x2, y2, cx, cy, diameter) {
        // Vector from line start to circle center
        const dx = cx - x1;
        const dy = cy - y1;

        // Vector from line start to line end
        const dirX = x2 - x1;
        const dirY = y2 - y1;

        // Normalize direction vector
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        const ndx = dirX / length;
        const ndy = dirY / length;

        // Calculate dot product
        const t = dx * ndx + dy * ndy;

        // Find nearest point on line
        const nearestX = x1 + t * ndx;
        const nearestY = y1 + t * ndy;

        // Calculate distance from nearest point to circle center
        const nearestDx = cx - nearestX;
        const nearestDy = cy - nearestY;
        const nearestDistance = Math.sqrt(nearestDx * nearestDx + nearestDy * nearestDy);

        // Check if line intersects circle
        if (nearestDistance > diameter / 2) return null;

        // Calculate intersection point (slightly before the actual collision)
        const offsetDistance = Math.sqrt((diameter / 2) * (diameter / 2) - nearestDistance * nearestDistance);
        const intersectionX = nearestX - ndx * offsetDistance;
        const intersectionY = nearestY - ndy * offsetDistance;

        // Check if intersection is in the right direction
        if ((intersectionX - x1) * ndx + (intersectionY - y1) * ndy < 0) return null;

        return {
            x: intersectionX,
            y: intersectionY,
            distance: Math.sqrt((intersectionX - x1) * (intersectionX - x1) +
                (intersectionY - y1) * (intersectionY - y1))
        };
    }
}

// Start the game when the page loads
window.onload = () => {
    new PoolGame();
};
