/**
 * Notification Sound Configuration
 * Defines available notification sounds with bilingual labels
 */

export interface NotificationSound {
  id: string
  fileName: string
  nameEn: string
  nameFr: string
  descriptionEn: string
  descriptionFr: string
}

/**
 * Available notification sounds
 * Sound files located in /public/sounds/
 */
export const NOTIFICATION_SOUNDS: NotificationSound[] = [
  {
    id: 'notification-1',
    fileName: 'Notification-1.mp3',
    nameEn: 'Notification 1',
    nameFr: 'Notification 1',
    descriptionEn: 'Modern notification sound',
    descriptionFr: 'Son de notification moderne'
  },
  {
    id: 'notification-2',
    fileName: 'Notification-2.mp3',
    nameEn: 'Notification 2',
    nameFr: 'Notification 2',
    descriptionEn: 'Distinctive notification tone',
    descriptionFr: 'Ton de notification distinctif'
  },
  {
    id: 'notification-3',
    fileName: 'Notification-3.mp3',
    nameEn: 'Notification 3',
    nameFr: 'Notification 3',
    descriptionEn: 'Bright notification chime',
    descriptionFr: 'Carillon de notification vif'
  },
  {
    id: 'notification-4',
    fileName: 'Notification-4.mp3',
    nameEn: 'Notification 4',
    nameFr: 'Notification 4',
    descriptionEn: 'Professional ping sound',
    descriptionFr: 'Son ping professionnel'
  },
  {
    id: 'notification-5',
    fileName: 'Notification-5.wav',
    nameEn: 'Notification 5',
    nameFr: 'Notification 5',
    descriptionEn: 'Clear notification tone',
    descriptionFr: 'Ton de notification clair'
  },
  {
    id: 'notification-6',
    fileName: 'Notification-6.mp3',
    nameEn: 'Notification 6',
    nameFr: 'Notification 6',
    descriptionEn: 'Elegant chime sound',
    descriptionFr: 'Son de carillon élégant'
  },
  {
    id: 'notification-7',
    fileName: 'Notification-7.mp3',
    nameEn: 'Notification 7',
    nameFr: 'Notification 7',
    descriptionEn: 'Attention-grabbing notification',
    descriptionFr: 'Notification accrocheuse'
  },
  {
    id: 'notification-8',
    fileName: 'Notification-8.mp3',
    nameEn: 'Notification 8',
    nameFr: 'Notification 8',
    descriptionEn: 'Subtle notification beep',
    descriptionFr: 'Bip de notification subtil'
  }
]

/**
 * Default notification sound
 */
export const DEFAULT_NOTIFICATION_SOUND = 'Notification-1.mp3'

/**
 * Get sound file path for audio playback
 */
export function getSoundPath(fileName: string): string {
  return `/sounds/${fileName}`
}

/**
 * Get notification sound by fileName
 */
export function getNotificationSoundByFileName(fileName: string): NotificationSound | undefined {
  return NOTIFICATION_SOUNDS.find(sound => sound.fileName === fileName)
}

/**
 * Get notification sound name (localized)
 */
export function getNotificationSoundName(fileName: string, language: 'en' | 'fr'): string {
  const sound = getNotificationSoundByFileName(fileName)
  if (!sound) {
    return language === 'fr' ? 'Son inconnu' : 'Unknown Sound'
  }
  return language === 'fr' ? sound.nameFr : sound.nameEn
}
