# Original guide
### Getting started
#### If you're starting from scratch, go ahead and…
##### create a .dotfiles folder, which we'll use to track your dotfiles
```
git init --bare $HOME/.dotfiles
```
#### create an alias dotfilesso you don't need to type it all over again
```
alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
```
#### set git status to hide untracked files
```
dotfiles config --local status.showUntrackedFiles no
```
#### add the alias to .bashrc (or .zshrc) so you can use it later
```
echo "alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'" >> $HOME/.bashrc
```
---
### Usage
####Now you can use regular git commands such as:
```
dotfiles status
dotfiles add .vimrc
dotfiles commit -m "Add vimrc"
dotfiles add .bashrc
dotfiles commit -m "Add bashrc"
dotfiles push
```

##### Nice, right? Now if you're moving to a virgin system…
> ###### Setup environment in a new computer
> ###### Make sure to have git installed, then:
> ###### clone your github repository
```
git clone --bare git@github.com:dr3mro/cfg_macOS.git $HOME/.dotfiles
```
> ###### define the alias in the current shell scope
```
alias dotfiles='/usr/bin/git --git-dir=$HOME/.dotfiles/ --work-tree=$HOME'
```

> ###### checkout the actual content from the git repository to your $HOME
```
dotfiles checkout
```
#### Note that if you already have some of the files you'll get an error message. You can either (1) delete them or (2) back them up somewhere else. It's up to you.
Awesome! You’re done.

# How to install 
```
alias config='/usr/bin/git --git-dir=$HOME/.cfg/ --work-tree=$HOME'
```

```
config clone  --bare git@github.com:dr3mro/cfg_macOS.git $HOME/.cfg
```
```
config reset --hard 
```
```
config submodule init
```
```
config submodule update
```
```
source .zshrc
```
```
compaudit | xargs chmod g-w,o-w
```
```
setup-zsh-plugins
```
### on mac
run:
.bin/mac-askpass.sh

### on linux
```
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git ~/.powerlevel10k
echo 'source ~/powerlevel10k/powerlevel10k.zsh-theme' >>~/.zshrc
```

-- to make stop not ask for password
sudo visudo and add the following line

%localaccounts ALL=NOPASSWD: /usr/local/bin/htop
git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
