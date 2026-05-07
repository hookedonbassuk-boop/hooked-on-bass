# Hooked On Bass — Raspberry Pi Deployment Notes

Domain:

hookedonbass.co.uk

## Planned Server Stack

- Raspberry Pi 5
- Raspberry Pi OS Lite
- Nginx
- Docker
- Git
- Cloudflare DNS
- Let’s Encrypt SSL

## Deployment Flow

Website files are developed locally, committed to Git, pushed to GitHub, then pulled onto the Raspberry Pi.

Local PC:

```bash
git add .
git commit -m "Describe update"
git push