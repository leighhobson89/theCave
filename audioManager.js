import { getAudioMuted, setAudioMuted } from "./constantsAndGlobalVars.js";

export class AudioManager {
  constructor() {
    this.musicTracks = ["audio/music/background_music_1.mp3"];

    this.sfxSources = {
      clickButton: "audio/sfx/clickButton.mp3",
      clickSwitch: "audio/sfx/clickSwitch.mp3",
    };

    this.musicVolume = 0.1;
    this.sfxVolume = 0.85;
    this.userInteracted = false;
    this.currentMusic = null;

    if (typeof getAudioMuted() !== "boolean") {
      setAudioMuted(false);
    }
  }

  getMuted() {
    return getAudioMuted() === true;
  }

  setMuted(value) {
    setAudioMuted(Boolean(value));
    this.applyMuteState();
  }

  toggleMuted() {
    this.setMuted(!this.getMuted());
    return this.getMuted();
  }

  setMusicVolume(value) {
    this.musicVolume = Math.max(0, Math.min(1, value));
    if (this.currentMusic) {
      this.currentMusic.volume = this.getMuted() ? 0 : this.musicVolume;
    }
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, value));
  }

  onUserGesture() {
    this.userInteracted = true;
    if (!this.getMuted()) {
      this.ensureBackgroundMusic();
    }
  }

  playSfx(name) {
    const src = this.sfxSources[name];
    if (!src || this.getMuted()) {
      return;
    }

    const audio = new Audio(src);
    audio.volume = this.sfxVolume;
    audio.play().catch(() => {
      // Browsers may block audio until user interaction.
    });
  }

  ensureBackgroundMusic() {
    if (!this.userInteracted || this.getMuted()) {
      return;
    }

    if (!this.currentMusic) {
      this.playRandomTrack();
      return;
    }

    if (this.currentMusic.paused) {
      this.currentMusic.play().catch(() => {
        // Retry after next user gesture.
      });
    }
  }

  applyMuteState() {
    if (this.currentMusic) {
      this.currentMusic.volume = this.getMuted() ? 0 : this.musicVolume;
    }

    if (!this.getMuted()) {
      this.ensureBackgroundMusic();
    }
  }

  playRandomTrack() {
    if (this.musicTracks.length === 0 || this.getMuted()) {
      return;
    }

    const index = Math.floor(Math.random() * this.musicTracks.length);
    const trackPath = this.musicTracks[index];

    if (this.currentMusic) {
      this.currentMusic.pause();
      this.currentMusic.src = "";
    }

    const audio = new Audio(trackPath);
    audio.volume = this.musicVolume;
    audio.addEventListener("ended", () => {
      this.playRandomTrack();
    });

    this.currentMusic = audio;
    audio.play().catch(() => {
      // Retry after next user gesture.
    });
  }
}

export const audioManager = new AudioManager();
