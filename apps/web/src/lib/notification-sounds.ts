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
    id: 'bell',
    fileName: 'notification-bell.mp3',
    nameEn: 'Classic Bell',
    nameFr: 'Cloche classique',
    descriptionEn: 'Soft bell chime - gentle and professional',
    descriptionFr: 'Carillon doux - doux et professionnel'
  },
  {
    id: 'notification-1',
    fileName: 'Notification-1.mp3',
    nameEn: 'Alert 1',
    nameFr: 'Alerte 1',
    descriptionEn: 'Modern notification sound',
    descriptionFr: 'Son de notification moderne'
  },
  {
    id: 'notification-2',
    fileName: 'Notification-2.mp3',
    nameEn: 'Alert 2',
    nameFr: 'Alerte 2',
    descriptionEn: 'Distinctive alert tone',
    descriptionFr: 'Ton d\'alerte distinctif'
  },
  {
    id: 'notification-3',
    fileName: 'Notification-3.mp3',
    nameEn: 'Alert 3',
    nameFr: 'Alerte 3',
    descriptionEn: 'Bright notification chime',
    descriptionFr: 'Carillon de notification vif'
  },
  {
    id: 'notification-4',
    fileName: 'Notification-4.mp3',
    nameEn: 'Alert 4',
    nameFr: 'Alerte 4',
    descriptionEn: 'Professional ping sound',
    descriptionFr: 'Son ping professionnel'
  },
  {
    id: 'notification-5',
    fileName: 'Notification-5.wav',
    nameEn: 'Alert 5',
    nameFr: 'Alerte 5',
    descriptionEn: 'Clear notification tone',
    descriptionFr: 'Ton de notification clair'
  },
  {
    id: 'notification-6',
    fileName: 'Notification-6.mp3',
    nameEn: 'Alert 6',
    nameFr: 'Alerte 6',
    descriptionEn: 'Elegant chime sound',
    descriptionFr: 'Son de carillon élégant'
  },
  {
    id: 'notification-7',
    fileName: 'Notification-7.mp3',
    nameEn: 'Alert 7',
    nameFr: 'Alerte 7',
    descriptionEn: 'Attention-grabbing alert',
    descriptionFr: 'Alerte accrocheuse'
  },
  {
    id: 'notification-8',
    fileName: 'Notification-8.mp3',
    nameEn: 'Alert 8',
    nameFr: 'Alerte 8',
    descriptionEn: 'Subtle notification beep',
    descriptionFr: 'Bip de notification subtil'
  }
]

/**
 * Default notification sound
 */
export const DEFAULT_NOTIFICATION_SOUND = 'notification-bell.mp3'

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
