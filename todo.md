# TODO - Video Generator Issues

## Issues to Fix

### 1. Logo Outro Not Working + Voice Sync Issue
- Logo intro is working correctly
- Logo outro is NOT appearing at the end of the video
- Voice audio is syncing from the beginning instead of waiting for the 2-second intro duration
- Voice should start AFTER the intro (2s delay)

### 2. Product Size Morphing in Videos
- Some videos are distorting product dimensions
- Products appear smaller or rounder than actual size
- Need to investigate aspect ratio handling and video scaling
- Possible solutions to explore:
  - Preserve aspect ratio during video generation
  - Add letterboxing/pillarboxing instead of stretching
  - Use "pad" or "contain" fit modes instead of "cover"
  - Investigate Replicate API video generation parameters
