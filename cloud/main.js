Parse.Cloud.define("acceptFollowRequest", function(request, response) {

    console.log("> acceptFollowRequest");
    Parse.Cloud.useMasterKey();

    var Follows = Parse.Object.extend("Follows");
    var follows = new Follows();

    var me = new Parse.User.current();
    var user = new Parse.User();
    user.id = request.params.followerId;
    var meName = me.attributes.profile.name;
    console.log("|_ acceptFollow request from " + user.id + " by " + me.id);

    var query = new Parse.Query(Follows);

    query.equalTo("user", user);
    query.equalTo("follows", me);
    query.find({
        success: function(results) {
            if (results.length > 0) {
                var relationship = results[0];
                if (relationship.get("accepted")) {
                    response.error("The request has already been accepted!");
                } else {
                    relationship.save({
                        "accepted": true
                    }, {
                        success: function(result) {
                            user.increment("followingCount");
                            me.increment("followersCount");
                            user.save();
                            me.save();
                            response.success("follow request accepted successfully!");
                            // Push Notification Code..
                            var pushQuery = new Parse.Query(Parse.Installation);
                            pushQuery.equalTo('user', user);
                            Parse.Push.send({
                                where: pushQuery, // Set our Installation query
                                data: {
                                    alert: meName + " has accepted your follow request.",
                                    sound: "default",
                                    WhisperId: "followAccepted",
                                    badge: "Increment",
                                    pushType: "followAccepted"

                                }
                            }, {
                                success: function(success) {
                                    console.log("Push send successfully..  ");
                                    response.success("Follow accepted push sent.");
                                },
                                error: function(error) {
                                    console.log("Error: " + error.code + " " + error.message);
                                    response.error("unable to sent FollowAccepted push due to " + error.message);
                                }
                            });

                        },
                        error: function() {
                            response.error("An error occurred when accepting the relationship!");
                        }
                    });
                }
            } else {
                response.error("No request exists!");
            }
        },
        error: function() {
            response.error("Relationship location failed!");
        }
    });
});

Parse.Cloud.define("addActivity", function(request, response) {
    var me = new Parse.User.current();
    var Follows = Parse.Object.extend("Follows");
    var Whisper = Parse.Object.extend("Whisper");
    var _follows = new Follows();

    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {
            var whisperObj = _whisper;
            console.log("Whisper Object Id: " + whisperObj.id);
            _follows.set("user", me);
            _follows.set("activityType", request.params.activityType);
            _follows.set("whisper", whisperObj);

            _follows.save(null, {
                success: function(follows) {
                    // Execute any logic that should take place after the object is saved.
                    console.log("Whistle activity saved :" + follows.id);
                    response.success("Whistle activity saved");
                },
                error: function(gameScore, error) {
                    console.log("Follow query failed : " + error.message);
                    response.error("Follow query failed : " + error.message);
                }
            });
        },
        error: function(error) {
            // Execute any logic that should take place if the save fails.
            // error is a Parse.Error with an error code and message.
            console.log("Whisper retrieval failed: " + error.message);
            response.error("Whisper retrieval failed: " + error.message);
        }
    });
});

Parse.Cloud.define("allWhispers", function(request, response) {
    var resultWhisperArray = [];
    var resultWhisperCount = 0;
    var totalRecord = 0;
    var pageSize = 100;
    var counts = 0;
    //Retrieving Total Record Count
    var Whisper = Parse.Object.extend("Whisper");
    var query = new Parse.Query(Whisper);
    query.count({
        success: function(number) {
            totalRecord = number;
            var myWhisperCount = 0;
            var counts = Math.ceil(totalRecord / pageSize);
            for (var i = 0; i < counts; i++) {

                var fetchData = Parse.Object.extend("Whisper");
                var fetchQuery = new Parse.Query(fetchData);
                fetchQuery.include("createdBy");
                fetchQuery.skip(pageSize * i);
                fetchQuery.find({
                    success: function(whispers) {
                        if (whispers.length > 0) {
                            console.log(" └─ " + whispers.length + " whisper found");
                            for (var j = 0; j < whispers.length; j++) {
                                var whisper = whispers[j];
                                resultWhisperArray[resultWhisperCount] = whisper;
                                resultWhisperCount = resultWhisperCount + 1;

                            }
                            if (resultWhisperCount == totalRecord) {
                                console.log('resultWhisperArray length: ' + resultWhisperArray.length);
                                response.success(resultWhisperArray);
                            }

                        } else {
                            console.log(" └─ no whisper found");
                            response.error("No whisper for you :P");

                        }
                    },
                    error: function(error) {
                        console.log(" └─ whisper query fail, error :" + error.message);
                        response.error("└─ whisper query fail, error :" + error.message);
                    }
                });
            }

        },
        error: function(error) {
            console.log(" └─ count query fail, error :" + error.message);
            response.error("└─ count query fail, error :" + error.message);
        }
    });

});

Parse.Cloud.define("audioCommentsAgainstWhisper", function(request, response) {
    var audioQuery = new Parse.Query('AudioComments');
    var Whisper = Parse.Object.extend("Whisper");
    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {
            var whisperObj = _whisper;
            audioQuery.equalTo("whisper", whisperObj);
            audioQuery.include('whisper');
            audioQuery.include('user');
            audioQuery.limit(1000);
            audioQuery.find({
                success: function(audioComments) {
                    if (audioComments.length > 0) {
                        console.log('audioComments.length: ' + audioComments.length);
                        response.success(audioComments);

                    } else {
                        console.log('No audioComments against whisper...');
                        response.error("No audioComments against whisper...");
                    }
                },
                error: function(error) {
                    console.log('audioComments query failed due to ' + error.message);
                    response.error("audioComments query failed due to " + error.message);
                }
            });
        },
        error: function(error) {
            console.log('whisper query failed due to ' + error.message);
            response.error("whisper query failed due to  " + error.message);
        }
    });

});

Parse.Cloud.define("AudioCommentsUpdate", function(request, response) {
    var Whisper = Parse.Object.extend("Whisper");
    var AudioComments = Parse.Object.extend("AudioComments");
    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {
            var whisperObj = _whisper;
            var query = new Parse.Query(AudioComments);
            query.get(request.params.audioCommentID, {
                success: function(result) {
                    result.set('whisper', whisperObj);
                    result.save();
                    response.success('AudioComment record updated.');
                },
                error: function(error) {
                    console.log('AudioComments query failed due to ..' + error.message);
                    response.error('AudioComments query failed due to ..' + error.message);
                }
            });
        },
        error: function(error) {
            console.log('whisper query failed due to ' + error.message);
            response.error("whisper query failed due to  " + error.message);
        }
    });

});

Parse.Cloud.define("commentsCount", function(request, response) {

    console.log("commentsCount");

    var Whisper = Parse.Object.extend("Whisper");

    console.log(" ├─ whisperID :" + request.params.whisperID);

    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {

        success: function(_whisper) {

            _whisper.increment("commentsCount");
            _whisper.save(null, {
                success: function(_whisper) {
                    console.log(" └─ commentsCount incremented !.");
                    response.success({
                        message: "commentsCount incremented!",
                        commentsCount: _whisper.get("commentsCount")
                    });
                },
                error: function(_whisper, error) {
                    console.log(" ├─  increment fail, error :" + error.message);
                    response.error("unable to increment commentsCount !");
                }
            });
            console.log(" ├─ commentsCount !");
        },
        error: function(object, error) {
            console.log(" └─ whisper not found error :" + error.message);
            response.error("whisper not found ");
        }
    });
});

Parse.Cloud.define("deleteWhisper", function(request, response) {

    var query = new Parse.Query("Whisper");
    var queryHeard = new Parse.Query("HeardWhisper");
    var queryWhistles = new Parse.Query("Whistles");
    var queryAudioComments = new Parse.Query("AudioComments");
    var queryReportWhispers = new Parse.Query("ReportedWhispers");
    var whisperID = request.params.whisperID;

    query.get(whisperID, {
        success: function(whisper) {
            var message = 'success fully deleted.';
            console.log('Deleting object Id ' + whisper.id);
            queryHeard.equalTo("whisper", whisper);
            queryHeard.find().then(function(heardWhispers) {
                return Parse.Object.destroyAll(heardWhispers);
            }).then(function(success) {
                console.log('HeardWhisper against whisper deleted.');
                queryWhistles.equalTo("whisper", whisper);
                queryWhistles.find().then(function(whistles) {
                    return Parse.Object.destroyAll(whistles);
                }).then(function(success) {
                    console.log('Whistles against whisper deleted.');
                    queryAudioComments.equalTo("whisper", whisper);
                    queryAudioComments.find().then(function(audioComments) {
                        return Parse.Object.destroyAll(audioComments);
                    }).then(function(success) {
                        console.log('AudioComments against whisper deleted.');
                        queryReportWhispers.equalTo("whisper", whisper);
                        queryReportWhispers.find().then(function(reportedWhispers) {
                            return Parse.Object.destroyAll(reportedWhispers);
                        }).then(function(success) {
                            console.log('reportedWhispers against whisper deleted.');
                            whisper.destroy({
                                success: function(result) {
                                    console.log('whisper deleted.');
                                    response.success(message);
                                },
                                error: function(error) {
                                    console.error("Error deleting  whisper: " + error.code + ": " + error.message);
                                    response.error("Error deleting  whisper: " + error.code + ": " + error.message);
                                }
                            });


                        }, function(error) {
                            console.error("Error deleting related AudioComments: " + error.code + ": " + error.message);
                            response.error("Error deleting related AudioComments: " + error.code + ": " + error.message);
                        });



                    }, function(error) {
                        console.error("Error deleting related AudioComments: " + error.code + ": " + error.message);
                        response.error("Error deleting related AudioComments: " + error.code + ": " + error.message);
                    });
                }, function(error) {
                    console.error("Error deleting related Whistles: " + error.code + ": " + error.message);
                    response.error("Error deleting related Whistles: " + error.code + ": " + error.message);
                });

            }, function(error) {
                console.error("Error deleting related HeardWhispers: " + error.code + ": " + error.message);
                response.error("Error deleting related HeardWhispers: " + error.code + ": " + error.message);
            });

        },
        error: function(object, error) {
            var message = 'User ' + request.user.getUsername() + ' could not find Whisper:  ' + whisperID + ' for deletion';
            response.error(message);
            console.log(message);
        }
    });
});

Parse.Cloud.define("deleteAgainstWhisper", function(request, response) {

    var query = new Parse.Query("Whisper");
    var queryHeard = new Parse.Query("HeardWhisper");
    var queryWhistles = new Parse.Query("Whistles");
    var queryAudioComments = new Parse.Query("AudioComments");
    var queryReportWhispers = new Parse.Query("ReportedWhispers");
    var queryFollow = new Parse.Query("Follows");
    var whisperID = request.params.whisperID;

    query.get(whisperID, {

        success: function(whisper) {
            var message = 'success fully deleted.';
            console.log('Deleting object Id ' + whisper.id);
            queryHeard.equalTo("whisper", whisper);
            queryHeard.find().then(function(heardWhispers) {
                return Parse.Object.destroyAll(heardWhispers);
            }).then(function(success) {
                console.log('HeardWhisper against whisper deleted.');
                queryWhistles.equalTo("whisper", whisper);
                queryWhistles.find().then(function(whistles) {
                    return Parse.Object.destroyAll(whistles);
                }).then(function(success) {
                    console.log('Whistles against whisper deleted.');
                    queryAudioComments.equalTo("whisper", whisper);
                    queryAudioComments.find().then(function(audioComments) {
                        return Parse.Object.destroyAll(audioComments);
                    }).then(function(success) {
                        console.log('AudioComments against whisper deleted.');
                        queryReportWhispers.equalTo("whisper", whisper);
                        queryReportWhispers.find().then(function(reportedWhispers) {
                            return Parse.Object.destroyAll(reportedWhispers);
                        }).then(function(success) {
                            console.log('reportedWhispers against whisper deleted.');
                            queryFollow.equalTo("whisper", whisper);
                            queryFollow.find().then(function(follows) {
                                return Parse.Object.destroyAll(follows);
                            }).then(function(success) {
                                console.log('Follows against whisper deleted.');
                                whisper.destroy({
                                    success: function(result) {
                                        console.log('whisper deleted.');
                                        response.success(message);
                                    },
                                    error: function(error) {
                                        console.error("Error deleting  whisper: " + error.code + ": " + error.message);
                                        response.error("Error deleting  whisper: " + error.code + ": " + error.message);
                                    }
                                });
                            }, function(error) {
                                console.error("Error deleting related Follows: " + error.code + ": " + error.message);
                                response.error("Error deleting related Follows: " + error.code + ": " + error.message);
                            });

                        }, function(error) {
                            console.error("Error deleting related ReportedWhispers: " + error.code + ": " + error.message);
                            response.error("Error deleting related ReportedWhispers: " + error.code + ": " + error.message);
                        });

                    }, function(error) {
                        console.error("Error deleting related AudioComments: " + error.code + ": " + error.message);
                        response.error("Error deleting related AudioComments: " + error.code + ": " + error.message);
                    });

                }, function(error) {
                    console.error("Error deleting related Whistles: " + error.code + ": " + error.message);
                    response.error("Error deleting related Whistles: " + error.code + ": " + error.message);
                });

            }, function(error) {
                console.error("Error deleting related HeardWhispers: " + error.code + ": " + error.message);
                response.error("Error deleting related HeardWhispers: " + error.code + ": " + error.message);
            });

        },
        error: function(object, error) {
            var message = 'User ' + request.user.getUsername() + ' could not find Whisper:  ' + whisperID + ' for deletion';
            response.error(message);
            console.log(message);
        }

    });

});

Parse.Cloud.define("follow", function(request, response) {
    console.log("> follow");
    var Follows = Parse.Object.extend("Follows");
    var follows = new Follows();
    var CurrentUserName;

    var user = new Parse.User.current();
    var followsUser = new Parse.User();

    followsUser.id = request.params.followsId;
    CurrentUserName = user.attributes.profile.name;

    console.log("|_ follow request from " + user.id + " to follow " + followsUser.id);

    var query = new Parse.Query("Follows");

    query.equalTo("user", user);
    query.equalTo("follows", followsUser);
    query.count({
        success: function(count) {
            console.log("|_ follow request count = " + count);
            if (count <= 0) {
                var pushQuery = new Parse.Query(Parse.Installation);
                pushQuery.equalTo('user', followsUser);
                Parse.Push.send({
                    where: pushQuery, // Set our Installation query
                    data: {
                        alert: "" + CurrentUserName + " wants to follow you.",
                        sound: "default",
                        WhisperId: "follow",
                        badge: "Increment",
                        pushType: "follow"
                    }
                }, {
                    success: function(success) {
                        console.log("Push send successfully..  ");
                        response.success("Push Send!");
                    },
                    error: function(error) {
                        console.log("Error: " + error.code + " " + error.message);
                        response.error("unable to push send");
                    }
                });
                follows.set("user", user);
                follows.set("follows", followsUser);
                follows.set("activityType", 'follow');

                /*
                 *  For Beta :)
                 */
                follows.set("accepted", false);
                //followsUser.increment("followersCount");
                //user.increment("followingCount");
                follows.save();


                response.success("follow request send successfully!");
            } else {
                response.error("The relationship already exists!");
            }
        },
        error: function() {
            response.error("Relationship location failed!");
        }
    });
});

Parse.Cloud.define("friendWhispers", function(request, response) {

    console.log('friends calling..');

    var pageNumber = request.params.pageNumber;
    var pageVolume = request.params.pageVolume;

    var resultWhisperArray = [];
    var resultWhisperCount = 0;
    var _me = new Parse.User.current();
    var User = Parse.Object.extend("User");
    var Whisper = Parse.Object.extend("Follows");
    var innerQuery = new Parse.Query(User);
    innerQuery.equalTo("objectId", _me.id);
    var query = new Parse.Query(Whisper);
    query.equalTo("accepted", true);
    query.matchesQuery("user", innerQuery);
    query.find({
        success: function(result) {
            if (result < 0) {
                for (var i = 0; i < result.length; i++) {
                    var obj = result[i];
                    var currentfriendId = obj.attributes.follows.id;
                    console.log('friendId: ' + currentfriendId);
                    var User = Parse.Object.extend("User");
                    var Whisper = Parse.Object.extend("Whisper");
                    var innerQuery = new Parse.Query(User);
                    innerQuery.equalTo("objectId", currentfriendId);
                    var query = new Parse.Query(Whisper);

                    query.matchesQuery("createdBy", innerQuery);
                    query.find({
                        success: function(whispers) {
                            if (whispers.length > 0) {
                                console.log(" └─ " + whispers.length + " whisper found");
                                for (var j = 0; j < whispers.length; j++) {
                                    var whisper = whispers[j];
                                    resultWhisperArray[resultWhisperCount] = whisper;
                                    resultWhisperCount = resultWhisperCount + 1;

                                }
                                if (j == whispers.length) {
                                    console.log('resultWhisperArray length: ' + resultWhisperArray.length);
                                    response.success(resultWhisperArray);
                                }

                            } else {
                                console.log(" └─ no whisper found");
                                response.error("No whisper for you :P");

                            }
                        },
                        error: function(error) {
                            console.log(" └─  query fail, error :" + error.message);
                            response.error(" └─  query fail, error :" + error.message);

                        }
                    });
                }

            } else {
                console.log('no whisper against friends..');
                var myWhisper = Parse.Object.extend("Whisper");
                var whisperquery = new Parse.Query(myWhisper);
                whisperquery.equalTo("createdBy", _me);
                whisperquery.include("createdBy");
                whisperquery.find({
                    success: function(whispers) {
                        console.log(" └─ " + whispers.length + " whisper found");
                        for (var j = 0; j < whispers.length; j++) {
                            var whisper = whispers[j];
                            resultWhisperArray[resultWhisperCount] = whisper;
                            resultWhisperCount = resultWhisperCount + 1;

                        }
                        if (j == whispers.length) {
                            console.log('resultWhisperArray length: ' + resultWhisperArray.length);
                            response.success(resultWhisperArray);
                        }
                    },
                    error: function(error) {
                        console.log(" └─myWhisper  query fail, error :" + error.message);
                        response.error(" └─myWhisper fail, error :" + error.message);

                    }
                });

            }

        },
        error: function(error) {
            console.log(" └─  query fail, error :" + error.message);
            response.error(" └─  query fail, error :" + error.message);

        }
    });

});

Parse.Cloud.define("getActivity", function(request, response) {

    var followActivityList = [];
    console.log('get activity called..');
    var _me = new Parse.User.current();
    console.log('currentUserId: ' + _me.id);
    var Follows = Parse.Object.extend("Follows");
    var queryFollows = new Parse.Query(Follows);
    queryFollows.containedIn("activityType", ["comment", "whistle"]);
    queryFollows.include('whisper');
    queryFollows.include('user');
    queryFollows.descending("createdAt");
    queryFollows.find({
        success: function(follows) {
            console.log('result count: ' + follows.length);
            for (var i = 0; i < follows.length; i++) {
                var followsObj = follows[i];

                console.log('whisper Created User Id: ' + followsObj.attributes.whisper.attributes.createdBy.id);
                if (followsObj.attributes.whisper.attributes.createdBy.id == _me.id) {
                    followActivityList.push(followsObj);
                }

            }
            console.log('followsObj count: ' + followActivityList.length);
            response.success(followActivityList);

        },
        error: function(error) {
            console.log('getActivity query failed due to ..' + error.message);
            response.error('getActivity query failed due to .' + error.message);
        }

    });

});

Parse.Cloud.define("heardWhisper", function(request, response) {

    console.log("heardWhisper");

    var HeardWhisper = Parse.Object.extend("HeardWhisper");
    var Whisper = Parse.Object.extend("Whisper");


    var _me = new Parse.User.current();
    var currentUserObj = _me;
    var currentUserName = currentUserObj.attributes.profile.name;
    console.log(" ├─ user :" + _me.id);
    console.log(" ├─ heard :" + request.params.whisperID);

    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {
            var whisperObj = _whisper;
            WhisperCreatedUser = whisperObj.attributes.createdBy;
            WhisperCaption = whisperObj.attributes.caption;
            console.log('WhisperCreatedUser');
            console.log(WhisperCreatedUser);
            var queryHeard = new Parse.Query(HeardWhisper);
            queryHeard.equalTo("stalker", _me);
            queryHeard.equalTo("whisper", _whisper);
            queryHeard.count({
                success: function(count) {
                    if (count > 0) {
                        console.log(" └─ already heard !");
                        response.success({
                            message: "already heard !",
                            heardCount: _whisper.get("heardCount")
                        });
                    } else {
                        if (_whisper.get("createdBy").id != _me.id) {
                            var pushQuery = new Parse.Query(Parse.Installation);
                            pushQuery.equalTo('user', WhisperCreatedUser);
                            Parse.Push.send({
                                where: pushQuery, // Set our Installation query
                                data: {
                                    alert: "" + currentUserName + " heard your Whisper '" +
                                        WhisperCaption + "'.",
                                    sound: "default",
                                    pushType: "heard",
                                    WhisperId: request.params.whisperID,
                                    badge: "Increment"
                                }
                            }, {
                                success: function(success) {
                                    console.log("Push send successfully..  " + success.message);
                                    /*  response.success({
                                    		message: "Push Send! & whistle saved !",
                                    		whistleCount: _whisper.get("whistleCount")
                                    	  }); */
                                },
                                error: function(error) {
                                    console.log("Error: " + error.code + " " + error.message);
                                    response.error("unable to push send and increment whistleCount !");
                                }
                            });

                        }

                        var heardWhisper = new HeardWhisper();
                        heardWhisper.save({
                            stalker: _me,
                            whisper: _whisper
                        }, {
                            success: function(_heardWhisper) {
                                console.log(" ├─ heard :" + _heardWhisper.id + " saved");

                                _whisper.increment("heardCount");
                                _whisper.save(null, {
                                    success: function(_whisper) {
                                        console.log(" └─ heardCount incremented !.");
                                        response.success({
                                            message: "heard !",
                                            heardCount: _whisper.get("heardCount")
                                        });
                                    },
                                    error: function(_whisper, error) {
                                        console.log(" ├─  increment fail, error :" + error.message);
                                        response.error("unable to increment heardCount !");
                                    }
                                });
                                console.log(" ├─ heard !");
                            },
                            error: function(_heardWhisper, error) {
                                console.log(" ├─ unable to save :" + _heardWhisper.id);
                                console.log(" └─ error :" + error.message);
                                response.error("unable to saved heard !");
                            }
                        });
                    }
                },
                error: function(error) {
                    console.log(" └─ heard query fail, error :" + error.message);
                    response.error("unknownError");
                }

            });
        },
        error: function(object, error) {
            console.log(" └─ whisper not found error :" + error.message);
            response.error("whisper not found ");
        }
    });
});

Parse.Cloud.define("isFollowed", function(request, response) {

    var Follows = Parse.Object.extend("Follows");
    var follows = new Follows();

    var me = new Parse.User.current();
    var user = new Parse.User();
    user.id = request.params.user;

    var query = new Parse.Query(Follows);

    query.equalTo("user", me);
    query.equalTo("follows", user);
    query.find({
        success: function(results) {
            if (results.length > 0) {
                var relationship = results[0];
                if (relationship.get("accepted")) {
                    response.success({
                        state: "accepted"
                    });
                } else {
                    response.success({
                        state: "pending"
                    });
                }
            } else {
                response.success({
                    state: "no-request"
                });
            }
        },
        error: function() {
            response.error("Error running query");
        }
    });
});

Parse.Cloud.define("newsFeed", function(request, response) {

    var pageNumber = request.params.pageNumber;
    var pageVolume = request.params.pageVolume;

    console.log("newsFeed " + pageNumber + "," + pageVolume);
    var resultWhisperArray = [];
    var resultWhisperCount = 0;
    var totalRecord = 0;
    var pageSize = 100;
    var counts = 0;

    var _me = new Parse.User.current();
    var Whisper = Parse.Object.extend("Whisper");
    var Follows = Parse.Object.extend("Follows");

    console.log(" ├ user :" + _me.id);

    var query = new Parse.Query(Follows);
    query.equalTo("user", _me);
    query.equalTo("accepted", true);
    query.find({
        success: function(result) {

            if (result.length > 0) {
                var equalToQuery = [];
                for (var i = 0; i < result.length; i++) {
                    console.log(" ├─ follows :" + result[i].get("follows").id);
                    equalToQuery[i] = new Parse.Query(Whisper);
                    equalToQuery[i].equalTo("createdBy", result[i].get("follows"));

                }
                //for my whisper
                var newLength = (result.length);
                equalToQuery[newLength] = new Parse.Query(Whisper);
                equalToQuery[newLength].equalTo("createdBy", _me);

                query = Parse.Query.or.apply(null, equalToQuery);
                query.include("createdBy");
                query.count({
                    success: function(count) {
                        totalRecord = count;
                        var counts = Math.ceil(totalRecord / pageSize);
                        for (var i = 0; i < counts; i++) {
                            query = Parse.Query.or.apply(null, equalToQuery);
                            query.include("createdBy");
                            query.skip(pageSize * i);
                            query.find({
                                success: function(whispers) {
                                    if (whispers.length > 0) {
                                        console.log(" └─ " + whispers.length + " whisper found");
                                        for (var j = 0; j < whispers.length; j++) {
                                            var whisper = whispers[j];
                                            resultWhisperArray[resultWhisperCount] = whisper;
                                            resultWhisperCount = resultWhisperCount + 1;

                                        }
                                        if (resultWhisperCount == totalRecord) {
                                            console.log('resultWhisperArray length: ' + resultWhisperArray.length);
                                            response.success(resultWhisperArray);
                                        }

                                        //response.success(whispers);
                                    } else {
                                        console.log(" └─ no whisper found");
                                        response.error("You follow some antisocial people sorry, No whisper for you :P");
                                        console.log("You follow some antisocial people sorry, No whisper for you :P");
                                    }
                                },
                                error: function(error) {
                                    console.log(" └─ whisper query fail, error :" + error.message);
                                    response.error("unknownError");
                                }
                            });

                        }
                    },
                    error: function(error) {
                        console.log(" └─ whisper  count query fail, error :" + error.message);
                        response.error("unknownError");
                    }
                });

            } else {
                console.log(" └─ Follows no one");
                console.log("No News Feed for you but your whisper returning :)");
                var myWhisper = Parse.Object.extend("Whisper");
                var whisperquery = new Parse.Query(myWhisper);
                whisperquery.equalTo("createdBy", _me);
                whisperquery.include("createdBy");
                whisperquery.find({
                    success: function(myWhispers) {
                        console.log(" └─ " + myWhispers.length + " my-whisper found");
                        response.success(myWhispers);
                    },
                    error: function(error) {
                        console.log(" └─  current user whisper query fail, error :" + error.message);
                        response.error("unknownError");
                    }
                });
            }
        },
        error: function(error) {
            console.log(" └─ follows query fail, error :" + error.message);
            // response.error("unknownError");
            console.log("unknownError");
        }

    });
});

Parse.Cloud.define("nearByWhispersCount", function(request, response) {

    console.log('nearByWhispersCount Cloud Code Running..');
    var totalRecord = 0;
    var counts = 0;
    var point = new Parse.GeoPoint({
        latitude: request.params.lat,
        longitude: request.params.lng
    });
    var query = new Parse.Query("Whisper");
    query.include("createdBy");
    query.near("location", point);
    query.withinKilometers("location", point, 20);
    query.count({
        success: function(count) {
            totalRecord = count;
            console.log('Nearby Count: ' + count);
            response.success(count);
        },
        error: function(error) {
            console.log('Nearby Count Query Fail Due To : ' + error.message);
            response.error('Nearby Count Query Fail Due To : ' + error.message);
        }
    });
});

Parse.Cloud.define("nearByWhispers", function(request, response) {
    var index = 0;
    var resultWhispers = [];
    var pageSize = 100;
    var totalRecord = request.params.totalRecord;
    var lat = request.params.lat;
    var lng = request.params.lng;
    var myWhisperCount = 0;
    var counts = Math.ceil(totalRecord / pageSize);
    for (var i = 0; i < counts; i++) {
        var point = new Parse.GeoPoint();
        point.latitude = lat;
        point.longitude = lng;
        var query = new Parse.Query("Whisper");
        query.include("createdBy");
        query.near("location", point);
        query.withinKilometers("location", point, 20);
        query.find({
            success: function(result) {
                console.log('Lenght' + result.length);
                for (var j = 0; j < result.length; j++) {
                    var resultObj = result[j];
                    resultWhispers[index] = resultObj;
                    index = index + 1;
                }
                if (index == result.length) {
                    console.log(resultWhispers);
                    response.success(resultWhispers);
                }
            },
            error: function(error) {
                response.error(error.message);
            }
        });
    }
});

Parse.Cloud.define("whistlesOnWhisper", function(request, response) {

    console.log("whistlesOnWhisper");

    var Whistle = Parse.Object.extend("Whistles");
    var Whisper = Parse.Object.extend("Whisper");
    var WhisperCreatedUser;
    var WhisperCaption;

    var _me = new Parse.User.current();
    // For Debuging.
    //var _me = new Parse.User();
    //_me.id = "pPkBwYVfrV";
    console.log(" ├─ user :" + _me.id);
    console.log(" ├─ whistle :" + request.params.whisperID);
    var currentUserObj = _me;
    var currentUserName = currentUserObj.attributes.profile.name;
    var installation;
    console.log('currentUserName: ' + currentUserName);

    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {
            var whisperObj = _whisper;
            WhisperCreatedUser = whisperObj.attributes.createdBy;
            WhisperCaption = whisperObj.attributes.caption;
            console.log('WhisperCreatedUser');
            console.log(WhisperCreatedUser);
            var queryWhistle = new Parse.Query(Whistle);
            queryWhistle.equalTo("user", _me);
            queryWhistle.equalTo("whisper", _whisper);
            queryWhistle.count({
                success: function(count) {
                    if (count > 0) {
                        console.log(" └─ already whistled !");
                        response.success({
                            message: "already whistled !",
                            whistleCount: _whisper.get("whistleCount")
                        });
                    } else {
                        if (_whisper.get("createdBy").id != _me.id) {
                            var pushQuery = new Parse.Query(Parse.Installation);
                            pushQuery.equalTo('user', WhisperCreatedUser);
                            Parse.Push.send({
                                where: pushQuery, // Set our Installation query
                                data: {
                                    alert: "" + currentUserName + " whistled on your Whisper '" +
                                        WhisperCaption + "'.",
                                    sound: "default",
                                    WhisperId: request.params.whisperID,
                                    badge: "Increment",
                                    pushType: "whistle"
                                }
                            }, {
                                success: function(success) {
                                    console.log("Push send successfully..  " + success.message);
                                    /*  response.success({
                                    		message: "Push Send! & whistle saved !",
                                    		whistleCount: _whisper.get("whistleCount")
                                    	  }); */
                                },
                                error: function(error) {
                                    console.log("Error: " + error.code + " " + error.message);
                                    response.error("unable to push send and increment whistleCount !");
                                }
                            });

                        }


                        var _whistle = new Whistle();
                        _whistle.save({
                            user: _me,
                            whisper: _whisper
                        }, {
                            success: function(_whistle) {
                                console.log(" ├─ whistle :" + _whistle.id + " saved");

                                _whisper.increment("whistleCount");
                                _whisper.save(null, {
                                    success: function(_whisper) {
                                        console.log(" └─ whistleCount incremented !.");

                                        response.success({
                                            message: "whistle saved  and push send !",
                                            whistleCount: _whisper.get("whistleCount"),
                                            whistleId: _whistle.id
                                        });
                                    },
                                    error: function(_whisper, error) {
                                        console.log(" ├─  increment fail, error :" + error.message);
                                        response.error("unable to increment whistleCount !");
                                    }
                                });
                                console.log(" ├─ whistle saved !");
                            },
                            error: function(_whistle, error) {
                                console.log(" ├─ unable to save :" + _whistle.id);
                                console.log(" └─ error :" + error.message);
                                response.error("unable to saved whistle !");
                            }
                        });
                    }
                },
                error: function(error) {
                    console.log(" └─ whistle query fail, error :" + error.message);
                    response.error("unknownError");
                }

            });
        },
        error: function(object, error) {
            console.log(" └─ whisper not found error :" + error.message);
            response.error("whisper not found ");
        }
    });
});

Parse.Cloud.define("reportAbuse", function(request, response) {
    var whisperId = request.params.whisperID;
    // var user = new Parse.User.current();
    var reason = request.params.reason;
    var comment = request.params.comment;
    var user = new Parse.User();
    user.id = "a75R7SDMZZ";

    var Whisper = Parse.Object.extend("Whisper");
    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(whisperId, {
        success: function(whisper) {
            var ReportedWhispers = Parse.Object.extend("ReportedWhispers");
            var reportedWhisper = new ReportedWhispers();

            reportedWhisper.save({
                user: user,
                whisper: whisper,
                reason: reason,
                comment: comment
            }, {
                success: function(result) {
                    whisper.increment("reportCount");
                    whisper.save();
                    response.success("Whisper reported successfully");
                },
                error: function(error) {
                    response.error(error);
                }
            });
        },
        error: function(error) {
            response.error(error);
        }
    });
});

Parse.Cloud.define("sendPushAudioComment", function(request, response) {

    var Whisper = Parse.Object.extend("Whisper");
    var WhisperCreatedUser;
    var WhisperCaption;
    var WhisperCreatedUsername;
    var _me = new Parse.User.current();
    console.log(" ├─ user :" + _me.id);
    console.log(" ├─ whisperID :" + request.params.whisperID);
    var currentUserObj = _me;
    var currentUserName = currentUserObj.attributes.profile.name;
    console.log(' ├─ currentUserName: ' + currentUserName);

    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {
            var whisperObj = _whisper;
            WhisperCreatedUser = whisperObj.attributes.createdBy;
            WhisperCaption = whisperObj.attributes.caption;
            if (_whisper.get("createdBy").id != _me.id) {

                var pushQuery = new Parse.Query(Parse.Installation);
                pushQuery.equalTo('user', WhisperCreatedUser);
                Parse.Push.send({
                    where: pushQuery, // Set our Installation query
                    data: {
                        alert: "" + currentUserName + " commented on your Whisper '" +
                            WhisperCaption + "'.",
                        sound: "default",
                        WhisperId: request.params.whisperID,
                        badge: "Increment",
                        pushType: "comment"
                    }
                }, {
                    success: function(success) {
                        console.log("Push send successfully..  ");
                        response.success({
                            message: "AudioComment push notified to user."
                        });
                    },
                    error: function(error) {
                        console.log("Error: " + error.code + " " + error.message);
                        response.error("unable to send push.");
                    }
                });
            }

        },
        error: function(error) {
            console.log(" └─ whisper query fail, error :" + error.message);
            response.error("unknownError");
        }
    });
});

Parse.Cloud.define("unWhistlesOnWhisper", function(request, response) {

    console.log("unWhistlesOnWhisper");

    var Whistle = Parse.Object.extend("Whistles");
    var Whisper = Parse.Object.extend("Whisper");

    var _me = new Parse.User.current();
    var _whistle = new Whistle();

    console.log(" ├─ user :" + _me.id);

    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {

            var queryWhistle = new Parse.Query(Whistle);
            queryWhistle.equalTo("user", _me);
            queryWhistle.equalTo("whisper", _whisper);
            queryWhistle.find({
                success: function(result) {
                    if (result.length > 0) {
                        result[0].destroy({
                            success: function(_whistle) {
                                console.log(" ├─ whistle :" + _whistle.id + " delete");
                                _whisper.increment("whistleCount", -1);
                                _whisper.save(null, {
                                    success: function(_whisper) {
                                        console.log(" └─ whistleCount decrement !.");
                                        response.success({
                                            message: "whistle delete !",
                                            whistleCount: _whisper.get("whistleCount")
                                        });
                                    },
                                    error: function(_whisper, error) {
                                        console.log(" ├─  decrement fail, error :" + error.message);
                                        response.error("unable to decrement whistleCount !");
                                    }
                                });
                                console.log(" ├─ whistle delete !");
                            },
                            error: function(_whistle, error) {
                                console.log(" ├─ unable to delete :" + _whistle.id);
                                console.log(" └─ error :" + error.message);
                                response.error("unable to delete whistle !");
                            }
                        });

                    } else {

                        console.log(" └─ Whistle not been blown");
                        response.success({
                            message: "Whistle not been blown !",
                            whistleCount: _whisper.get("whistleCount")
                        });
                    }
                },
                error: function(error) {
                    console.log(" └─ Whistle not found error :" + error.message);
                    response.error("Whistle not found ");
                }
            });

        },
        error: function(object, error) {
            console.log(" └─  whisper not found error :" + error.message);
            response.error("whisper not found ");
        }
    });
});

Parse.Cloud.define("myWhispers", function(request, response) {
    console.log("myWhispers");
    var resultWhisperArray = [];
    var resultWhisperCount = 0;
    var totalRecord = 0;
    var pageSize = 100;
    var counts = 0;

    var _me = new Parse.User.current();
    console.log(" ├ user :" + _me.id);

    var Whisper = Parse.Object.extend("Whisper");
    var query = new Parse.Query(Whisper);
    query.equalTo("createdBy", _me);
    query.count({
        success: function(count) {
            console.log(" └─ whisper count:" + count);
            if (count > 0) {
                totalRecord = count;
                var counts = Math.ceil(totalRecord / pageSize);
                for (var i = 0; i < counts; i++) {
                    query.include("createdBy");
                    query.skip(pageSize * i);
                    query.equalTo("createdBy", _me);
                    query.find({
                        success: function(whispers) {
                            if (whispers.length > 0) {
                                console.log(" └─ " + whispers.length + " whisper found");
                                for (var j = 0; j < whispers.length; j++) {
                                    var whisper = whispers[j];
                                    resultWhisperArray[resultWhisperCount] = whisper;
                                    resultWhisperCount = resultWhisperCount + 1;

                                }
                                if (resultWhisperCount == totalRecord) {
                                    console.log('resultWhisperArray length: ' + resultWhisperArray.length);
                                    response.success(resultWhisperArray);
                                }


                            } else {
                                console.log(" └─ no whisper found");
                                response.error("No whisper for you.");

                            }
                        },
                        error: function(error) {
                            console.log(" └─ whisper find query fail, error :" + error.message);
                            response.error(" └─ whisper find query fail, error :" + error.message);
                        }
                    });

                }
            } else {
                console.log('No whisper for you.');
                response.error("No whisper for you.");
            }

        },
        error: function(error) {
            console.log(" └─ whisper count fail, error :" + error.message);
            response.error(" └─ whisper count fail, error :" + error.message);
        }
    });
});

Parse.Cloud.define("myFollowing", function(request, response) {
    console.log("myFollowing");
    var followingArray = [];
    var followingCount = 0;
    var totalRecord = 0;
    var pageSize = 100;
    var counts = 0;

    var _me = new Parse.User.current();
    console.log(" ├ user :" + _me.id);

    var Following = Parse.Object.extend("Follows");
    var followingQuery = new Parse.Query(Following);
    followingQuery.equalTo("user", _me);
    followingQuery.equalTo("accepted", true);
    followingQuery.count({
        success: function(count) {
            console.log("Following Count: " + count);
            totalRecord = count;
            var counts = Math.ceil(totalRecord / pageSize);
            for (var i = 0; i < counts; i++) {


                followingQuery.skip(pageSize * i);
                followingQuery.include("follows");
                followingQuery.equalTo("user", _me);
                followingQuery.equalTo("accepted", true);
                followingQuery.find({
                    success: function(following) {
                        if (following.length > 0) {
                            console.log(" └─ " + following.length + " following found");
                            for (var j = 0; j < following.length; j++) {
                                var following = following[j];
                                followingArray[followingCount] = following;
                                followingCount = followingCount + 1;

                            }
                            if (followersCount == totalRecord) {
                                console.log('followingArray length: ' + followingArray.length);
                                response.success(followingArray);
                            }


                        } else {
                            console.log(" └─ No Following for you.");
                            response.error(" └─ No Following for you.");

                        }
                    },
                    error: function(error) {
                        console.log(" └─ Following count fail, error :" + error.message);
                        response.error(" └─ Following count fail, error :" + error.message);
                    }
                });
            }

        },
        error: function(error) {
            console.log(" └─ Following count fail, error :" + error.message);
            response.error(" └─ Following count fail, error :" + error.message);
        }
    });

});

Parse.Cloud.define("myFollowers", function(request, response) {
    console.log("myFollowers");
    var followersArray = [];
    var followersCount = 0;
    var totalRecord = 0;
    var pageSize = 100;
    var counts = 0;

    var _me = new Parse.User.current();
    console.log(" ├ user :" + _me.id);

    var Followers = Parse.Object.extend("Follows");
    var followersQuery = new Parse.Query(Followers);
    followersQuery.equalTo("follows", _me);
    followersQuery.equalTo("accepted", true);
    followersQuery.count({
        success: function(count) {
            console.log("Followers Count: " + count);
            totalRecord = count;
            var counts = Math.ceil(totalRecord / pageSize);
            for (var i = 0; i < counts; i++) {


                followersQuery.skip(pageSize * i);
                followersQuery.include("user");
                followersQuery.equalTo("follows", _me);
                followersQuery.equalTo("accepted", true);
                followersQuery.find({
                    success: function(followers) {
                        if (followers.length > 0) {
                            console.log(" └─ " + followers.length + " followers found");
                            for (var j = 0; j < followers.length; j++) {
                                var follower = followers[j];
                                followersArray[followersCount] = follower;
                                followersCount = followersCount + 1;

                            }
                            if (followersCount == totalRecord) {
                                console.log('followersArray length: ' + followersArray.length);
                                response.success(followersArray);
                            }


                        } else {
                            console.log(" └─ No Followers for you.");
                            response.error(" └─ No Followers for you.");

                        }
                    },
                    error: function(error) {
                        console.log(" └─ Followers count fail, error :" + error.message);
                        response.error(" └─ Followers count fail, error :" + error.message);
                    }
                });
            }

        },
        error: function(error) {
            console.log(" └─ Follower count fail, error :" + error.message);
            response.error(" └─ Follower count fail, error :" + error.message);
        }
    });

});

Parse.Cloud.define("myHeardWhispers", function(request, response) {

    console.log("myHeardWhispers");
    var resultWhisperArray = [];
    var resultWhisperCount = 0;
    var totalRecord = 0;
    var pageSize = 100;
    var counts = 0;

    var _me = new Parse.User.current();
    console.log(" ├ user :" + _me.id);

    var HeardWhisper = Parse.Object.extend("HeardWhisper");
    var queryHeard = new Parse.Query(HeardWhisper);
    queryHeard.equalTo("stalker", _me);
    queryHeard.count({
        success: function(count) {
            console.log(" └─ heardWhispers count:" + count);
            if (count > 0) {
                totalRecord = count;
                var counts = Math.ceil(totalRecord / pageSize);
                for (var i = 0; i < counts; i++) {

                    queryHeard.include("whisper");
                    queryHeard.skip(pageSize * i);
                    queryHeard.equalTo("stalker", _me);
                    queryHeard.find({
                        success: function(whispers) {
                            if (whispers.length > 0) {
                                console.log(" └─ " + whispers.length + " whisper found");
                                for (var j = 0; j < whispers.length; j++) {
                                    var whisper = whispers[j];
                                    resultWhisperArray[resultWhisperCount] = whisper;
                                    resultWhisperCount = resultWhisperCount + 1;

                                }
                                if (resultWhisperCount == totalRecord) {
                                    console.log('resultWhisperArray length: ' + resultWhisperArray.length);
                                    response.success(resultWhisperArray);
                                }


                            } else {
                                console.log(" └─ no whisper found");
                                response.error("No whisper for you.");

                            }
                        },
                        error: function(error) {
                            console.log(" └─ HeardWhisper fail, error :" + error.message);
                            response.error(" └─ HeardWhisper  fail, error :" + error.message);
                        }
                    });

                }
            } else {
                console.log('No whisper for you.');
                response.error("No whisper for you.");
            }

        },
        error: function(error) {
            console.log(" └─ Heard Query count fail, error :" + error.message);
            response.error(" └─ Heard Query count fail, error :" + error.message);
        }
    });
});

Parse.Cloud.define("heardUsers", function(request, response) {
    console.log("heardUsers");

    var heardUsersArray = new Array();
    var heardUsersCount = 0;
    var totalRecord = 0;
    var pageSize = 100;
    var counts = 0;
    var HeardWhisper = Parse.Object.extend("HeardWhisper");
    var Whisper = Parse.Object.extend("Whisper");

    var _me = new Parse.User.current();
    console.log(" ├─ user :" + _me.id);
    console.log(" ├─ heard Whisper Id :" + request.params.whisperID);

    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {
            var queryHeard = new Parse.Query(HeardWhisper);
            queryHeard.include("stalker");
            queryHeard.equalTo("whisper", _whisper);
            queryHeard.count({
                success: function(count) {
                    console.log('count: ' + count);
                    if (count > 0) {
                        totalRecord = count;
                        var counts = Math.ceil(totalRecord / pageSize);
                        for (var i = 0; i < counts; i++) {
                            queryHeard.include("stalker");
                            queryHeard.skip(pageSize * i);
                            queryHeard.equalTo("whisper", _whisper);
                            queryHeard.find({
                                success: function(heardWhispers) {
                                    if (heardWhispers.length > 0) {
                                        console.log(" └─ " + heardWhispers.length + " heard users found");
                                        for (var j = 0; j < heardWhispers.length; j++) {
                                            var heardUser = heardWhispers[j].attributes.stalker.attributes;
                                            heardUsersArray.push(heardUser);
                                            heardUsersCount = heardUsersCount + 1;

                                        }
                                        if (heardUsersCount == totalRecord) {
                                            console.log('heardUsersArray length: ' + heardUsersArray.length);
                                            //var jsonArray = JSON.parse(JSON.stringify(heardUsersArray));
                                            response.success(heardUsersArray);

                                        }
                                    }
                                },
                                error: function(error) {
                                    console.log(" └─ HeardWhisper fail, error :" + error.message);
                                    response.error(" └─ HeardWhisper  fail, error :" + error.message);
                                }
                            });


                        }
                    }


                },
                error: function(error) {
                    console.log(" └─ heard query count fail, error :" + error.message);
                    response.error("└─ heard query count fail, error :" + error.message);
                }

            });
        },
        error: function(object, error) {
            console.log(" └─ whisper not found error :" + error.message);
            response.error("whisper not found ");
        }
    });

});

Parse.Cloud.define("addNewActivity", function(request, response) {
    console.log('addNewActivity Parse CLoud Ran');
    Parse.Cloud.useMasterKey();
    var whisperID = request.params.whisperID;
    var activityType = request.params.activityType;
    var whistleId = request.params.whistleId;
    var whistleName = request.params.whistleName;
    var commentId = request.params.commentId;
    var _me = new Parse.User.current();
    var Whisper = Parse.Object.extend("Whisper");
    var Follows = Parse.Object.extend("Follows");
    var _follows = new Follows();
    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(whisperID, {
        success: function(_whisper) {
            var whisperObj = _whisper;
            console.log("Whisper Object Id: " + whisperObj.id);
            var queryFollows = new Parse.Query(Follows);
            queryFollows.equalTo("activityType", activityType);
            queryFollows.equalTo("whisper", whisperObj);
            queryFollows.first({
                success: function(_resultedFollows) {
                    if (_resultedFollows != null) {
                        Parse.Cloud.useMasterKey();
                        _resultedFollows.add("pointerIDs", whistleId);
                        _resultedFollows.add("pointerNames", whistleName);
                        _resultedFollows.add("commentIDs", commentId);
                        _resultedFollows.save();
                        console.log("Activity updated against follow Id :" + _resultedFollows.id);
                        response.success("Activity updated against follow Id :" + _resultedFollows.id);

                    } else {
                        var followObj = new Follows();
                        followObj.set("user", _me);
                        followObj.set("activityType", activityType);
                        followObj.set("whisper", whisperObj);
                        //adding pointerIDs
                        var pointerIDsArray = new Array();
                        pointerIDsArray.push(whistleId);
                        followObj.set("pointerIDs", pointerIDsArray);
                        //adding pointerNames
                        var pointerNamesArray = new Array();
                        pointerNamesArray.push(whistleName);
                        followObj.set("pointerNames", pointerNamesArray);
                        //adding commentIDs
                        var commentIDsArray = new Array();
                        commentIDsArray.push(commentId);
                        followObj.set("commentIDs", commentIDsArray);
                        followObj.save(null, {
                            success: function(successFollow) {
                                console.log("New activity saved :" + successFollow.id);
                                response.success("New activity saved");
                            },
                            error: function(error) {
                                console.log("Follow query failed : " + error.message);
                                response.error("Follow query failed : " + error.message);
                            }
                        });

                    }

                },
                error: function(error) {
                    console.log("Error: " + error.code + " " + error.message);
                }
            });

        },
        error: function(error) {

            console.log("Whisper retrieval failed: " + error.message);
            response.error("Whisper retrieval failed: " + error.message);
        }
    });
});

Parse.Cloud.define("heardWhisperUsers", function(request, response) {
    console.log('Heard User Against Whisper..');

    var HeardWhisper = Parse.Object.extend("HeardWhisper");
    var Whisper = Parse.Object.extend("Whisper");
    //var whisperId = "UABZCxBcBH";

    var _me = new Parse.User.current();
    console.log(" ├─ user :" + _me.id);
    console.log(" ├─ heard Whisper Id :" + request.params.whisperID);

    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(request.params.whisperID, {
        success: function(_whisper) {
            var queryHeard = new Parse.Query(HeardWhisper);
            queryHeard.include("stalker");
            queryHeard.limit(1000);
            queryHeard.equalTo("whisper", _whisper);
            queryHeard.find({
                success: function(heardWhispers) {
                    console.log(" └─ HeardWhisper Lenght : " + heardWhispers.length);
                    response.success(heardWhispers);
                },
                error: function(error) {
                    console.log(" └─ HeardWhisper fail, error :" + error.message);
                    response.error(" └─ HeardWhisper  fail, error :" + error.message);
                }
            });

        },
        error: function(object, error) {
            console.log(" └─ whisper not found error :" + error.message);
            response.error("whisper not found ");
        }
    });
});

Parse.Cloud.define("newGetActivity", function(request, response) {
    Parse.Cloud.useMasterKey();
    console.log('newGetActivity Cloud Code..');
    var activityType = "";
    var followActivityList = [];
    var _me = new Parse.User.current();
    console.log('currentUserId: ' + _me.id);
    var Follows = Parse.Object.extend("Follows");
    var queryFollows = new Parse.Query(Follows);
    queryFollows.containedIn("activityType", ["comment", "whistle", "heard"]);
    queryFollows.include('whisper');
    queryFollows.include('user');
    queryFollows.descending("createdAt");
    queryFollows.find({
        success: function(follows) {
            console.log('follows count: ' + follows.length);
            for (var i = 0; i < follows.length; i++) {
                var followsObj = follows[i];
                if (followsObj.attributes.whisper.attributes.createdBy.id == _me.id) {

                    followActivityList.push(followsObj);
                }

            }
            console.log('followsObj count: ' + followActivityList.length);
            response.success(followActivityList);

        },
        error: function(error) {
            console.log('getActivity query failed due to ..' + error.message);
            response.error('getActivity query failed due to .' + error.message);
        }

    });

});

Parse.Cloud.define("updateActivity", function(request, response) {
    console.log('deleteAudioComment Cloud Code Ran');
    var commentId = request.params.commentId;
    console.log('commentId: ' + commentId);
    var _me = new Parse.User.current();
    var Whisper = Parse.Object.extend("Whisper");
    var whisperQuery = new Parse.Query(Whisper);
    var index = "";
    var Follows = Parse.Object.extend("Follows");
    var followsQuery = new Parse.Query(Follows);
    // var temp Arrays
    var tempPointerIDs = new Array();
    var tempPointerNames = new Array();
    var tempCommentIDs = new Array();

    var AudioComments = Parse.Object.extend("AudioComments");
    var audioCommentQuery = new Parse.Query(AudioComments);
    audioCommentQuery.get(commentId, {
        success: function(_audioComment) {
            if (_audioComment != null) {
                var whisperId = _audioComment.attributes.whisper.id;
                console.log('whisperId against audioComment Id: ' + whisperId);
                whisperQuery.equalTo("objectId", whisperId);
                whisperQuery.first({
                    success: function(_whisper) {
                        if (_whisper) {
                            console.log('whisper find..');

                            followsQuery.equalTo("whisper", _whisper);
                            followsQuery.equalTo("activityType", "comment");
                            followsQuery.first({
                                success: function(_follows) {
                                    console.log('follows find..');
                                    var followsObj = _follows;
                                    var pointerIDs = followsObj.attributes.pointerIDs;
                                    var pointerNames = followsObj.attributes.pointerNames;
                                    var commentIDs = followsObj.attributes.commentIDs;
                                    for (var j = 0; j < commentIDs.length; j++) {
                                        if (commentId == commentIDs[j]) {
                                            console.log('index: ' + j);
                                            index = j;
                                            break;
                                        }

                                    }

                                    for (var x = 0; x < pointerIDs.length; x++) {
                                        if (index != x) {
                                            tempPointerIDs.push(pointerIDs[x]);
                                            tempPointerNames.push(pointerNames[x]);
                                            tempCommentIDs.push(commentIDs[x]);

                                        }

                                    }
                                    if (tempPointerIDs.length > 0) {
                                        _follows.set('pointerIDs', tempPointerIDs);
                                        _follows.set('pointerNames', tempPointerNames);
                                        _follows.set('commentIDs', tempCommentIDs);
                                        _follows.save();
                                        console.log('follow updated...');
                                    } else {
                                        //Deleting Follows 
                                        _follows.destroy({
                                            success: function(result) {
                                                console.log('Follows deleted.');

                                            },
                                            error: function(error) {
                                                console.error("Error deleting  Follows: " + error.code + ": " + error.message);
                                                response.error("Error deleting  Follows: " + error.code + ": " + error.message);
                                            }
                                        });
                                    }


                                    //Deleting AudioComment 
                                    _audioComment.destroy({
                                        success: function(result) {
                                            _whisper.increment("commentsCount", -1);
                                            _whisper.save();
                                            console.log('commentsCount decrement against WhisperId: ' + whisperId);
                                            console.log('Audio Comment deleted.');
                                            //response.success("Activity updated Against AudioCommentId: " + commentId);
                                            response.success({
                                                message: "Activity updated Against AudioCommentId: " + commentId,
                                                commentsCount: _whisper.get("commentsCount")
                                            });
                                        },
                                        error: function(error) {
                                            console.error("Error deleting  AudioComment: " + error.code + ": " + error.message);
                                            response.error("Error deleting  AudioComment: " + error.code + ": " + error.message);
                                        }
                                    });


                                },
                                error: function(error) {

                                    console.log("Follows retrieval failed: " + error.message);
                                    response.error("Follows retrieval failed: " + error.message);
                                }
                            });

                        } else {
                            console.log('No Whisper Exist.');
                        }
                    },
                    error: function(error) {

                        console.log("Whisper retrieval failed: " + error.message);
                        response.error("Whisper retrieval failed: " + error.message);
                    }
                });

            } else {
                console.log('No Audio Comment ID Exist.');
            }
        },
        error: function(error) {

            console.log("AudioComments retrieval failed: " + error.message);
            response.error("AudioComments retrieval failed: " + error.message);
        }
    });



});

Parse.Cloud.define("updateAudioCommentsForAndroid", function(request, response) {
    console.log('updateAudioCommentsForAndroid Cloud Code Ran');
    var whisperID = request.params.whisperID;
    var audioCommentID = request.params.audioCommentID;
    // var whisperID = "5ZRevwDEwS";
    // var audioCommentID = "IR7EGfBnT7";
    console.log('whisperID: ' + whisperID + '-- audioCommentID: ' + audioCommentID);
    var WhisperCreatedUser;
    var WhisperCaption;
    var WhisperCreatedUsername;
    var _me = new Parse.User.current();
    console.log(" ├─ user :" + _me.id);
    console.log(" ├─ whisperID :" + request.params.whisperID);
    var currentUserObj = _me;
    var currentUserName = currentUserObj.attributes.profile.name;
    console.log(' ├─ currentUserName: ' + currentUserName);

    var Whisper = Parse.Object.extend("Whisper");
    var AudioComments = Parse.Object.extend("AudioComments");
    var queryWhisper = new Parse.Query(Whisper);
    queryWhisper.get(whisperID, {
        success: function(_whisper) {
            var whisperObj = _whisper;
            whisperObj.increment("commentsCount");
            whisperObj.save();
            console.log("commentsCount incremented !");
            console.log('whisperId: ' + whisperObj.id);
            var query = new Parse.Query(AudioComments);
            query.get(audioCommentID, {
                success: function(result) {
                    result.set('whisper', whisperObj);
                    result.save();
                    // response.success('');
                    WhisperCreatedUser = whisperObj.attributes.createdBy;
                    WhisperCaption = whisperObj.attributes.caption;
                    var pushQuery = new Parse.Query(Parse.Installation);
                    pushQuery.equalTo('user', WhisperCreatedUser);
                    Parse.Push.send({
                        where: pushQuery, // Set our Installation query
                        data: {
                            alert: "" + currentUserName + " commented on your Whisper '" +
                                WhisperCaption + "'.",
                            sound: "default",
                            WhisperId: request.params.whisperID,
                            badge: "Increment",
                            pushType: "comment"
                        }
                    }, {
                        success: function(success) {
                            console.log("Push send successfully..  ");
                            response.success("AudioComment record updated & AudioComment push notified to user.");
                        },
                        error: function(error) {
                            console.log("Error: " + error.code + " " + error.message);
                            response.error("unable to send push.");
                        }
                    });
                },
                error: function(error) {
                    console.log('AudioComments query failed due to ..' + error.message);
                    response.error('AudioComments query failed due to ..' + error.message);
                }
            });
        },
        error: function(error) {
            console.log('whisper query failed due to ' + error.message);
            response.error("whisper query failed due to  " + error.message);
        }
    });

});

Parse.Cloud.define("addNewGroup", function(request, response) {
    console.log('addNewGroup Parse Cloud Ran.');
    var title = request.params.title;
    var locationName = request.params.locationName;
    var location = request.params.location;
    var image = request.params.image;

    var me = Parse.User.current();
    console.log("current User Id: " + me.id);

    var Groups = Parse.Object.extend("Groups");
    //Add group 
    var groups = new Groups();

    groups.set("title", title);
    groups.set("locationName", locationName);
    groups.set("location", location);
    groups.set("image", image);
    groups.set("createdBy", me);


    groups.save(null, {
        success: function(groups) {
            console.log('New group created with objectId: ' + groups.id);
            response.success("" + groups.id);

        },
        error: function(groups, error) {
            console.log('Failed to create new object, with error code: ' + error.message);
            response.error('Failed to create new object, with error code: ' + error.message);
        }
    });
});

Parse.Cloud.define("getMembers", function(request, response) {
    console.log("getMembers Cloud Code Ran..");
    var _me = new Parse.User.current();
    var usersList = [];
    var followers = new Parse.Query("Follows").equalTo("follows", _me).equalTo("accepted", true).include("user").find();
    var followings = new Parse.Query("Follows").equalTo("user", _me).equalTo("accepted", true).include("follows").find();

    // wait for them all to complete using Parse.Promise.when()
    // result order will match the order passed to when()
    Parse.Promise.when(followers, followings).then(function(followersList, followingList) {


        for (var i = 0; i < followingList.length; i++) {
            var followObj = followingList[i];
            usersList.push(followObj.attributes.follows);

        }

        for (var j = 0; j < followersList.length; j++) {
            var followerObj = followersList[j];
            usersList.push(followerObj.attributes.user);

        }

        var newArr = [];
        var origLen = usersList.length;
        var found;
        var x;
        var y;

        for (x = 0; x < origLen; x++) {
            found = undefined;
            for (y = 0; y < newArr.length; y++) {
                if (usersList[x].id === newArr[y].id) {
                    found = true;
                    break;
                }
            }
            if (!found) newArr.push(usersList[x]);
        }
        response.success(newArr);
    });

});

Parse.Cloud.define("addGroupsMembers", function(request, response) {

    console.log('addGroupsMembers Parse Cloud Ran.');
    var groupId = request.params.groupId;
    var membersArray = request.params.membersArray;
    var count = 0;

    var GroupMembers = Parse.Object.extend("GroupMembers");

    var me = Parse.User.current();
    console.log("current User Id: " + me.id);

    //Add currentUserId in request.params.membersArray
    membersArray.push(me.id);

    //Get Group Object
    var Groups = Parse.Object.extend("Groups");
    var groupsQuery = new Parse.Query(Groups);
    groupsQuery.get(groupId, {
        success: function(_group) {
            // The group was retrieved successfully.

            var User = Parse.Object.extend("User");
            var userQuery = new Parse.Query(User);
            userQuery.containedIn("objectId", membersArray);
            userQuery.find({
                success: function(_users) {
                    for (var i = 0; i < _users.length; i++) {
                        var userObj = _users[i];
                        //Add GroupMembers 
                        var groupMembers = new GroupMembers();

                        groupMembers.set("member", userObj);
                        groupMembers.set("group", _group);

                        groupMembers.save(null, {
                            success: function(groups) {
                                console.log('New groupMembers created with userId: ' + userObj.id);
                                count = count + 1;
                                if (count == _users.length) {
                                    _group.set("memberCount", _users.length);
                                    _group.save();
                                    console.log("Successfully created NewGroupMembers");
                                    response.success("Successfully created NewGroupMembers");
                                }

                            },
                            error: function(gameScore, error) {
                                console.log('Failed to create new object, with error code: ' + error.message);
                                response.error('Failed to create new object, with error code: ' + error.message);

                            }
                        });

                    }

                },
                error: function(error) {
                    console.log("Error in getting Users.. " + error.code + " " + error.message);
                    response.error("Error in getting Users... " + error.code + " " + error.message);
                }
            });


        },
        error: function(group, error) {
            console.log("Error in get groupQuery.. " + error.code + " " + error.message);
            response.error("Error in get groupQuery.. " + error.code + " " + error.message);
        }
    });


});

Parse.Cloud.define("getGroups", function(request, response) {

    console.log('>getGroups Parse Cloud Ran.');
    var groupArray = [];
    var count = 0;
    var me = Parse.User.current();
    console.log("current User Id: " + me.id);

    var GroupMembers = Parse.Object.extend("GroupMembers");
    var groupMembersQuery = new Parse.Query(GroupMembers);
    groupMembersQuery.equalTo("member", me);
    groupMembersQuery.limit(1000);
    groupMembersQuery.include("group");
    groupMembersQuery.find({
        success: function(_groupMembers) {
            console.log("_groupMembers length: " + _groupMembers.length);
            if (_groupMembers.length == 0) {
                // console.log("You aren't part of any Circle yet. Go and create one!");
                // response.error("You aren't part of any Circle yet. Go and create one!");
                var Group = Parse.Object.extend("Groups");
                var groupQuery = new Parse.Query(Group);
                groupQuery.equalTo("objectId", "p0Suo99K29");
                groupQuery.find({
                    success: function(_group) {
                        //groupArray.push(_group);
                        response.success(_group);
                    },
                    error: function(error) {
                        console.log("Error in groupQuery: " + error.code + " " + error.message);
                        response.error("Error in groupQuery: " + error.code + " " + error.message);
                    }
                });
            } else {
                for (var i = 0; i < _groupMembers.length; i++) {
                    groupArray.push(_groupMembers[i].attributes.group);
                    count = count + 1;
                    if (count == _groupMembers.length) {
                        var Group = Parse.Object.extend("Groups");
                        var groupQuery = new Parse.Query(Group);
                        groupQuery.get("p0Suo99K29", {
                            success: function(_group) {
                                // The object was retrieved successfully.
                                groupArray.push(_group);
                                response.success(groupArray);
                            },
                            error: function(object, error) {
                                // The object was not retrieved successfully.
                                // error is a Parse.Error with an error code and message.
                                console.log("Error in groupQuery: " + error.code + " " + error.message);
                                response.error("Error in groupQuery: " + error.code + " " + error.message);

                            }
                        });

                    }
                }
            }
        },
        error: function(error) {
            console.log("Error in groupsQuery: " + error.code + " " + error.message);
            response.error("Error in groupsQuery: " + error.code + " " + error.message);
        }
    });
});

Parse.Cloud.define("getAllUsers", function(request, response) {
    console.log(">getAllUsers Parse Cloud Ran");

    var me = Parse.User.current();
    console.log("current User Id: " + me.id);

    var skip = request.params.skip;

    var User = Parse.Object.extend("User");
    var userQuery = new Parse.Query(User);
    userQuery.skip(skip);
    userQuery.limit(25);
    userQuery.find({
        success: function(_users) {
            console.log("User List length: " + _users.length);
            response.success(_users);
        },
        error: function(error) {
            console.log("Error in userQuery: " + error.code + " " + error.message);
            response.error("Error in userQuery: " + error.code + " " + error.message);
        }
    });

});

Parse.Cloud.define("getAllUsersAgainstFollows", function(request, response) {
    console.log("> getAllUsersAgainstFollows Parse Cloud Ran");

    var me = Parse.User.current();
    console.log("current User Id: " + me.id);

    var removeUserArray = [];
    removeUserArray.push(me.id);

    var skip = request.params.skip;
    //var skip =0;

    var Follows = Parse.Object.extend("Follows");
    var followQuery = new Parse.Query(Follows);

    followQuery.equalTo("activityType", "follow");
    followQuery.limit(1000);
    followQuery.find({
        success: function(_follows) {
            var _followCount = 0;
            console.log("_follows List length: " + _follows.length);
            for (var i = 0; i < _follows.length; i++) {
                _followCount = _followCount + 1;
                var followObj = _follows[i].attributes.follows;
                var userObj = _follows[i].attributes.user;
                if (followObj.id == me.id) {
                    removeUserArray.push(userObj.id);

                }
                if (userObj.id == me.id) {
                    removeUserArray.push(followObj.id);
                }

            }

            if (_followCount == _follows.length) {
                console.log(removeUserArray);
                var User = Parse.Object.extend("User");
                var userQuery = new Parse.Query(User);
                userQuery.skip(skip);
                userQuery.limit(25);
                userQuery.notContainedIn("objectId", removeUserArray);
                userQuery.find({
                    success: function(_users) {
                        console.log("User List length: " + _users.length);
                        response.success(_users);

                    },
                    error: function(error) {
                        console.log("Error in userQuery: " + error.code + " " + error.message);
                        response.error("Error in userQuery: " + error.code + " " + error.message);
                    }
                });


            }
        },
        error: function(error) {
            console.log("Error in followQuery: " + error.code + " " + error.message);
            response.error("Error in followQuery: " + error.code + " " + error.message);
        }
    });

});

Parse.Cloud.define("getGroupWhispers", function(request, response) {
    console.log("> getGroupWhispers cloud code");
    var groupId = request.params.groupId;
    var Groups = Parse.Object.extend("Groups");
    var groupQuery = new Parse.Query(Groups);
    groupQuery.get(groupId, {
        success: function(_group) {
            console.log("successfully Getting Group Object Id: " + _group.id);
            var GroupWhispers = Parse.Object.extend("GroupWhispers");
            var groupWhispersQuery = new Parse.Query(GroupWhispers);
            groupWhispersQuery.equalTo("groups", _group);
            groupWhispersQuery.include("createdByMember");
            groupWhispersQuery.descending("createdAt");
            groupWhispersQuery.limit(1000);
            groupWhispersQuery.find({
                success: function(_groupWhispers) {
                    console.log("_groupWhispers length: " + _groupWhispers.length);
                    response.success(_groupWhispers);

                },
                error: function(error) {
                    console.log("Error in groupWhispersQuery: " + error.code + " " + error.message);
                    response.error("Error in groupWhispersQuery: " + error.code + " " + error.message);
                }
            });


        },
        error: function(object, error) {
            console.log("Error in getting group object : " + error.message);
            response.error("Error in getting group object: " + error.message);
        }
    });
});

Parse.Cloud.define("addGroupsWhisper", function(request, response) {
    console.log("> addGroupsWhisper Parse Cloud Ran");
    var groupId = request.params.groupId;
    var me = Parse.User.current();
    console.log("current User Id: " + me.id);

    var GroupWhispers = Parse.Object.extend("GroupWhispers");

    var Groups = Parse.Object.extend("Groups");
    var groupQuery = new Parse.Query(Groups);
    groupQuery.get(groupId, {
        success: function(_group) {
            console.log(_group);

            var groupMembers = new Parse.Query("GroupMembers").equalTo("group", _group).include("member").find();

            var groupWhispers = new GroupWhispers();
            groupWhispers.set("createdByMember", me);
            groupWhispers.set("imageFile", request.params.imageFile);
            groupWhispers.set("location", request.params.location);
            groupWhispers.set("groups", _group);
            groupWhispers.set("tags", request.params.tags);
            groupWhispers.set("caption", request.params.caption);
            groupWhispers.set("locationName", request.params.locationName);
            groupWhispers.set("soundFile", request.params.soundFile);
            groupWhispers.save(null, {
                success: function(successGroupWhisper) {
                    _group.increment("whisperCount");
                    _group.save();
                    console.log("Successfully created NewGroupWhisper with ObjectId:" + successGroupWhisper.id);

                    var pushPromise = new Parse.Promise();

                    Parse.Promise.when(groupMembers).then(function(groupMembersList) {
                        for (var i = 0; i < groupMembersList.length; i++) {

                            user = new Parse.User();
                            user.id = groupMembersList[i].attributes.member.id;

                            console.log("MemberX: " + user.id);

                            pushQuery = new Parse.Query(Parse.Installation);
                            pushQuery.equalTo('user', user);

                            Parse.Push.send({
                                where: pushQuery, // Set our Installation query
                                data: {
                                    alert: "Someone in your group '" + _group.attributes.title + "' whispered!",
                                    sound: "default",
                                    WhisperId: groupId,
                                    pushType: "group",
                                    badge: "Increment"
                                }
                            }, {
                                success: function(success) {
                                    console.log("Push send successfully to " + user.id);

                                    if (i == groupMembersList.length - 1)
                                        pushPromise.resolve({});
                                },
                                error: function(error) {
                                    console.log("Error sending push to " + user.id + ": " + error.code + " " + error.message);

                                    if (i == groupMembersList.length - 1)
                                        pushPromise.reject({});
                                }
                            });
                        }
                    });

                    Parse.Promise.when(pushPromise).then(function(result) {
                        response.success("Successfully created NewGroupWhisper with ObjectId:" + successGroupWhisper.id);
                    }, function(error) {
                        response.error("An error occurred when creating group or push");
                    });
                },
                error: function(error) {
                    console.log("Error in created NewGroupWhisper : " + error.message);
                    response.error("Error in created NewGroupWhisper : " + error.message);
                }
            });

        },
        error: function(object, error) {
            console.log("Error in getting group object : " + error.message);
            response.error("Error in getting group object: " + error.message);
        }
    });
});

Parse.Cloud.define("addNewGroupWithMembers", function(request, response) {

    console.log("> addNewGroupWithMembers Parse cloud code");
    var me = new Parse.User.current();
    console.log("user :" + me.id);
    var currentUserObj = me;
    var currentUserName = currentUserObj.attributes.profile.name;
    console.log("currentUserName: " + currentUserName);
    console.log("current User Id: " + me.id);
    var title = request.params.title;
    var locationName = request.params.locationName;
    var location = request.params.location;
    var image = request.params.image;
    var groupId = "";
    var membersArray = request.params.membersArray;
    membersArray.push(me.id);

    var count = 0;
    var GroupMembers = Parse.Object.extend("GroupMembers");
    var Groups = Parse.Object.extend("Groups");
    //Add group 
    var groups = new Groups();

    groups.set("title", title);
    groups.set("locationName", locationName);
    groups.set("location", location);
    groups.set("image", image);
    groups.set("createdBy", me);


    groups.save(null, {
        success: function(_group) {
            console.log('New group created with objectId: ' + _group.id);
            // response.success("" + groups.id);
            groupId = _group.id;
            if (groupId == "") {
                console.log("group created query failed");
            } else {
                for (var j = 0; j < membersArray.length; j++) {
                    //Add GroupMembers 
                    var groupMembers = new GroupMembers();
                    var user = new Parse.User();
                    user.id = membersArray[j];
                    groupMembers.set("member", user);
                    groupMembers.set("group", _group);

                    groupMembers.save(null, {
                        success: function(groups) {

                            count = count + 1;
                            if (count == membersArray.length) {
                                _group.set("memberCount", membersArray.length);
                                _group.save();
                                console.log("Successfully created addNewGroupWithMembers");
                                response.success("Successfully created addNewGroupWithMembers");

                                for (var i = 0; i < membersArray.length; i++) {
                                    var user = new Parse.User();
                                    user.id = membersArray[i];
                                    if (user.id != me.id) {
                                        var pushQuery = new Parse.Query(Parse.Installation);
                                        pushQuery.equalTo('user', user);

                                        Parse.Push.send({
                                            where: pushQuery, // Set our Installation query
                                            data: {
                                                alert: "" + currentUserName + " added you in the Circle '" +
                                                    title + "'.",
                                                sound: "default",
                                                WhisperId: groupId,
                                                pushType: "group",
                                                badge: "Increment"
                                            }
                                        }, {
                                            success: function(success) {
                                                console.log("Push send successfully..  ");
                                                response.success({
                                                    message: "Group Creation push sent successfully"
                                                });
                                            },
                                            error: function(error) {
                                                console.log("Error: " + error.code + " " + error.message);
                                                response.error("unable to send push.");
                                            }
                                        });
                                    }

                                }
                            }

                        },
                        error: function(gameScore, error) {
                            console.log('Failed to create new object, with error code: ' + error.message);
                            response.error('Failed to create new object, with error code: ' + error.message);
                        }
                    });

                }

            }

        },
        error: function(groups, error) {
            console.log('Failed to create new Group, with error code: ' + error.message);
            response.error('Failed to create new Group, with error code: ' + error.message);
        }
    });
});

Parse.Cloud.define("addGroupWhisper", function(request, response) {
    console.log("> addGroupWhisper Parse Cloud Ran");
    var groupId = request.params.groupId;
    var me = Parse.User.current();
    var count = 0;
    var title = "";

    var currentUserName = me.get("profile").name;

    console.log("current User Id: " + me.id + ", name: " + currentUserName);

    var GroupWhispers = Parse.Object.extend("GroupWhispers");

    var Groups = Parse.Object.extend("Groups");
    var groupQuery = new Parse.Query(Groups);
    groupQuery.get(groupId, {
        success: function(_group) {

            title = _group.get("title");
            console.log("group title: " + title);
            var groupWhispers = new GroupWhispers();
            groupWhispers.set("createdByMember", me);
            groupWhispers.set("imageFile", request.params.imageFile);
            groupWhispers.set("location", request.params.location);
            groupWhispers.set("groups", _group);
            groupWhispers.set("tags", request.params.tags);
            groupWhispers.set("caption", request.params.caption);
            groupWhispers.set("locationName", request.params.locationName);
            groupWhispers.set("soundFile", request.params.soundFile);
            groupWhispers.save(null, {
                success: function(successGroupWhisper) {
                    _group.increment("whisperCount");
                    _group.save();
                    console.log("Successfully created NewGroupWhisper with ObjectId:" + successGroupWhisper.id);
                    var GroupMembers = Parse.Object.extend("GroupMembers");
                    var groupMembersQuery = new Parse.Query(GroupMembers);
                    groupMembersQuery.equalTo("group", _group);
                    groupMembersQuery.include("members");
                    groupMembersQuery.find({
                        success: function(_groupMembers) {

                            console.log("Group Members List length: " + _groupMembers.length);
                            for (var i = 0; i < _groupMembers.length; i++) {
                                count = count + 1;
                                console.log("group Member user id: " + _groupMembers[i].get("member").id);
                                var user = new Parse.User();
                                user.id = _groupMembers[i].get("member").id;
                                if (user.id != me.id) {
                                    var pushQuery = new Parse.Query(Parse.Installation);
                                    pushQuery.equalTo('user', user);

                                    Parse.Push.send({
                                        where: pushQuery, // Set our Installation query
                                        data: {
                                            alert: "" + currentUserName + " just whispered in the Circle '" +
                                                title + "'.",
                                            sound: "default",
                                            WhisperId: groupId,
                                            pushType: "groupWhisper",
                                            badge: "Increment"
                                        }
                                    }, {
                                        success: function(success) {
                                            console.log("Push send successfully..  ");


                                        },
                                        error: function(error) {
                                            console.log("Error: " + error.code + " " + error.message);
                                            response.error("unable to send push.");
                                        }
                                    });


                                }

                            }
                            if (count == _groupMembers.length) {
                                response.success({
                                    message: "Group Creation push sent successfully"
                                });
                            }

                        },
                        error: function(error) {
                            console.log(error);
                        }

                    });

                    //response.success("Successfully created NewGroupWhisper with ObjectId:" + successGroupWhisper.id);


                },
                error: function(error) {
                    console.log("Error in created NewGroupWhisper : " + error.message);
                    response.error("Error in created NewGroupWhisper : " + error.message);
                }
            });

        },
        error: function(object, error) {
            console.log("Error in getting group object : " + error.message);
            response.error("Error in getting group object: " + error.message);
        }
    });
});


Parse.Cloud.define("addContactUs", function(request, response) {
    console.log("> addContactUs Parse Cloud Ran");
    var Contact = Parse.Object.extend("Contact");
    var contact = new Contact();

    contact.set("username", request.params.username);
    contact.set("email", request.params.email);
    contact.set("feedback", request.params.feedback);

    contact.save(null, {
        success: function(_contact) {
            response.success('New object created with objectId: ' + _contact.id);

        },
        error: function(_contacts, error) {
            response.error("Error in getting group object: " + error.message);
        }
    });
});

Parse.Cloud.define("getGroupsTest", function(request, response) {
    console.log('>getGroups Parse Cloud Ran.');

    var groupArray = [];
    var count = 0;
    var me = Parse.User.current();
    console.log("current User Id: " + me.id);

    var GroupMembers = Parse.Object.extend("GroupMembers");
    var groupMembersQuery = new Parse.Query(GroupMembers);

    var Group = Parse.Object.extend("Groups");
    var groupQuery = new Parse.Query(Group);
    groupQuery.get("p0Suo99K29", {
        success: function(_group) {

            groupMembersQuery.equalTo("member", me);
            groupMembersQuery.limit(1000);
            groupMembersQuery.include("group");
            groupMembersQuery.find({
                success: function(_groupMembers) {

                    console.log("_groupMembers length: " + _groupMembers.length);
                    if (_groupMembers.length == 0) {
                        console.log("You aren't part of any Circle yet. Go and create one!");
                        groupArray.push(_group);
                        response.success(groupArray);
                    } else {
                        for (var i = 0; i < _groupMembers.length; i++) {
                            groupArray.push(_groupMembers[i].attributes.group);
                            count = count + 1;
                            if (count == _groupMembers.length) {
                                groupArray.push(_group);
                                console.log("groupArray length: " + groupArray.length);
                                response.success(groupArray);
                            }

                        }
                    }
                },
                error: function(error) {
                    console.log("Error in groupsQuery: " + error.code + " " + error.message);
                    response.error("Error in groupsQuery: " + error.code + " " + error.message);
                }
            });
        },
        error: function(error) {
            console.log("Error in groupQuery: " + error.code + " " + error.message);
            response.error("Error in groupQuery: " + error.code + " " + error.message);
        }
    });

});

Parse.Cloud.define("getTwoResponseTest", function(request, response) {
    var GroupWhispers = Parse.Object.extend("GroupWhispers");
    var groupWhispersQuery = new Parse.Query(GroupWhispers);
    groupWhispersQuery.limit(1000);
    groupWhispersQuery.find({
        success: function(_groupWhispers) {
            console.log("_groupWhispers length: " + _groupWhispers.length);
            //response.success(_groupWhispers);
            var Groups = Parse.Object.extend("Groups");
            var groupQuery = new Parse.Query(Groups);
            groupQuery.limit(1000);
            groupQuery.find({
                success: function(_groups) {
                    console.log("_groups length: " + _groups.length);
                    response.success({
                        groups: _groups,
                        groupWhispers: _groupWhispers

                    });

                },
                error: function(error) {
                    console.log("Error in groupQuery: " + error.code + " " + error.message);
                    response.error("Error in groupQuery: " + error.code + " " + error.message);
                }
            });


        },
        error: function(error) {
            console.log("Error in groupWhispersQuery: " + error.code + " " + error.message);
            response.error("Error in groupWhispersQuery: " + error.code + " " + error.message);
        }
    });


});

Parse.Cloud.define("getGroupsAndMembers", function(request, response) {
    console.log("getGroupsAndMembers Cloud Code Ran..");
    console.log("getMembers Cloud Code Ran..");
    var _me = new Parse.User.current();
    var usersList = [];
    var followers = new Parse.Query("Follows").equalTo("follows", _me).equalTo("accepted", true).include("user").find();
    var followings = new Parse.Query("Follows").equalTo("user", _me).equalTo("accepted", true).include("follows").find();

    // wait for them all to complete using Parse.Promise.when()
    // result order will match the order passed to when()
    Parse.Promise.when(followers, followings).then(function(followersList, followingList) {


        for (var i = 0; i < followingList.length; i++) {
            var followObj = followingList[i];
            usersList.push(followObj.attributes.follows);

        }

        for (var j = 0; j < followersList.length; j++) {
            var followerObj = followersList[j];
            usersList.push(followerObj.attributes.user);

        }

        var newArr = [];
        var origLen = usersList.length;
        var found;
        var x;
        var y;

        for (x = 0; x < origLen; x++) {
            found = undefined;
            for (y = 0; y < newArr.length; y++) {
                if (usersList[x].id === newArr[y].id) {
                    found = true;
                    break;
                }
            }
            if (!found) newArr.push(usersList[x]);
        }
        //response.success(newArr);

        console.log('>getGroups Parse Cloud Ran.');
        var groupArray = [];
        var count = 0;
        var me = Parse.User.current();
        console.log("current User Id: " + me.id);

        var GroupMembers = Parse.Object.extend("GroupMembers");
        var groupMembersQuery = new Parse.Query(GroupMembers);
        groupMembersQuery.equalTo("member", me);
        groupMembersQuery.limit(1000);
        groupMembersQuery.include("group");
        groupMembersQuery.find({
            success: function(_groupMembers) {
                console.log("_groupMembers length: " + _groupMembers.length);
                if (_groupMembers.length == 0) {
                    // console.log("You aren't part of any Circle yet. Go and create one!");
                    // response.error("You aren't part of any Circle yet. Go and create one!");
                    var Group = Parse.Object.extend("Groups");
                    var groupQuery = new Parse.Query(Group);
                    groupQuery.equalTo("objectId", "p0Suo99K29");
                    groupQuery.find({
                        success: function(_group) {
                            //groupArray.push(_group);
                            //response.success(_group);
                            response.success({
                                groups: _group,
                                members: newArr

                            });
                        },
                        error: function(error) {
                            console.log("Error in groupQuery: " + error.code + " " + error.message);
                            response.error("Error in groupQuery: " + error.code + " " + error.message);
                        }
                    });
                } else {
                    for (var i = 0; i < _groupMembers.length; i++) {
                        groupArray.push(_groupMembers[i].attributes.group);
                        count = count + 1;
                        if (count == _groupMembers.length) {
                            var Group = Parse.Object.extend("Groups");
                            var groupQuery = new Parse.Query(Group);
                            groupQuery.get("p0Suo99K29", {
                                success: function(_group) {
                                    // The object was retrieved successfully.
                                    groupArray.push(_group);
                                    //response.success(groupArray);
                                    response.success({
                                        groups: groupArray,
                                        members: newArr

                                    });
                                },
                                error: function(object, error) {
                                    // The object was not retrieved successfully.
                                    // error is a Parse.Error with an error code and message.
                                    console.log("Error in groupQuery: " + error.code + " " + error.message);
                                    response.error("Error in groupQuery: " + error.code + " " + error.message);

                                }
                            });

                        }
                    }
                }
            },
            error: function(error) {
                console.log("Error in groupsQuery: " + error.code + " " + error.message);
                response.error("Error in groupsQuery: " + error.code + " " + error.message);
            }
        });
    });

});

Parse.Cloud.define("addGroupWithMemebersAndWhisper", function(request, response) {
    console.log("addGroupWithMemebersAndWhisper cloud code ran");
    var me = new Parse.User.current();
    var currentUserObj = me;
    var currentUserName = currentUserObj.attributes.profile.name;
    console.log("currentUserName: " + currentUserName);
    console.log("current User Id: " + me.id);
    var title = request.params.title;
    var locationName = request.params.locationName;
    var location = request.params.location;
    var image = request.params.image;
    var groupId = "";
    var membersArray = request.params.membersArray;
    membersArray.push(me.id);

    var count = 0;
    var GroupMembers = Parse.Object.extend("GroupMembers");
    var Groups = Parse.Object.extend("Groups");
    //Add group 
    var groups = new Groups();

    groups.set("title", title);
    groups.set("locationName", locationName);
    groups.set("location", location);
    groups.set("image", image);
    groups.set("createdBy", me);


    groups.save(null, {
        success: function(_group) {
            console.log('New group created with objectId: ' + _group.id);
            // response.success("" + groups.id);
            groupId = _group.id;
            if (groupId == "") {
                console.log("group created query failed");
            } else {
                for (var j = 0; j < membersArray.length; j++) {
                    //Add GroupMembers 
                    var groupMembers = new GroupMembers();
                    var user = new Parse.User();
                    user.id = membersArray[j];
                    groupMembers.set("member", user);
                    groupMembers.set("group", _group);

                    groupMembers.save(null, {
                        success: function(groups) {

                            count = count + 1;
                            if (count == membersArray.length) {
                                _group.set("memberCount", membersArray.length);
                                _group.save();
                                console.log("Successfully all members added in group.");
                                /*  response.success("Successfully created addNewGroupWithMembers"); */
                                console.log("> addGroupWhisper Parse Cloud Ran");
                               // var groupId = request.params.groupId;
                               // var me = Parse.User.current();
                                var counts = 0;
                               // var title = "";

                                var currentUserName = me.get("profile").name;

                                console.log("current User Id: " + me.id + ", name: " + currentUserName);

                                var GroupWhispers = Parse.Object.extend("GroupWhispers");


                               // title = _group.get("title");
                                console.log("group title: " + title);
                                var groupWhispers = new GroupWhispers();
                                groupWhispers.set("createdByMember", me);
                                groupWhispers.set("imageFile", request.params.imageFile);
                                groupWhispers.set("location", request.params.location);
                                groupWhispers.set("groups", _group);
                                groupWhispers.set("tags", request.params.tags);
                                groupWhispers.set("caption", request.params.caption);
                                groupWhispers.set("locationName", request.params.locationName);
                                groupWhispers.set("soundFile", request.params.soundFile);
                                groupWhispers.save(null, {
                                    success: function(successGroupWhisper) {
                                        _group.increment("whisperCount");
                                        _group.save();
                                        console.log("Successfully created NewGroupWhisper with ObjectId:" + successGroupWhisper.id);
                                        var GroupMembers = Parse.Object.extend("GroupMembers");
                                        var groupMembersQuery = new Parse.Query(GroupMembers);
                                        groupMembersQuery.equalTo("group", _group);
                                        groupMembersQuery.include("members");
                                        groupMembersQuery.find({
                                            success: function(_groupMembers) {

                                                console.log("Group Members List length: " + _groupMembers.length);
                                                for (var i = 0; i < _groupMembers.length; i++) {
                                                    count = count + 1;
                                                    console.log("group Member user id: " + _groupMembers[i].get("member").id);
                                                    var user = new Parse.User();
                                                    user.id = _groupMembers[i].get("member").id;
                                                    if (user.id != me.id) {
                                                        var pushQuery = new Parse.Query(Parse.Installation);
                                                        pushQuery.equalTo('user', user);

                                                        Parse.Push.send({
                                                            where: pushQuery, // Set our Installation query
                                                            data: {
                                                                alert: "" + currentUserName + " just whispered in the Circle '" +
                                                                    title + "'.",
                                                                sound: "default",
                                                                WhisperId: groupId,
                                                                pushType: "groupWhisper",
                                                                badge: "Increment"
                                                            }
                                                        }, {
                                                            success: function(success) {
                                                                console.log("Push send successfully..  ");


                                                            },
                                                            error: function(error) {
                                                                console.log("Error: " + error.code + " " + error.message);
                                                                response.error("unable to send push.");
                                                            }
                                                        });


                                                    }

                                                }
                                                if (counts == _groupMembers.length) {
                                                    response.success({
                                                        message: "Group Creation push sent successfully"
                                                    });
                                                }

                                            },
                                            error: function(error) {
                                                console.log(error);
                                            }

                                        });

                                        //response.success("Successfully created NewGroupWhisper with ObjectId:" + successGroupWhisper.id);


                                    },
                                    error: function(error) {
                                        console.log("Error in created NewGroupWhisper : " + error.message);
                                        response.error("Error in created NewGroupWhisper : " + error.message);
                                    }
                                });



                                for (var i = 0; i < membersArray.length; i++) {
                                    var user = new Parse.User();
                                    user.id = membersArray[i];
                                    if (user.id != me.id) {
                                        var pushQuery = new Parse.Query(Parse.Installation);
                                        pushQuery.equalTo('user', user);

                                        Parse.Push.send({
                                            where: pushQuery, // Set our Installation query
                                            data: {
                                                alert: "" + currentUserName + " added you in the Circle '" +
                                                    title + "'.",
                                                sound: "default",
                                                WhisperId: groupId,
                                                pushType: "group",
                                                badge: "Increment"
                                            }
                                        }, {
                                            success: function(success) {
                                                console.log("Push send successfully..  ");
                                                /*  response.success({
                                                      message: "Group Creation push sent successfully"
                                                  });*/
                                            },
                                            error: function(error) {
                                                console.log("Error: " + error.code + " " + error.message);
                                                response.error("unable to send push.");
                                            }
                                        });
                                    }

                                }
                            }

                        },
                        error: function(gameScore, error) {
                            console.log('Failed to create new object, with error code: ' + error.message);
                            response.error('Failed to create new object, with error code: ' + error.message);
                        }
                    });

                }

            }

        },
        error: function(groups, error) {
            console.log('Failed to create new Group, with error code: ' + error.message);
            response.error('Failed to create new Group, with error code: ' + error.message);
        }
    });
});