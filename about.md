# About EDISON

**EDISON** is an international Smart TV advertising and opportunity network. It enables television broadcasters and advertisers to deliver targeted, interactive commercial breaks to Smart TVs, while viewers engage via QR codes on their phones — creating a measurable, privacy-respecting bridge between linear TV and digital television.

## Vision

To modernize television advertising by combining the reach of linear TV with the interactivity and measurement capabilities of digital platforms, all while respecting viewer privacy and consent.

## Categories

The system supports two types of advertising:
- **COMMERCIAL ADS** — Paid promotions, events, and personal greetings (Image/Banner, Video, Text-Only)
- **CHARITY ADS** — Free verified listings for jobs, scholarships, training, conferences, and community programs

## Status

EDISON is **locally fully functional** with comprehensive testing across all software features. Cloudflare Workers preview is deployed on the free tier. All core features work locally and in the deployed preview — broadcast ad creation, upload/transcoding, TV preview & break simulation, QR routing & consent, analytics funnel, household & geo targeting, remote control via AURA, shared break intelligence, and privacy architecture.

Physical Smart TV hardware compatibility test (`Stage P6`) is the one remaining validation step pending owner authorization.

## Technology Stack

- **Frontend**: React 19
- **Edge Runtime**: Cloudflare Workers (deployed)
- **Database**: D1 (SQLite-style) + PostgreSQL migrations
- **Media Storage**: R2 bucket (adapter prepared; binding/bucket activation pending owner)
- **FFmpeg**: Server-side transcoding pipeline
- **QR Code**: `jsQR` validation library

## Key Features

- 16:9 TV preview and break simulator
- QR code routing and consent management
- Multi-profile household and geo targeting
- Shared break intelligence network
- Privacy-first architecture with household/individual consent modes
- Production hardening with Zod validation, rate limiting, hashed sessions

---

For more information, see the [README.md](README.md) and associated documentation files.