import Phaser from 'phaser';
import { SoundManager } from '../systems/SoundManager';
import { AssetGenerator } from '../systems/AssetGenerator';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Asset loading will go here
    // For now, proceed directly to menu
  }

  create(): void {
    // Generate all programmatic textures before any other scene uses them.
    AssetGenerator.generateAll(this);

    // Initialize the SoundManager and store it in the global registry
    // so every scene can access it via this.registry.get('soundManager').
    const soundManager = new SoundManager(this);
    this.registry.set('soundManager', soundManager);

    this.scene.start('MenuScene');
  }
}
