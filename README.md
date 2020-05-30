# How to install 

alias config='/usr/bin/git --git-dir=/Users/amr/.cfg/ --work-tree=/Users/amr'
config clone  --bare git@github.com:dr3mro/cfg_macOS.git $HOME/.cfg
config reset --hard
config submodule init
config submodule update
source .zshrc
setup-zsh-plugins


-- to make stop not ask for password
sudo visudo and add the following line

%localaccounts ALL=NOPASSWD: /usr/local/bin/htop
