import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';

const GRAVITY = 0.5;
const JUMP_FORCE = -10;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 50;
const MIN_PLATFORM_WIDTH = 50;
const MAX_PLATFORM_WIDTH = 200;
const PLATFORM_HEIGHT = 20;
const PLATFORM_GAP = 200; // Minimum gap between platforms
const ENEMY_SIZE = 40;
const WEAPON_SIZE = 20;
const PROJECTILE_SIZE = 10;
const ENEMY_SPEED = 2;

const generatePlatforms = (numPlatforms, stageWidth, stageHeight) => {
  const platforms = [];
  let lastPlatformX = 0;
  let lastPlatformY = stageHeight - PLATFORM_HEIGHT;

  for (let i = 0; i < numPlatforms; i++) {
    const platformWidth = Math.random() * (MAX_PLATFORM_WIDTH - MIN_PLATFORM_WIDTH) + MIN_PLATFORM_WIDTH;
    const platformX = lastPlatformX + Math.random() * PLATFORM_GAP + PLAYER_WIDTH;
    const platformY = lastPlatformY - Math.random() * (stageHeight / numPlatforms) - PLATFORM_HEIGHT;

    platforms.push({
      x: platformX,
      y: platformY,
      width: platformWidth,
      height: PLATFORM_HEIGHT,
    });

    lastPlatformX = platformX;
    lastPlatformY = platformY;
  }
  return platforms;
};

const generateEnemies = (platforms) => {
  const enemies = [];
  platforms.forEach((platform) => {
    if (Math.random() > 0.5) { // Randomly decide if a platform will have an enemy
      enemies.push({
        x: platform.x + Math.random() * (platform.width - ENEMY_SIZE),
        y: platform.y - ENEMY_SIZE,
        width: ENEMY_SIZE,
        height: ENEMY_SIZE,
        direction: Math.random() > 0.5 ? 1 : -1, // Randomly decide initial direction
      });
    }
  });
  return enemies;
};

const generateWeapons = (platforms) => {
  const weapons = [];
  platforms.forEach((platform) => {
    if (Math.random() > 0.5) { // Randomly decide if a platform will have a weapon
      weapons.push({
        x: platform.x + Math.random() * (platform.width - WEAPON_SIZE),
        y: platform.y - WEAPON_SIZE,
        width: WEAPON_SIZE,
        height: WEAPON_SIZE,
        type: Math.random() > 0.5 ? 'gun' : 'rocket', // Randomly decide weapon type
      });
    }
  });
  return weapons;
};

const Game = () => {
  const [player, setPlayer] = useState({ x: 50, y: window.innerHeight - 70, vy: 0, equippedWeapon: null });
  const [keys, setKeys] = useState({});
  const [platforms, setPlatforms] = useState([]);
  const [enemies, setEnemies] = useState([]);
  const [weapons, setWeapons] = useState([]);
  const [projectiles, setProjectiles] = useState([]);
  const [score, setScore] = useState(0);

  const stageRef = useRef(null);

  useEffect(() => {
    const stageWidth = window.innerWidth;
    const stageHeight = window.innerHeight;
    const newPlatforms = generatePlatforms(10, stageWidth, stageHeight);
    setPlatforms(newPlatforms);
    setEnemies(generateEnemies(newPlatforms));
    setWeapons(generateWeapons(newPlatforms));
  }, []);

  const handleKeyDown = (e) => {
    setKeys((keys) => ({ ...keys, [e.key]: true }));
  };

  const handleKeyUp = (e) => {
    setKeys((keys) => ({ ...keys, [e.key]: false }));
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const movePlayer = () => {
      setPlayer((player) => {
        let newX = player.x;
        let newY = player.y;
        let newVy = player.vy;

        if (keys['ArrowLeft']) newX -= 5;
        if (keys['ArrowRight']) newX += 5;
        if (keys['ArrowUp'] && player.vy === 0) newVy = JUMP_FORCE;

        newVy += GRAVITY;
        newY += newVy;

        // Collision detection with platforms
        platforms.forEach((platform) => {
          if (
            newX < platform.x + platform.width &&
            newX + PLAYER_WIDTH > platform.x &&
            newY < platform.y + platform.height &&
            newY + PLAYER_HEIGHT > platform.y &&
            player.vy > 0
          ) {
            newY = platform.y - PLAYER_HEIGHT;
            newVy = 0;
          }
        });

        // Prevent the player from falling off the bottom of the screen
        if (newY > window.innerHeight - PLAYER_HEIGHT) {
          newY = window.innerHeight - PLAYER_HEIGHT;
          newVy = 0;
        }

        // Weapon pickup
        weapons.forEach((weapon, index) => {
          if (
            newX < weapon.x + weapon.width &&
            newX + PLAYER_WIDTH > weapon.x &&
            newY < weapon.y + weapon.height &&
            newY + PLAYER_HEIGHT > weapon.y
          ) {
            player.equippedWeapon = weapon.type;
            weapons.splice(index, 1);
          }
        });

        return { ...player, x: newX, y: newY, vy: newVy };
      });

      // Enemy movement and collision detection
      setEnemies((enemies) =>
        enemies.map((enemy) => {
          let newEnemyX = enemy.x + enemy.direction * ENEMY_SPEED;
          if (newEnemyX <= 0 || newEnemyX + ENEMY_SIZE >= window.innerWidth) {
            enemy.direction *= -1;
          }
          return { ...enemy, x: newEnemyX };
        })
      );

      // Projectile movement and collision detection
      setProjectiles((projectiles) =>
        projectiles
          .map((projectile) => ({
            ...projectile,
            x: projectile.x + projectile.vx,
            y: projectile.y + projectile.vy,
          }))
          .filter(
            (projectile) =>
              projectile.x > 0 &&
              projectile.x < window.innerWidth &&
              projectile.y > 0 &&
              projectile.y < window.innerHeight
          )
      );

      // Collision detection between projectiles and enemies
      setEnemies((enemies) =>
        enemies.filter((enemy) => {
          let hit = false;
          setProjectiles((projectiles) =>
            projectiles.filter((projectile) => {
              if (
                projectile.x < enemy.x + enemy.width &&
                projectile.x + PROJECTILE_SIZE > enemy.x &&
                projectile.y < enemy.y + enemy.height &&
                projectile.y + PROJECTILE_SIZE > enemy.y
              ) {
                hit = true;
                setScore((score) => score + 100);
                return false;
              }
              return true;
            })
          );
          return !hit;
        })
      );
    };

    const interval = setInterval(movePlayer, 1000 / 60);
    return () => clearInterval(interval);
  }, [keys, platforms, weapons]);

  useEffect(() => {
    const shoot = () => {
      if (keys[' ']) {
        setPlayer((player) => {
          if (player.equippedWeapon) {
            const projectileSpeed = player.equippedWeapon === 'rocket' ? 15 : 10;
            const projectileWidth = player.equippedWeapon === 'rocket' ? 20 : 10;
            const projectileHeight = player.equippedWeapon === 'rocket' ? 20 : 10;

            setProjectiles((projectiles) => [
              ...projectiles,
              {
                x: player.x + PLAYER_WIDTH / 2,
                y: player.y + PLAYER_HEIGHT / 2,
                vx: player.equippedWeapon === 'rocket' ? (keys['ArrowLeft'] ? -projectileSpeed : projectileSpeed) : (keys['ArrowLeft'] ? -projectileSpeed : projectileSpeed),
                vy: 0,
                width: projectileWidth,
                height: projectileHeight,
              },
            ]);
          }
          return player;
        });
      }
    };

    const interval = setInterval(shoot, 300); // Allow shooting every 300ms
    return () => clearInterval(interval);
  }, [keys]);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight} ref={stageRef}>
      <Layer>
        <Rect x={player.x} y={player.y} width={PLAYER_WIDTH} height={PLAYER_HEIGHT} fill="red" />
        {platforms.map((platform, index) => (
          <Rect
            key={index}
            x={platform.x}
            y={platform.y}
            width={platform.width}
            height={platform.height}
            fill="green"
          />
        ))}
        {weapons.map((weapon, index) => (
          <Rect
            key={index}
            x={weapon.x}
            y={weapon.y}
            width={weapon.width}
            height={weapon.height}
            fill={weapon.type === 'gun' ? 'blue' : 'purple'}
          />
        ))}
        {enemies.map((enemy, index) => (
          <Rect key={index} x={enemy.x} y={enemy.y} width={enemy.width} height={enemy.height} fill="black" />
        ))}
        {projectiles.map((projectile, index) => (
          <Rect
            key={index}
            x={projectile.x}
            y={projectile.y}
            width={projectile.width}
            height={projectile.height}
            fill="orange"
          />
        ))}
        <Text text={`Score: ${score}`} fontSize={20} x={10} y={10} fill="black" />
      </Layer>
    </Stage>
  );
};

export default Game;
