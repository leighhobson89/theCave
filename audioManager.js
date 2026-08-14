import {
  getAudioMuted,
  getMusicVolumePreference,
  getSfxVolumePreference,
  setAudioMuted,
  setMusicVolumePreference,
  setSfxVolumePreference,
} from "./constantsAndGlobalVars.js";
import { getGameSelectableMusicPaths } from "./echotrailManager.js";

export class AudioManager {
  constructor() {
    // Derived from echotrailManager's filename rule rather than listed here, so
    // there is exactly one answer in the codebase to "may the game play this
    // file?". Dropping a differently-named mp3 into audio/music/ adds a row to
    // the ECHOTRAIL library and nothing else — the rotation below cannot reach
    // it, because it was never eligible in the first place.
    this.musicTracks = getGameSelectableMusicPaths();

    this.sfxSources = {
      clickButton: "audio/sfx/clickButton.mp3",
      clickSwitch: "audio/sfx/clickSwitch.mp3",
      newEvidence: "audio/sfx/newEvidence.mp3",
      fax: "audio/sfx/fax.mp3",
      evidenceGain: "audio/sfx/evidenceGain.mp3",
    };

    this.musicVolume = getMusicVolumePreference();
    this.sfxVolume = getSfxVolumePreference();
    this.userInteracted = false;
    this.currentMusic = null;
    this.currentTrackIndex = -1;
    this.manuallyPaused = false;

    // A track the player chose in ECHOTRAIL. While one of these exists it *is*
    // the music: the background rotation is stopped and held off, and it only
    // resumes once this track finishes or the player stops it. That is why
    // ensureBackgroundMusic() checks for it rather than the player's own pause
    // flag alone — the two mean different things and must not be conflated.
    this.echotrailAudio = null;
    this.echotrailSource = "";
    this.echotrailListeners = new Set();

    if (typeof getAudioMuted() !== "boolean") {
      setAudioMuted(false);
    }
  }

  // Re-derives which files the background rotation may draw from. Called when a
  // story trigger adds to the ECHOTRAIL library and when a save is loaded, so
  // the rotation and the library the player sees can never disagree.
  refreshGameMusicTracks(addedFileNames = []) {
    const previousTrackPath = this.musicTracks[this.currentTrackIndex];
    this.musicTracks = getGameSelectableMusicPaths(addedFileNames);
    // The index is a position in a list that has just been rebuilt, so it is
    // re-found rather than trusted; a stale index would make excludeCurrent
    // exclude the wrong track.
    this.currentTrackIndex = previousTrackPath
      ? this.musicTracks.indexOf(previousTrackPath)
      : -1;
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

    if (this.echotrailAudio) {
      this.echotrailAudio.volume = this.getMuted() ? 0 : this.musicVolume;
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

    // An ECHOTRAIL track outranks the rotation entirely, `force` included:
    // every other caller of this method (a mute toggle, a volume change, the
    // next user gesture) would otherwise start the background music playing
    // underneath the track the player deliberately chose.
    if (this.echotrailAudio) {
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

    // The chosen track follows the music volume and the mute switch, because to
    // the player it is simply what the music is right now.
    if (this.echotrailAudio) {
      this.echotrailAudio.volume = this.getMuted() ? 0 : this.musicVolume;
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

  /* -------------------------------------------------------------------------
     ECHOTRAIL playback
     -------------------------------------------------------------------------
     The player's own choice, which takes the music slot for as long as it runs.
     Every exit from that state goes through releaseEchotrailPlayback(), so
     there is one place that decides how the game gets its music back. */

  // The list view subscribes so its transport buttons and the highlighted row
  // follow playback it did not itself initiate — a track ending on its own, or
  // the window being reopened while something is already playing.
  addEchotrailListener(listener) {
    if (typeof listener !== "function") {
      return () => {};
    }

    this.echotrailListeners.add(listener);
    return () => {
      this.echotrailListeners.delete(listener);
    };
  }

  getEchotrailState() {
    return {
      source: this.echotrailSource,
      isPlaying: Boolean(this.echotrailAudio && !this.echotrailAudio.paused),
      isLoaded: Boolean(this.echotrailAudio),
    };
  }

  notifyEchotrailListeners() {
    const state = this.getEchotrailState();
    this.echotrailListeners.forEach((listener) => {
      try {
        listener(state);
      } catch {
        // A broken listener must not take the audio down with it.
      }
    });
  }

  isEchotrailPlaying() {
    return Boolean(this.echotrailAudio && !this.echotrailAudio.paused);
  }

  // Detaches the current track and hands the music back to the game's own
  // rules. `resumeBackgroundMusic` is false only when the caller is about to
  // start another track immediately, which would otherwise get a half-second of
  // background music underneath it.
  releaseEchotrailPlayback({ resumeBackgroundMusic = true } = {}) {
    const audio = this.echotrailAudio;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }

    this.echotrailAudio = null;
    this.echotrailSource = "";

    if (resumeBackgroundMusic) {
      // Deliberately not forced: if the player had the music paused before
      // choosing a track, the game goes back to being silent rather than
      // overriding a preference the player set.
      this.ensureBackgroundMusic();
    }

    this.notifyEchotrailListeners();
  }

  playEchotrailTrack(source) {
    const src = String(source || "").trim();
    if (!src) {
      return false;
    }

    this.userInteracted = true;

    // Whatever was in the music slot steps aside: the running background track
    // is stopped outright rather than paused, because the rotation picks a
    // fresh track when it resumes anyway.
    if (this.currentMusic) {
      this.currentMusic.onended = null;
      this.currentMusic.onerror = null;
      this.currentMusic.pause();
      this.currentMusic = null;
      this.currentTrackIndex = -1;
    }

    this.releaseEchotrailPlayback({ resumeBackgroundMusic: false });

    const audio = new Audio(src);
    audio.volume = this.getMuted() ? 0 : this.musicVolume;
    // The whole point of the feature: a track that runs to its end gives the
    // music back to the game, rather than leaving the desk silent.
    audio.onended = () => {
      this.releaseEchotrailPlayback();
    };
    audio.onerror = () => {
      // A file that will not play must not strand the player in silence with a
      // transport that thinks something is loaded.
      this.releaseEchotrailPlayback();
    };

    this.echotrailAudio = audio;
    this.echotrailSource = src;

    audio.play().catch(() => {
      // Autoplay policy, or a missing file the error handler has already dealt
      // with. Either way the transport reflects reality on the next notify.
      this.notifyEchotrailListeners();
    });

    this.notifyEchotrailListeners();
    return true;
  }

  // The play button's second job. Returns whether it is playing afterwards, so
  // the caller can label itself without re-reading state.
  toggleEchotrailPlayback() {
    this.userInteracted = true;

    if (!this.echotrailAudio) {
      return false;
    }

    if (this.echotrailAudio.paused) {
      this.echotrailAudio.play().catch(() => {
        this.notifyEchotrailListeners();
      });
      this.notifyEchotrailListeners();
      return true;
    }

    this.echotrailAudio.pause();
    this.notifyEchotrailListeners();
    return false;
  }

  stopEchotrailPlayback() {
    this.releaseEchotrailPlayback();
  }
}

export const audioManager = new AudioManager();
