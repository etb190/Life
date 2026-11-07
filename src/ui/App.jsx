import { useLayoutEffect, useState } from 'react';
import CharacterCreation from './components/CharacterCreation.jsx';
import GameScreen from './components/GameScreen.jsx';
import { generateNewLife } from '../game/lifeEngine.js';
import { installAppleEmojis, uninstallAppleEmojis } from './appleEmoji.js';

// App.jsx — root React component.
// Character Creation -> Starts official life with full NPC logic & BitLife UI

export default function App() {
  const [screen, setScreen] = useState('creation'); // 'creation' | 'game'
  const [gameState, setGameState] = useState(null);

  // Global iOS/Apple style emoji rendering (see src/ui/appleEmoji.js)
  useLayoutEffect(() => {
    installAppleEmojis();
    return uninstallAppleEmojis;
  }, []);

  function handleCreationComplete(customData) {
    // Generate authentic life, NPCs, and birth circumstances
    const newLife = generateNewLife(customData);
    setGameState(newLife);
    setScreen('game');
  }

  function handleStartNewLife() {
    setGameState(null);
    setScreen('creation');
  }

  if (screen === 'creation' || !gameState) {
    return <CharacterCreation onComplete={handleCreationComplete} />;
  }

  return (
    <GameScreen
      gameState={gameState}
      onUpdateState={setGameState}
      onNewLife={handleStartNewLife}
    />
  );
}
