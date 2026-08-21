
// soundConfig.ts - Top level sound configuration for switchable ambiences

export type SoundVariantId = 'overcast' | 'tropicalSunny';

export const SOUND_CONFIG = {
  overcast: {
    id: 'overcast' as const,
    label: 'Overcast Storm Ambience',
    ambience: {
      url: 'https://raw.githubusercontent.com/EricEisaman/assets/main/audio/ambience/Overcast.mp3',
      name: 'overcast',
      volume: 0.38,
      loop: true,
      autoplay: false,
    },
    effects: {
      submerge: 'https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/submerge.mp3',
      submerged: 'https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/submerged.mp3',
      emerge: 'https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/emerge.mp3',
    },
    volumes: {
      submerge: 0.9,
      submerged: 0.5,
      emerge: 0.9,
    }
  },

  tropicalSunny: {
    id: 'tropicalSunny' as const,
    label: 'Tropical Sunny - Gulls & Waves',
    ambience: {
      // As requested: main/audio/ambience/Sunny_gulls.mp3
      url: 'https://raw.githubusercontent.com/EricEisaman/assets/main/audio/ambience/Sunny_gulls.mp3',
      name: 'sunny_gulls',
      volume: 0.42,
      loop: true,
      autoplay: false,
    },
    effects: {
      submerge: 'https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/submerge.mp3',
      submerged: 'https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/submerged.mp3',
      emerge: 'https://raw.githubusercontent.com/EricEisaman/assets/main/audio/effects/emerge.mp3',
    },
    volumes: {
      submerge: 0.9,
      submerged: 0.5,
      emerge: 0.9,
    }
  }
} as const;

export type SoundConfig = typeof SOUND_CONFIG;
export const DEFAULT_SOUND_VARIANT: SoundVariantId = 'tropicalSunny';
