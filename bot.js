const { AttachmentLayoutTypes, ActivityTypes, CardFactory } = require('botbuilder');
const { ChoicePrompt, WaterfallDialog, DialogSet, DialogTurnStatus, ListStyle } = require('botbuilder-dialogs');
const FlickrAddon = require('./flickr');

class MyBot {
    constructor(conversationState, userState) {
        this.dialogStateAccessor = conversationState.createProperty("DialogState");
        this.userProfileAccessor = userState.createProperty("UserProfile");
        this.conversationState = conversationState;
        this.userState = userState;

        this.dialogs = new DialogSet(this.dialogStateAccessor);

        //const prompt = new ChoicePrompt('cardPrompt');
        //prompt.style = ListStyle.list;
        //this.dialogs.add(prompt);
        
        this.dialogs.add(new WaterfallDialog("TopLevelDialog")
            .addStep(this.randomFlickrPics.bind(this))
            .addStep(this.randomFlickrPicsByAuthor.bind(this))
            .addStep(this.whatsNext.bind(this))
            .addStep(this.acknowledgementStep.bind(this)));

    }

    async onTurn(turnContext) {
        //         // // Prompt the user with the configured PromptOptions.
        //         // await dc.prompt('cardPrompt', promptOptions);
        
        if (turnContext.activity.type === ActivityTypes.Message) {
            // Run the DialogSet - let the framework identify the current state of the dialog from
            // the dialog stack and figure out what (if any) is the active dialog.
            const dialogContext = await this.dialogs.createContext(turnContext);
            const results = await dialogContext.continueDialog();
            switch (results.status) {
                case DialogTurnStatus.cancelled:
                case DialogTurnStatus.empty:
                    // If there is no active dialog, we should clear the user info and start a new dialog.
                    await this.userProfileAccessor.set(turnContext, {});
                    await this.userState.saveChanges(turnContext);
                    await dialogContext.beginDialog("TopLevelDialog");
                    break;
                case DialogTurnStatus.complete:
                    // If we just finished the dialog, capture and display the results.
                    const userInfo = results.result;
                    // const status = 'You are signed up to review '
                    //     + (userInfo.companiesToReview.length === 0 ? 'no companies' : userInfo.companiesToReview.join(' and '))
                    //     + '.';
                    await turnContext.sendActivity(status);
                    await this.userProfileAccessor.set(turnContext, userInfo);
                    await this.userState.saveChanges(turnContext);
                    break;
                case DialogTurnStatus.waiting:
                    // If there is an active dialog, we don't need to do anything here.
                    break;
            }
            await this.conversationState.saveChanges(turnContext);
        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            //New
        } else {
            //Default
        }
    
    }

    async randomFlickrPics(stepContext) {
        // Create an object in which to collect the user's information within the dialog.
        stepContext.values["UserInfo"] = {};
    
        var newFlickrCards = await this.createRandomFlickrCards();
        await stepContext.context.sendActivity({ 
            attachments: newFlickrCards, 
            attachmentLayout: AttachmentLayoutTypes.Carousel 
        });

        // Ask the user to enter their name.
        //return await stepContext.prompt("UserInfo", 'Please enter your name.');

        return;
    }
    
    async randomFlickrPicsByAuthor(stepContext) {

    }

    async whatsNext(stepContext) {

    }

    async acknowledgementStep(stepContext) {
        const list = stepContext.result || [];
        //stepContext.values["UserInfo"].companiesToReview = list;
    
        // Thank them for participating.
        await stepContext.context.sendActivity(`Thanks for participating, ${stepContext.values["UserInfo"].name}.`);
    
        // Exit the dialog, returning the collected user information.
        return await stepContext.endDialog(stepContext.values["UserInfo"]);
    }

    async createRandomFlickrCards() {
        var fiveNewImageCards = [];
        var fiveNewPhotos = await FlickrAddon.flickrGetRandomImages();

        //console.log("NEW PHOTOS: " + JSON.stringify(fiveNewPhotos, null, 2));      

        fiveNewPhotos.map(function(fiveNewPhotosElement) {
            fiveNewImageCards.push(
                CardFactory.heroCard(
                    fiveNewPhotosElement.photo_info.title,
                    CardFactory.images([ fiveNewPhotosElement.base_url ]),
                    CardFactory.actions([
                        {
                            type: 'openUrl',
                            title: 'Description',
                            value: fiveNewPhotosElement.base_url
                        }
                    ],               
                    {
                        subtitle: fiveNewPhotosElement.photo_info.title,
                        text: fiveNewPhotosElement.photo_info.title
                    },
                    {
                        subtitle: fiveNewPhotosElement.photo_info.author_name,
                        text: fiveNewPhotosElement.photo_info.author_name
                    })
                )
            );
        });

        return fiveNewImageCards;
    }

    // createHeroCard() {
    //     return CardFactory.heroCard(
    //         'BotFramework Hero Card',
    //         CardFactory.images(['https://sec.ch9.ms/ch9/7ff5/e07cfef0-aa3b-40bb-9baa-7c9ef8ff7ff5/buildreactionbotframework_960.jpg']),
    //         CardFactory.actions([
    //             {
    //                 type: 'openUrl',
    //                 title: 'Get started',
    //                 value: 'https://docs.microsoft.com/en-us/azure/bot-service/'
    //             }
    //         ])
    //     );
    // }
}

module.exports.MyBot = MyBot;