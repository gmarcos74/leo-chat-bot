# leo-chat-bot
Flickr Chat Bot

The Flickr chat bot selects random photos from flickr with some interaction for the user. A user begins by responding hello. 5 most recent (random) photos are provided to the user. A tap of a photo will load 5 photos from the author. A prompt will allow the user to either continue or go back to the start. Continuing will load the next 5 images for the selected author.

# Prerequisites
- [Node.js][4] version 8.5 or higher
    ```bash
    # determine node version
    node --version
    ```
- GIT

# Using GIT
- [Get a clone]
    ```bash
    git clone https://github.com/gmarcos74/leo-chat-bot
    ```
    
# To run the bot
- Enter bot folder
    ```bash
    cd leo-char-bot
    ```
- Install modules
    ```bash
    npm install
    ```
- Start the bot
    ```bash
    node index
    ```

# Testing the bot using Bot Framework Emulator
- The bot seems to have an issue with tap and buttons - when you click the Description button, it appears to also take the tap. Either the tap can be changed to a button, or simply not have buttons.

## Connect to the bot using Bot Framework Emulator
- Launch Bot Framework Emulator
- File -> Open Bot Configuration
- Navigate to `leo-chat-bot` folder
- Select `leo-chat-bot.bot` file

