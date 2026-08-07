import {
  getAudioMuted,
  getMusicVolumePreference,
  getSfxVolumePreference,
  setAudioMuted,
  setMusicVolumePreference,
  setSfxVolumePreference,
} from "./constantsAndGlobalVars.js";

export class AudioManager {
  constructor() {
    this.musicTracks = [
      "audio/music/backgroundMusic_1.mp3",
      "audio/music/backgroundMusic_2.mp3",
      "audio/music/backgroundMusic_3.mp3",
      "audio/music/backgroundMusic_4.mp3",
      "audio/music/backgroundMusic_5.mp3",
      "audio/music/backgroundMusic_6.mp3",
    ];

    this.sfxSources = {
      clickButton: "audio/sfx/clickButton.mp3",
      clickSwitch: "audio/sfx/clickSwitch.mp3",
      newEvidence: "audio/sfx/newEvidence.mp3",
    };

    this.musicVolume = getMusicVolumePreference();
    this.sfxVolume = getSfxVolumePreference();
    this.userInteracted = false;
    this.currentMusic = null;
    this.currentTrackIndex = -1;
    this.manuallyPaused = false;

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
    setMusicVolumePreference(this.musicVolume);

    if (this.currentMusic) {
      this.currentMusic.volume = this.getMuted() ? 0 : this.musicVolume;
    }
  }

  setSfxVolume(value) {
    this.sfxVolume = Math.max(0, Math.min(1, value));
    setSfxVolumePreference(this.sfxVolume);
  }

  onUserGesture() {
    this.userInteracted = true;

    if (!this.manuallyPaused) {
      this.ensureBackgroundMusic();
    }
  }

  isMusicPlaying() {
    return Boolean(this.currentMusic && !this.currentMusic.paused);
  }

  toggleMusicPlayback() {
    this.userInteracted = true;

    if (this.isMusicPlaying()) {
      this.manuallyPaused = true;
      this.currentMusic.pause();
      return false;
    }

    this.manuallyPaused = false;
    this.ensureBackgroundMusic({ force: true });
    return true;
  }

  playNextRandomTrack() {
    this.userInteracted = true;
    this.manuallyPaused = false;
    this.playRandomTrack({ excludeCurrent: true, force: true });
  }

  startBackgroundMusicForGame() {
    this.userInteracted = true;
    this.manuallyPaused = false;
    this.ensureBackgroundMusic({ force: true });
  }

  syncFromSavedPreferences() {
    this.musicVolume = getMusicVolumePreference();
    this.sfxVolume = getSfxVolumePreference();
    this.applyMuteState();
  }

  playSfx(name) {
    const normalizedName = String(name || "").trim();
    const registeredSource = this.sfxSources[normalizedName];
    const looksLikePath = /\//.test(normalizedName)
      || /^\./.test(normalizedName)
      || /\.(mp3|wav|ogg|m4a)$/i.test(normalizedName);
    const src = registeredSource || (looksLikePath ? normalizedName : "");
    if (!src || this.getMuted()) {
      return;
    }

    const audio = new Audio(src);
    audio.volume = this.sfxVolume;
    audio.play().catch(() => {
      // Browsers may block audio until user interaction.
    });
  }

  ensureBackgroundMusic({ force = false } = {}) {
    if (!this.userInteracted) {
      return;
    }

    if (this.manuallyPaused && !force) {
      return;
    }

    if (!this.currentMusic) {
      this.playRandomTrack({ force });
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

    if (!this.manuallyPaused) {
      this.ensureBackgroundMusic({ force: true });
    }
  }

  playRandomTrack({ excludeCurrent = false, force = false } = {}) {
    if (this.musicTracks.length === 0) {
      return;
    }

    if (!force && this.getMuted()) {
      return;
    }

    const availableIndices = this.musicTracks
      .map((_, index) => index)
      .filter((index) => !excludeCurrent || index !== this.currentTrackIndex);

    const candidateIndices = availableIndices.length
      ? availableIndices
      : this.musicTracks.map((_, index) => index);

    const index = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
    const trackPath = this.musicTracks[index];

    if (this.currentMusic) {
      this.currentMusic.onended = null;
      this.currentMusic.onerror = null;
      this.currentMusic.pause();
    }

    const audio = new Audio(trackPath);
    audio.volume = this.getMuted() ? 0 : this.musicVolume;
    audio.onended = () => {
      if (this.manuallyPaused) {
        return;
      }

      this.playRandomTrack({ excludeCurrent: true, force: true });
    };
    audio.onerror = () => {
      // Skip to a different track if this one cannot play.
      this.playRandomTrack({ excludeCurrent: true, force: true });
    };

    this.currentMusic = audio;
    this.currentTrackIndex = index;
    audio.play().catch(() => {
      // Retry after next user gesture.
    });
  }
}

export const audioManager = new AudioManager();
