# Local Images Directory

This directory contains local image assets for the Supremo Barber Management System.

## Directory Structure

```
/assets/images/
├── barbers/          # Barber profile photos
├── services/         # Service showcase images
├── branding/         # Logo, icons, and branding assets
├── testimonials/     # Customer testimonial photos
└── general/          # Other general-purpose images
```

## Usage

Import images in your components using:

```tsx
import logoImage from '../../assets/images/branding/logo.png';
import barberPhoto from '../../assets/images/barbers/tony.jpg';
```

## Supported Formats

- PNG (.png)
- JPEG (.jpg, .jpeg)
- SVG (.svg)
- WebP (.webp)
- GIF (.gif)

## Guidelines

1. Use descriptive filenames (e.g., `barber-tony-stark.jpg` instead of `img1.jpg`)
2. Optimize images before uploading to reduce file size
3. Use WebP format when possible for better performance
4. Keep images under 500KB when possible
5. Use lowercase filenames with hyphens (kebab-case)
