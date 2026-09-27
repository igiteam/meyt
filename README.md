# Install Netlify CLI globally

npm install -g netlify-cli

# Login to Netlify

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
export NODE_OPTIONS=--openssl-legacy-provider
node -v
npm -v
netlify login

Already logged in via netlify config on your machine

Run `netlify status` for account details

or run `netlify switch` to switch accounts

To see all available commands run: netlify help

# Initialize and deploy

cd your-website-folder
netlify init

# Follow prompts to create new site or connect existing

netlify logout

# Deploy to production

netlify deploy --prod

#netlify deploy
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
export NODE_OPTIONS=--openssl-legacy-provider
node -v
npm -v
netlify deploy --prod --site 5067343a-125c-433b-8214-1b3e54846e4e
