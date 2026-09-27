export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
export NODE_OPTIONS=--openssl-legacy-provider
node -v
npm -v
#To disconnect this directory and create a new project (or link to another project ID)
netlify unlink
#netlify init will start to create app for you to upload to netlify
netlify init

