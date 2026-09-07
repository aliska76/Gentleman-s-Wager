import { useSound } from '../../sound/SoundContext';
import { DropdownPanel, DropdownTrigger, DropdownWrapper } from '../common/DropdownMenu.styles';
import { GearIcon, MusicNoteIcon, MusicOffIcon, SpeakerIcon, SpeakerOffIcon } from '../common/icons';
import { ToggleRow, VolumeLabel, VolumeRow, VolumeSlider } from './SettingsMenu.styles';

/** Gear icon in the header — hover/focus reveals music/sfx toggles and a shared volume slider. */
export function SettingsMenu() {
  const { musicOn, sfxOn, volume, toggleMusic, toggleSfx, setVolume } = useSound();
  const volumeDisabled = !musicOn && !sfxOn;

  return (
    <DropdownWrapper>
      <DropdownTrigger type="button" aria-label="Sound settings" data-testid="settings-menu-button">
        <GearIcon />
      </DropdownTrigger>
      <DropdownPanel data-testid="settings-menu">
        <ToggleRow type="button" $active={musicOn} onClick={toggleMusic} data-testid="music-toggle">
          {musicOn ? <MusicNoteIcon /> : <MusicOffIcon />}
          Music
        </ToggleRow>
        <ToggleRow type="button" $active={sfxOn} onClick={toggleSfx} data-testid="sfx-toggle">
          {sfxOn ? <SpeakerIcon /> : <SpeakerOffIcon />}
          Sound effects
        </ToggleRow>
        <VolumeRow>
          <VolumeLabel $disabled={volumeDisabled}>Volume</VolumeLabel>
          <VolumeSlider
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            disabled={volumeDisabled}
            onChange={(event) => setVolume(Number(event.target.value))}
            data-testid="volume-slider"
          />
        </VolumeRow>
      </DropdownPanel>
    </DropdownWrapper>
  );
}
