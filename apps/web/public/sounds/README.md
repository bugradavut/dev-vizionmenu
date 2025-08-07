# Notification Sounds

This directory contains audio files for order notifications.

## Recommended Sound Files

1. **notification-bell.mp3** - Primary notification sound for new orders
   - Suggested sources:
     - Freesound.org: Search for "notification bell" or "order alert"
     - Mixkit.co: Browse notification sounds section
     - Custom Web Audio API generation (fallback implemented)

2. **File Requirements**
   - Format: MP3 or WAV
   - Duration: 1-3 seconds
   - Volume: Moderate (0.5-0.8)
   - Professional, pleasant tone

## Adding Sound Files

1. Download notification sound from recommended sources
2. Name it `notification-bell.mp3`
3. Place in this directory
4. The system will automatically use it

## Fallback System

If no sound file is found, the system will generate a synthetic bell tone using Web Audio API.