enyo.kind({
    name: "ThreadView",
    kind: "FittableRows",
    fit:true,
    published: {
        thread: "",   // a ThreadModel
        recipientAddr: "",   // for example: george or john@example.com
        messageText: ""
    },
    bindings:[
        {from:"app.$.globalThreadCollection", to:"globalThreadCollection"},
        {from:"app.$.globalPersonCollection.status", to:"globalPersonCollectionStatus"},
        {from:".thread.attributes.draftMessage", to: ".$.messageTextArea.value"},
        {from: "recipientAddr", to: "$.contactsSearchList.searchText"}
    ],
    events: {
        onSelectThread:"",
        onDeleteThread:""
    },
    components: [
        {
            kind:"Panels",
            fit:true,
            draggable: false,
            components:[
                {
                    name:"existingThreadPanel",
                    kind:"FittableRows",
                    components:[
                        {
                            name: "topToolbar",
                            kind:"onyx.Toolbar",
                            layoutKind:"FittableColumnsLayout",
                            components:[
                                {name:"imStatus", style:"height:20px;", classes:"toolbar-status status-unknown", kind:"onyx.Icon"},
                                {name:"headerText", content:"Name name", fit:true},
                                {kind: 'onyx.PickerDecorator', components: [
                                    {}, //this uses the defaultKind property of PickerDecorator to inherit from PickerButton
                                    {name:"addrSelect", kind: 'onyx.Picker', components: [   // TODO: dynamically populate
                                        {content: "206-555-1212", active: true},
                                        {content: "jdoe@gmail.com"}
                                    ]}
                                ]}
                            ]
                        },
                        {
                            name: "messageList",
                            classes: "threads-list",
                            kind: "enyo.DataList",
                            fit: true,
                            collection: null,
                            scrollerOptions: {
                                horizontal: "hidden",
                                touch: true
                            },
                            components: [
                                { kind: "MessageItem", classes: "thread-item", ontap: "showMessageMenu"}
                            ]
                        },

                        {kind: 'onyx.Menu', components: [
                            {content: $L("Forward"), classes: 'onyx-menu-label'},
                            //{content: $L("Forward via Email")},
                            //{content: $L("Copy Text")},
                            {classes: 'onyx-menu-divider'},
                            {content: $L("Delete"), ontap: 'deleteMessage'},
                        ]}
                    ]
                },
                {
                    name:"newThreadPanel",
                    kind:"FittableRows",
                    classes:"threads-contactslist",
                    components:[
                        {
                            kind:"onyx.Toolbar",
                            components:[{kind:"onyx.Button", content:$L("Cancel"), ontap:"deleteThread"}, {content:$L("New Conversation")}]
                        },
                        {
                            name:"contactsSearchList",
                            kind:"ContactsSearchList",
                            classes:"threads-contactslist",
                            fit:true,
                            onSelected:"newContactSelected"
                        }

                    ]
                }
            ]
        },

        {
            name: "bottomToolbar",
            kind:"FittableColumns",
            classes: "onyx-toolbar-inline",
            components: [
                {
                    kind: "onyx.InputDecorator",
                    fit:true,
                    alwaysLooksFocused: true,
                    layoutKind:"FittableColumnsLayout",
                    style:"padding:0px; margin:1px;",
                    components: [
                        {
                            name:"messageTextArea",
                            kind: "onyx.TextArea",
                            fit:true,
                            placeholder: "Type a new message ...",
                            classes:"enyo-selectable",
                            onkeyup:"messageTextAreaChanged",
                            style:"padding:8px;"
                        },
                        {
                            name:"attachItemIcon",
                            kind:"onyx.IconButton",
                            src:"assets/menu-icon-attach.png",
                            classes:"textareaBtn",
                            ontap:"selectAttachment"
                        },
                        {
                            name:"sendMessageIcon",
                            kind:"onyx.IconButton",
                            src:"assets/header-send-icon.png",
                            classes:"textareaBtn",
                            ontap:"sendMessage"
                        }
                    ]
                }
            ]
        },
        {
            name: "messageCollection",
            kind: "MessageCollection",
            threadId: ""
        },
        {
            name: 'putMessageService', kind: 'enyo.LunaService',
            service: 'luna://org.webosports.service.messaging', method: 'putMessage',
            mock: ! ('PalmSystem' in window),
            onResponse: 'putMessageRspns', onError: 'serviceErr'
        },
        {
            name: 'updateThreadValuesService', kind: 'enyo.LunaService',
            service: 'luna://org.webosports.service.messaging', method: 'updateThreadValues',
            mock: ! ('PalmSystem' in window),
            onError: 'serviceErr'
        }
    ],
    create: function () {
        this.inherited(arguments);
        this.log("==========> Created thread view");

        this.$.messageList.set("collection", this.$.messageCollection);
    },

    globalPersonCollectionStatusChanged: function(){
        this.$.contactsSearchList.refilter();
    },
    threadChanged: function() {
        this.log("Thread is ", this.thread && this.thread.get("_id"),this.thread, this.$.messageCollection);

        this.$.messageCollection.empty();
        this.$.messageList.refresh();
        this.$.headerText.setContent(this.thread.get("displayName")||this.thread.get("replyAddress"));

        var threadId = this.thread.get("_id");
        if (threadId){
            this.$.panels.setIndex(0);
            this.$.messageCollection.threadId = threadId;
            this.$.messageCollection.fetch({where: [{prop:"conversations",op:"=",val:threadId}],
                merge: true,
                success: enyo.bindSafely(this, "messageListChanged")});

        }else{
            this.$.panels.setIndex(1);
        }
    },
    messageTextChanged: function () {
        this.$.messageTextArea.set('value', this.messageText);
    },
    messageListChanged: function() {
        console.log("messageListChanged", this.messageCollection);
        this.$.messageList.refresh();
    },
    messageTextAreaChanged: function(s,inEvent){
        //console.log("messageTextAreaChanged", s, inEvent);
        if (s.getValue()!=""){
            //this.$.attachItemIcon.hide();
            this.$.sendMessageIcon.show();
        }else{
            //this.$.attachItemIcon.show();
            this.$.sendMessageIcon.show();
        }
    },
    sendMessage:function(s,inEvent){
        this.log();

        var messageText = this.$.messageTextArea.getValue();
        var localTimestamp = new moment();
        var threadId = this.thread.get("_id");

        var toArray = [];
        var message = {_kind: "com.palm.smsmessage:1", conversations: [threadId], folder: "outbox",
            localTimestamp: localTimestamp.format("X"), messageText: messageText, flags:{visible:true},
            networkMsgId: 0, priority: 0, serviceName: "sms", smsType: 0, status: "pending", timestamp: 0, to: toArray };

        var toAddress = this.thread.get("replyAddress") || this.$.contactsSearchList.get("searchText").trim();
        if (toAddress){
            toArray.push({addr: toAddress});
            message.to = toArray;
            message = new MessageModel(message);
            this.log("submitting message", message.raw(), message.dbKind);

            this.$.putMessageService.send({message: message.raw()});
        }else{
            //TODO: no reply address, give warning to user.
            var msg = $L("Pick a recipient");
            this.log(msg, messageText);
            if (window.PalmSystem) { PalmSystem.addBannerMessage(msg, '{ }', "icon.png", "alerts"); }
        }

        inEvent.preventDefault();
        return true;
    },
    putMessageRspns: function (inSender, inEvent) {
        var threadView = this;
        var messageThreadIds = inEvent.threadids;
        var viewThreadId = this.thread.get("_id");
        var threadMatch = messageThreadIds.indexOf(viewThreadId) >= 0;
        this.log("viewThreadId:", viewThreadId, "   messageThreadIds:", messageThreadIds, "  threadMatch:", threadMatch);
        if (! threadMatch) {   // none of the message threads match the view thread
            var existingThread = this.globalThreadCollection.find(function (thread) {return messageThreadIds.indexOf(thread.get('_id')) >= 0 });
            this.log("existingThread:", existingThread && existingThread.toJSON());
            if (existingThread) {
                this.doSelectThread({thread: existingThread});
            } else if (!viewThreadId) {   // if globalThreadCollection is updated before this method is called, this branch won't be taken
                // configures this new thread w/ real ID & placeholder data
                this.thread.set({_id: messageThreadIds[0], replyAddress: "[entered addr]", summary: "[msg text]"});
                this.thread.fetch({success: function (thread, opts, result, source) {
                    enyo.log("thread.fetch success:", arguments, threadView.thread.attributes);
                    threadView.doSelectThread({thread: threadView.thread});
                    threadView.threadChanged();   // wouldn't be called because thread is same
                }});
            } else {   // the message threads are not in the global collection
                var msg = $L("Please file a detailed bug report") + " [can't find thread]";
                this.log(msg, "viewThreadId:", viewThreadId, "   messageThreadIds:", messageThreadIds);
                if (window.PalmSystem) { PalmSystem.addBannerMessage(msg, '{ }', "icon.png", "alerts"); }
            }
        }
        // the watch on the thread will update the list of messages
        this.$.messageTextArea.setValue("");
        this.$.messageTextArea.blur();
    },
    serviceErr: function (inSender, inError) {
        this.error(inError);
        if (window.PalmSystem) { PalmSystem.addBannerMessage(inError.errorText || inError.toJSON(), '{ }', "icon.png", "alerts"); }
    },

    selectAttachment: function(inSender, inEvent) {
        var msg = $L("Attaching not yet implemented");
        enyo.warn(msg);
        if (window.PalmSystem) { PalmSystem.addBannerMessage(msg, '{ }', "icon.png", "alerts"); }
        inEvent.preventDefault();
        return true;
    },

    // TODO: rework the contactspicker to select an IM address or phone number.  We shouldn't just blindly use the "primaryPhoneNumber".
    newContactSelected: function(sender,evt){
        enyo.log("contact selected", evt, this.thread);
        var personModel = evt.person;
        if (personModel) {
            this.thread.set("displayName", personModel.get("displayName"));
            this.thread.set("personId", personModel.get("_id"));
            this.thread.set("replyAddress", personModel.get("primaryPhoneNumber").value);
        } else {
            enyo.warn("no person");
        }
    },

    newThreadCreated: function(rec, opts){
        enyo.log("new thread created", rec, opts);
        this.set("thread", rec, true);
    },

    deleteThread: function(s,inEvent){
        this.log();
        this.doDeleteThread({thread:this.get("thread")});
    },

    showMessageMenu: function(inSender, inEvent) {
        this.menuMessageIdx = inEvent.index;
        this.menuMessage = this.$.messageCollection.at(inEvent.index);
        this.$.menu.showAtEvent(inEvent, {left: 10});
    },

    deleteMessage: function(inSender, inEvent) {
        this.log(this.menuMessageIdx, this.menuMessage);

        var threadView = this;
        this.menuMessage.destroy({source: 'db8', success: function () {
            console.log("destroy success", threadView.$.messageCollection.length);
            if (threadView.$.messageCollection.length === 0) {
                threadView.doDeleteThread({thread:threadView.thread});
            } else if (threadView.menuMessageIdx === threadView.$.messageCollection.length) { // deleted latest message
                var newLastMessage = threadView.$.messageCollection.at(threadView.$.messageCollection.length-1);
                console.log("newLastMessage:",newLastMessage);
                threadView.$.updateThreadValuesService.send({threadId:threadView.thread.get("_id"), message: newLastMessage});
            }
        }});
    }
});
