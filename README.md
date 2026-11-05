# Netlify CLI Deployment Guide

## Install Netlify CLI globally

```bash
npm install -g netlify-cli
```

## Login to Netlify

Load NVM and configure Node:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
export NODE_OPTIONS=--openssl-legacy-provider
node -v
npm -v
```

Then log in:

```bash
netlify login
```

> If you're already logged in via Netlify config on your machine, you'll see a message confirming that.
>
> - Run `netlify status` for account details.
> - Run `netlify switch` to switch accounts.
> - Run `netlify help` to see all available commands.

## Initialize and deploy

Navigate to your project folder and initialize:

```bash
cd your-website-folder
netlify init
```

Follow the prompts to create a new site or connect an existing one.

## Deploy to production

```bash
netlify deploy --prod
```

### Full deploy command (with environment setup)

```bash
#netlify deploy
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
export NODE_OPTIONS=--openssl-legacy-provider
node -v
npm -v
netlify deploy --prod --site 5067343a-125c-433b-8214-1b3e54846e4e
```

## Logout

```bash
netlify logout
```
