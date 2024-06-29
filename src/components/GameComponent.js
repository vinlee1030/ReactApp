import React, { useState, useEffect, useRef } from 'react';
//import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GRAVITY = 0.6;
const JUMP_FORCE = -15;
const MOVE_SPEED = 5;
const FRICTION = 0.85;
const AIR_RESISTANCE = 0.95;

const GameComponent = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState({
    player: { 
      x: 50, 
      y: 200, 
      width: 30, 
      height: 50, 
      velocityX: 0, 
      velocityY: 0, 
      isJumping: false 
    },
    platforms: [
      { x: 0, y: 350, width: 200, height: 50 },
      { x: 250, y: 300, width: 200, height: 50 },
      { x: 500, y: 250, width: 200, height: 50 },
    ],
    weapons: [
      { x: 300, y: 270, type: 'gun', width: 20, height: 20 },
      { x: 600, y: 220, type: 'rocket', width: 30, height: 20 },
    ],
    enemies: [
      { x: 400, y: 270, width: 40, height: 40, direction: 1 },
      { x: 700, y: 220, width: 40, height: 40, direction: -1 },
    ],
    projectiles: [],
    equippedWeapon: null,
    score: 0,
    keys: { left: false, right: false, up: false, space: false },
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const gameLoop = () => {
      updateGameState();
      drawGame(ctx);
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const updateGameState = () => {
    setGameState(prevState => {
      const newState = { ...prevState };
      const { player, keys } = newState;

      // Apply horizontal movement
      if (keys.left) player.velocityX -= MOVE_SPEED;
      if (keys.right) player.velocityX += MOVE_SPEED;

      // Apply friction and air resistance
      player.velocityX *= player.isJumping ? AIR_RESISTANCE : FRICTION;
      player.x += player.velocityX;

      // Apply gravity
      player.velocityY += GRAVITY;
      player.y += player.velocityY;

      // Jump
      if (keys.up && !player.isJumping) {
        player.velocityY = JUMP_FORCE;
        player.isJumping = true;
      }

      // Platform collision
      let onPlatform = false;
      newState.platforms.forEach(platform => {
        if (
          player.y + player.height > platform.y &&
          player.y + player.height < platform.y + platform.height &&
          player.x + player.width > platform.x &&
          player.x < platform.x + platform.width
        ) {
          player.y = platform.y - player.height;
          player.velocityY = 0;
          player.isJumping = false;
          onPlatform = true;
        }
      });

      if (!onPlatform) {
        player.isJumping = true;
      }

      // Weapon pickup
      newState.weapons = newState.weapons.filter(weapon => {
        if (
          player.x < weapon.x + weapon.width &&
          player.x + player.width > weapon.x &&
          player.y < weapon.y + weapon.height &&
          player.y + player.height > weapon.y
        ) {
          newState.equippedWeapon = weapon.type;
          return false;
        }
        return true;
      });

      // Update projectiles
      newState.projectiles = newState.projectiles.map(projectile => ({
        ...projectile,
        x: projectile.x + projectile.velocityX,
        y: projectile.y + projectile.velocityY,
      })).filter(projectile => 
        projectile.x > 0 && projectile.x < CANVAS_WIDTH &&
        projectile.y > 0 && projectile.y < CANVAS_HEIGHT
      );

      // Enemy movement and collision
      newState.enemies = newState.enemies.map(enemy => {
        const newEnemy = { ...enemy };
        newEnemy.x += enemy.direction * 2;

        // Reverse direction if hitting canvas bounds
        if (newEnemy.x <= 0 || newEnemy.x + newEnemy.width >= CANVAS_WIDTH) {
          newEnemy.direction *= -1;
        }

        // Check collision with projectiles
        newState.projectiles.forEach((projectile, index) => {
          if (
            projectile.x < newEnemy.x + newEnemy.width &&
            projectile.x + projectile.width > newEnemy.x &&
            projectile.y < newEnemy.y + newEnemy.height &&
            projectile.y + projectile.height > newEnemy.y
          ) {
            newState.projectiles.splice(index, 1);
            newState.score += 100;
            return null; // Remove enemy
          }
        });

        return newEnemy;
      }).filter(enemy => enemy !== null);

      // Shooting
      if (keys.space && newState.equippedWeapon && !newState.projectiles.some(p => p.justShot)) {
        const projectile = {
          x: player.x + player.width / 2,
          y: player.y + player.height / 2,
          width: 10,
          height: 10,
          velocityX: player.velocityX + (player.velocityX >= 0 ? 10 : -10),
          velocityY: 0,
          justShot: true
        };
        if (newState.equippedWeapon === 'rocket') {
          projectile.width = 20;
          projectile.height = 20;
          projectile.velocityX = player.velocityX + (player.velocityX >= 0 ? 15 : -15);
        }
        newState.projectiles.push(projectile);
      }

      // Remove justShot flag from projectiles
      newState.projectiles = newState.projectiles.map(p => ({ ...p, justShot: false }));

      return newState;
    });
  };

  const drawGame = (ctx) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw player
    ctx.fillStyle = 'blue';
    ctx.fillRect(gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);

    // Draw platforms
    ctx.fillStyle = 'green';
    gameState.platforms.forEach(platform => {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    });

    // Draw weapons
    ctx.fillStyle = 'yellow';
    gameState.weapons.forEach(weapon => {
      ctx.fillRect(weapon.x, weapon.y, weapon.width, weapon.height);
    });

    // Draw enemies
    ctx.fillStyle = 'red';
    gameState.enemies.forEach(enemy => {
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });

    // Draw projectiles
    ctx.fillStyle = 'orange';
    gameState.projectiles.forEach(projectile => {
      ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
    });

    // Draw score
    ctx.fillStyle = 'black';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${gameState.score}`, 10, 30);

    // Draw equipped weapon
    ctx.fillText(`Weapon: ${gameState.equippedWeapon || 'None'}`, 10, 60);
  };

  const handleKeyDown = (e) => {
    setGameState(prevState => ({
      ...prevState,
      keys: {
        ...prevState.keys,
        [getKeyType(e.key)]: true
      }
    }));
  };

  const handleKeyUp = (e) => {
    setGameState(prevState => ({
      ...prevState,
      keys: {
        ...prevState.keys,
        [getKeyType(e.key)]: false
      }
    }));
  };

  const getKeyType = (key) => {
    switch (key) {
      case 'ArrowLeft': return 'left';
      case 'ArrowRight': return 'right';
      case 'ArrowUp': return 'up';
      case ' ': return 'space';
      default: return null;
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Mario-like Platformer</h1>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ border: '1px solid black' }}
      />
      <Alert>
        <AlertTitle>Controls</AlertTitle>
        <AlertDescription>
          Use arrow keys to move and jump. Press spacebar to shoot when equipped with a weapon.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default GameComponent;
