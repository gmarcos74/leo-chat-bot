const { AttachmentLayoutTypes, ActivityTypes, ActionTypes, CardFactory } = require('botbuilder');
const { ChoicePrompt, WaterfallDialog, DialogSet, DialogTurnStatus, ListStyle } = require('botbuilder-dialogs');
const { FlickrAddon } = require('./flickr');

const flickrAddon = new FlickrAddon();

class MyBot {
    constructor(conversationState, userState) {
        this.dialogStateAccessor = conversationState.createProperty("DialogState");
        this.userProfileAccessor = userState.createProperty("userProfile");
        this.lastOwnerAccessor = userState.createProperty("lastOwnerInfo");
        this.conversationState = conversationState;
        this.userState = userState;

        this.dialogs = new DialogSet(this.dialogStateAccessor);
        
        const prompt = new ChoicePrompt('nextPrompt');
        prompt.style = ListStyle.list;
        this.dialogs.add(prompt);
        
        this.dialogs.add(new WaterfallDialog("TopLevelDialog")
            .addStep(this.randomFlickrPics.bind(this))
            .addStep(this.acknowledgementStep.bind(this)));

        this.dialogs.add(new WaterfallDialog("WhatsNextDialog")
            .addStep(this.whatsNext.bind(this))
            .addStep(this.whatsAcknowledgeNext.bind(this)));

        this.busyProcessing = false;
    }

    async onTurn(turnContext) {
        //On Turn Message handling
        
        if (turnContext.activity.type === ActivityTypes.Message) {
            //Dialog set and control over postback and invoked messages

            //There are two dialog sets:
            //a. the main waterfall which is the display 5, display description, and get achknowledgment
            //b. Acknowledgement or more dialog

            const dialogContext = await this.dialogs.createContext(turnContext);
            
            if (turnContext.activity.value) {
                var valueParsed = JSON.parse(turnContext.activity.value);

                console.log("RESP: " + JSON.stringify(valueParsed));

                switch (valueParsed.title) {
                    case "author_search":
                        await this.saveUserState(turnContext, valueParsed.value, 1);

                        await this.randomFlickrPicsByAuthor(turnContext, valueParsed.value, 0);
                        await dialogContext.continueDialog();
                        await this.conversationState.saveChanges(turnContext);
                        break;
                    case "description":
                        if (!valueParsed.value) {
                            valueParsed.value = "No description available";
                        }
                        await turnContext.sendActivity(valueParsed.value);
                        break;
                }
            } else {
                const results = await dialogContext.continueDialog();
                if (results && results.status) {
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
                            
                            await turnContext.sendActivity(status);
                            await this.userProfileAccessor.set(turnContext, userInfo);
                            await this.userState.saveChanges(turnContext);
                            break;
                        case DialogTurnStatus.waiting:
                            // If there is an active dialog, we don't need to do anything here.
                            break;
                    }
                }
            }
            await this.conversationState.saveChanges(turnContext);
        } else if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            if (turnContext.activity.membersAdded.length !== 0) {
                for (var idx in turnContext.activity.membersAdded) {
                    if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                        //const welcomeCard = CardFactory.adaptiveCard(WelcomeCard);
                        //await context.sendActivity({ attachments: [welcomeCard] });
                        await turnContext.sendActivity("Welcome to LeO Flickr Bot! Say hello!");
                    }
                }
            }
        } else if (turnContext.activity.type === ActivityTypes.Invoke) {
            //Meant to invoke
            console.log("VALUE: " + JSON.stringify(turnContext.activity));
        } else {
            //Default
            console.log("OTHER: " + JSON.stringify(turnContext.activity.value));
        }
    
    }

    async saveUserState(context, owner_id, next_batch) {
        const ownerPhotoID = await this.lastOwnerAccessor.get(context, {});
        ownerPhotoID.owner_id = owner_id;
        ownerPhotoID.next = next_batch;
        await this.lastOwnerAccessor.set(context, ownerPhotoID);
        await this.userState.saveChanges(context);
    }

    async randomFlickrPics(stepContext) {        
        var newFlickrCards = await this.createRandomFlickrCards();
        await stepContext.context.sendActivity("Please wait while loading...");
        await stepContext.context.sendActivity({ 
            attachments: newFlickrCards, 
            attachmentLayout: AttachmentLayoutTypes.Carousel 
        });

        return true;
    }
    
    async randomFlickrPicsByAuthor(turnContext, ownerID, nextBatch) {
        var newFlickrCards = await this.createFlickrCardsByAuthor(ownerID, nextBatch);
        await turnContext.sendActivity("Please wait while loading...");
        await turnContext.sendActivity({ 
            attachments: newFlickrCards, 
            attachmentLayout: AttachmentLayoutTypes.Carousel 
        });        
    }

    async whatsNext(stepContext) {
        const promptOptions = {
            prompt: 'What\'s Next?',
            retryPrompt: 'That was not a valid choice, please select a choice 1 or 2.',
            choices: this.getChoices()
        };

        return await stepContext.prompt('nextPrompt', promptOptions);        
    }

    async whatsAcknowledgeNext(stepContext) {
        const choiceResult = stepContext.result || 2;
        const ownerPhotoID = await this.lastOwnerAccessor.get(stepContext.context, {});
        
        if (!choiceResult.index) {
            ownerPhotoID.next++;
            
            //await this.lastOwnerAccessor.set(stepContext.context, ownerPhotoID);
            //await this.userState.saveChanges(stepContext.context);

            await this.saveUserState(stepContext.context, ownerPhotoID.owner_id, ownerPhotoID.next);

            await this.randomFlickrPicsByAuthor(stepContext.context, ownerPhotoID.owner_id, ownerPhotoID.next);
            await stepContext.endDialog("Fini!");
            return stepContext.beginDialog("WhatsNextDialog");
        } else {
            //ownerPhotoID.owner_id = 0;
            //ownerPhotoID.next = 0;
            //await this.lastOwnerAccessor.set(stepContext.context, ownerPhotoID);
            //await this.userState.saveChanges(stepContext.context);
            
            await this.saveUserState(stepContext.context, 0, 0);

            await stepContext.context.sendActivity(`Thanks for looking around.`);
            await stepContext.endDialog("Fini!");
            return stepContext.beginDialog("TopLevelDialog");
        }
    }

    async acknowledgementStep(stepContext) {
        await stepContext.endDialog("Fini!");

        const ownerPhotoID = await this.lastOwnerAccessor.get(stepContext.context, {});

        if (ownerPhotoID.owner_id) {
            //ID provided, move ask next
            await stepContext.endDialog("Fini!");
            return stepContext.beginDialog("WhatsNextDialog");
        } else {
            //Just restart
            await stepContext.endDialog("Fini!");
            return stepContext.beginDialog("TopLevelDialog");
        }
    }

    async createRandomFlickrCards() {
        var fiveNewImageCards = [];
        var fiveNewPhotos = await flickrAddon.flickrGetRandomImages();

        //console.log("NEW PHOTOS: " + JSON.stringify(fiveNewPhotos, null, 2));      

        fiveNewPhotos.map(function(fiveNewPhotosElement) {
            fiveNewImageCards.push(
                CardFactory.heroCard(
                    fiveNewPhotosElement.photo_info.title,

                    "_Author:_ " + fiveNewPhotosElement.photo_info.author_name + "\n" +
                        "_Date Taken:_ " + fiveNewPhotosElement.photo_info.date_taken,    

                    CardFactory.images([ fiveNewPhotosElement.base_url ]),
                    CardFactory.actions([
                        {
                            type: ActionTypes.MessageBack,
                            title: "Description",
                            text: "description",
                            value: JSON.stringify({
                                title: 'description',
                                value: fiveNewPhotosElement.photo_info.description
                            })
                        }
                    ]),
                    { tap: 
                        {
                            type: ActionTypes.MessageBack,
                            title: "Show More",
                            text: "showmore",
                            value: JSON.stringify({
                                title: 'author_search',
                                value: fiveNewPhotosElement.photo_info.owner_id
                            })
                        } 
                    }
                )
            );
        });

        return fiveNewImageCards;
    }

    async createFlickrCardsByAuthor(ownerID, startList) {
        var fiveNewImageCards = [];
        var fiveNewPhotos = await flickrAddon.flickrGetImagesByAuthor(ownerID, startList);

        fiveNewPhotos.map(function(fiveNewPhotosElement) {
            fiveNewImageCards.push(
                CardFactory.heroCard(
                    fiveNewPhotosElement.photo_info.title,

                    "_Author:_ " + fiveNewPhotosElement.photo_info.author_name + "\n" +
                        "_Date Taken:_ " + fiveNewPhotosElement.photo_info.date_taken,    

                    CardFactory.images([ fiveNewPhotosElement.base_url ]),
                    CardFactory.actions([
                        {
                            type: ActionTypes.MessageBack,
                            title: "Description",
                            text: "description",
                            value: JSON.stringify({
                                title: 'description',
                                value: fiveNewPhotosElement.photo_info.description
                            })
                        }
                    ])
                )
            );
        });

        return fiveNewImageCards;
    }

    getChoices() {
        const cardOptions = [
            {
                value: 'Show more from this author',
                synonyms: ['1', 'more', 'show more']
            },
            {
                value: 'Go back to start',
                synonyms: ['2', 'restart', 'home']
            }
        ];

        return cardOptions;
    }
}

module.exports.MyBot = MyBot;