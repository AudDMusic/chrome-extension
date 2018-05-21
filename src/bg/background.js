function MediaRecorderWrapper(user_media_stream) {

    var _user_media_stream = user_media_stream;
    var _media_stream = null;
    var _mime_type = 'audio/webm';
    if (typeof window.InstallTrigger !== 'undefined') {
        _mime_type = 'audio/ogg';
    }
    var _media_recorder = null;

    var _is_opera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    var _is_chrome = !!window.chrome && !_is_opera;
    var _is_firefox = typeof window.InstallTrigger !== 'undefined';

    var _is_recording = false;

    var _dom_interval_handler = null;

    var self = this;

    function is_MediaRecorder_compatible() {
        if (_is_firefox) {
            return true;
        }
        if (!_is_chrome) {
            return false;
        }

        var t_offset = -1;
        var version_str = navigator.userAgent;
        console.log(version_str);

        if ((t_offset = version_str.indexOf('Chrome')) !== -1) {
            version_str = version_str.substring(t_offset + 7);
        }
        if ((t_offset = version_str.indexOf(';')) !== -1) {
            version_str = version_str.substring(0, t_offset);
        }
        if ((t_offset = version_str.indexOf(' ')) !== -1) {
            version_str = version_str.substring(0, t_offset);
        }

        var major_version = parseInt('' + version_str, 10);

        if (isNaN(major_version)) {
            major_version = parseInt(navigator.appVersion, 10);
        }

        console.log(major_version);

        return major_version >= 49;
    }

    this.start = function(record_time_ms) {
        if (_is_recording) {
            return true;
        }
        _is_recording = true;

        var _MediaStream = window.MediaStream;
        if (typeof _MediaStream === 'undefined' && typeof webkitMediaStream !== 'undefined') {
            _MediaStream = webkitMediaStream;
        }
        if (typeof _MediaStream === 'undefined' || !_MediaStream) {
            console.error("_MediaStream === 'undefined'");
            return false;
        }

        if (_user_media_stream.getAudioTracks().length <= 0) {
            console.error("_user_media_stream.getAudioTracks().length <= 0");
            return false;
        }

        if (!!navigator.mozGetUserMedia) {
            _media_stream = new _MediaStream();
            _media_stream.addTrack(_user_media_stream.getAudioTracks()[0]);
        } else {
            // webkitMediaStream
            _media_stream = new _MediaStream(_user_media_stream.getAudioTracks());
        }

        var recorder_hints = {
            mimeType: _mime_type
        };

        if (!is_MediaRecorder_compatible()) {
            // to support video-only recording on stable
            recorder_hints = 'video/vp8';
        }

        // http://dxr.mozilla.org/mozilla-central/source/content/media/MediaRecorder.cpp
        // https://wiki.mozilla.org/Gecko:MediaRecorder
        // https://dvcs.w3.org/hg/dap/raw-file/default/media-stream-capture/MediaRecorder.html
        // starting a recording session; which will initiate "Reading Thread"
        // "Reading Thread" are used to prevent main-thread blocking scenarios
        try {
            _media_recorder = new MediaRecorder(_media_stream, recorder_hints);
        } catch (e) {
            // if someone passed NON_supported mimeType
            // or if Firefox on Android
            _media_recorder = new MediaRecorder(_media_stream);
        }

        if (!_media_recorder ||
            ('canRecordMimeType' in _media_recorder && _media_recorder.canRecordMimeType(_mime_type) === false)) {
            console.warn('MediaRecorder API seems unable to record mimeType:', _mime_type);
            return false;
        }

        // i.e. stop recording when <video> is paused by the user; and auto restart recording
        // when video is resumed. E.g. yourStream.getVideoTracks()[0].muted = true; // it will auto-stop recording.
        //mediaRecorder.ignoreMutedMedia = self.ignoreMutedMedia || false;
        // Dispatching OnDataAvailable Handler
        _media_recorder.ondataavailable = function(e) {
            if (!_is_recording) {
                console.log("MediaRecorderWrapper record have stopped.");
                return;
            }

            var ret = {"status":0, "data": new Blob([e.data], {type: _mime_type})};
            if (!e.data || !e.data.size || e.data.size < 26800) {
                ret = {"status":-1, "data": "audio none: can not record audio."};
            }

            self.ondataavailable(ret);
        };

        _media_recorder.onerror = function(error) {
            console.error(error.name);

            self.ondataavailable({"status":-1, "data": error.name + ": can not record audio."});

            if (_media_recorder) {
                _media_recorder.stop();
            }
        };

        // void start(optional long mTimeSlice)
        // The interval of passing encoded data from EncodedBufferCache to onDataAvailable
        // handler. "mTimeSlice < 0" means Session object does not push encoded data to
        // onDataAvailable, instead, it passive wait the client side pull encoded data
        // by calling requestData API.
        try {
            _media_recorder.start(3.6e+6);
        } catch (e) {
            console.error(e);
            return false;
        }

        _dom_interval_handler = setInterval(function() {
            if (!_is_recording) {
                return;
            }

            if (!_media_recorder) {
                return;
            }
            if (_media_recorder.state === 'recording') {
                _media_recorder.requestData();
            }
        }, record_time_ms);

        return true;
    };


    this.stop = function() {
        console.log("MediaRecorderWrapper stop");

        if (!_is_recording) {
            return;
        }

        _is_recording = false;
        if (_dom_interval_handler) {
            clearInterval(_dom_interval_handler);
            _dom_interval_handler = null;
        }

        if (_media_recorder && _media_recorder.state === 'recording') {
            _media_recorder.stop();
            try {
                _user_media_stream.getAudioTracks()[0].stop();
            } catch (e) {
                console.error(e);
            }
        }
    };

    this.ondataavailable = function(blob) {
        console.log('recorded-blob', blob);
    };
}

function AudioRecorder() {

    var _is_recording = false;
    var _record_time_ms = 5500;
    var _media_recorder_handler = null;

    var is_recording = function() {
        return _is_recording;
    }

    var start = function(recognize_client) {
        if (_is_recording) {
            console.log("_is_recording=" + _is_recording);
            return;
        }
        _is_recording = true;

        chrome.tabCapture.capture({
            audio : true,
            video : false
        }, function(audio_stream) {
            var audio = new Audio(window.URL.createObjectURL(audio_stream));
            audio.play();

            _media_recorder_handler = new MediaRecorderWrapper(audio_stream);

            _media_recorder_handler.ondataavailable = function (audio_buffer_obj) {
                recognize_client.record_callback(audio_buffer_obj);
            };

            if(!_media_recorder_handler.start(_record_time_ms)) {
                recognize_client.record_callback({"status":-1, "data": "start error: can not record audio."});
            }
        });
    };

    var stop = function() {
        console.log("AudioRecorder stop");
        _media_recorder_handler.stop();
        _is_recording = false;
    };

    return {
        start: start,
        stop: stop,
        is_recording: is_recording
    };
}

function StorageHelper() {

    var _is_sync = false;
    var _history_datas = [];
    var _device_id = "";

    chrome.runtime.onInstalled.addListener(function(details) {
        chrome.storage.sync.get("history_datas", function (history_datas) {
            var t_history_datas = history_datas['history_datas'];
            if (t_history_datas && (t_history_datas.length > 0)) {
                chrome.storage.local.set({
                    "history_datas": t_history_datas
                });
            }

            chrome.storage.sync.set({
                "history_datas": []
            });
        });
    });

    chrome.storage.local.get('history_datas', function (result) {
        _history_datas = result['history_datas'];
        if (!_history_datas) {
            _history_datas = [];
        }

        _is_sync = true;
    });

    chrome.storage.sync.get("device_id", function (datas) {
        var device_id = datas['device_id'];
        if (device_id) {
            _device_id = device_id;
        } else {
            _device_id = Math.random() + "" + new Date().getTime();
            chrome.storage.sync.set({
                "device_id": _device_id
            }, function () {
                console.log('storage set');
            });
        }
    });

    var get = function() {
        return _history_datas;
    };

    var get_device_id = function() {
        return _device_id;
    };

    var set = function(song) {
        _history_datas.unshift(song);

        chrome.storage.local.set({
            "history_datas": _history_datas
        }, function() {
            console.log(chrome.runtime.lastError);
        });
    };

    var clear = function() {
        //chrome.storage.sync.clear(function() {
        //    console.log("chrome.storage.sync.clear");
        //    _history_datas = [];
        //});
        chrome.storage.local.set({
            "history_datas": []
        }, function () {
            _history_datas = [];
        });
    };

    return {
        get: get,
        set: set,
        clear: clear,
        get_device_id: get_device_id
    }
}

var g_recognizer_client = (function() {

    this._server_url = "https://api.audd.io/";
    this._params = {};
    this._audio_recorder = AudioRecorder();
    this._storage_helper = StorageHelper();
    this._is_recognizing = false;

    var self = this;

    function _do_recognize(audio_buffer, token) {
        var local_lan = chrome.i18n.getUILanguage();
        if (!local_lan) {
            local_lan = navigator.language;
        }
        var s_url = this._server_url;

        var browser_version = navigator.userAgent;
        var device_id = this._storage_helper.get_device_id();

        var post_data = new FormData();
        for (var key in self._params) {
            post_data.append(key, self._params[key]);
        }

        var manifest = chrome.runtime.getManifest();
        var app_id = chrome.runtime.id;
        console.log(app_id);

        post_data.append('api_token', '8ec90ef80fd1b750c990642d6e17ccb9');
        post_data.append('file', audio_buffer);
        post_data.append('local_lan', local_lan);
        //post_data.append('browser_version', browser_version);
        post_data.append('device_id', device_id);
        post_data.append('version', manifest.version);
        post_data.append("app_id", app_id);

        $.ajax({
            type: 'POST',
            url: s_url,
            data: post_data,
            timeout : 15000,
            dataType: 'json',
            processData: false,
            contentType: false,
            success: function(data) {
                console.log(data);
                if (data['status'] == "success") {
                    var song = data['result'];
                    song["timestamp"] = new Date().getTime();
                    song["tab_url"] = self._params["tab_url"];
                    chrome.runtime.sendMessage({cmd: "popup_parse_result", result: {"status": "success", "msg": "", "result": song}});
                    self._storage_helper.set(song);
                    self.reload();
                } else {
                    chrome.runtime.sendMessage({cmd: "popup_error", result: {"status": -1, "msg": data['msg']}});
                }
            },
            error: function(error, textStatus) {
                console.log(error);
                var msg = "HTTP Error (Code = " + textStatus + ")";
                if (textStatus == 'timeout') {
                    msg = "Network Timeout";
                }
                chrome.runtime.sendMessage({cmd: "popup_error", result: {"status": -1, "msg": msg}});
            }
        });
    }

    function _do_recognize_auth(audio_buffer) {
        chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
                chrome.runtime.sendMessage({cmd: "popup_login"});
            }
			//else {
                _do_recognize(audio_buffer, token);
            //}
        });
    }

    this.record_callback = function(audio_buffer_obj) {
        self.stop();

        if (audio_buffer_obj['status'] != 0) {
            chrome.runtime.sendMessage({cmd: "popup_error", result: {"status": -1, "msg": audio_buffer_obj['data']}});
            return;
        }

        //if (self._params["email"]) {
        //    _do_recognize_auth(audio_buffer_obj['data']);
        //} else {
            _do_recognize(audio_buffer_obj['data'], "no_login");
        //}
    };

    this.start = function(params) {
        if (self._is_recognizing) {
            return;
        }
        self._is_recognizing = true;

        if (params) {
            self._params = params;
        }
        _audio_recorder.start(self);
    };

    this.stop = function() {
        if (!self._is_recognizing) {
            return;
        }
        if (self._audio_recorder) {
            self._audio_recorder.stop();
        }
        self._is_recognizing = false;
    };

    this.reload = function() {
        chrome.runtime.sendMessage({cmd: "popup_reload",
            result: {"status": 0, "msg": "", "recognize_status": self._is_recognizing, "data": self._storage_helper.get()}});
    };

    this.init = function() {
        chrome.runtime.sendMessage({cmd: "popup_init",
            result: {"status": 0, "msg": "", "recognize_status": self._is_recognizing, "data": self._storage_helper.get()}});
    };

    this.clear_history = function() {
        self._storage_helper.clear();
        chrome.runtime.sendMessage({cmd: "popup_reload",
            result: {"status": 0, "msg": "", "recognize_status": self._is_recognizing, "data": []}});
    };

    return self;
})();

chrome.windows.onRemoved.addListener(function(windowId) {
    chrome.notifications.clear("clear_history");
});

chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {

    switch (request.cmd) {
        case "background_start":
            chrome.tabs.query({active:true, currentWindow:true}, function(tabs) {
                if (tabs.length < 1) {
                    console.error("no selected tab");
                    chrome.runtime.sendMessage({cmd: "popup_error", result: {"status": -1, "msg": chrome.i18n.getMessage("selectOneTab")}});
                    return;
                }

                var current_tag = tabs[0];
                var tab_url = current_tag['url'];
                var tab_title = current_tag['title'];
                if (!current_tag['audible']) {
                    chrome.runtime.sendMessage({cmd: "popup_error", result: {"status": -1, "msg": chrome.i18n.getMessage("tabHasntAudio")}});
                    return;
                }

                chrome.identity.getProfileUserInfo(function(user_info) {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError.message);
                        chrome.runtime.sendMessage({cmd: "popup_login"});
                    } 
					//else {
                        g_recognizer_client.start({
                            "tab_url": tab_url,
                            "email": user_info["email"],
                            "google_id": user_info["id"],
                            "tab_title": tab_title});
                    //}
                });
            });

            break;

        case "background_cancel":
            if (g_recognizer_client) {
                g_recognizer_client.stop();
            }
            break;

        case "background_reload":
            if (g_recognizer_client) {
                g_recognizer_client.reload();
            }
            break;

        case "background_init":
            if (g_recognizer_client) {
                g_recognizer_client.init();
            }
            break;

        case "background_clear_history":
            console.log("background_clear_history");
            chrome.notifications.create("clear_history", {buttons:[{title:chrome.i18n.getMessage("yes")},{title:chrome.i18n.getMessage("no")}],
                title:chrome.i18n.getMessage("confirm"), message:chrome.i18n.getMessage("confirmQuestion"), type:"basic", requireInteraction: true,
                iconUrl:"../../icons/icon.png"}, function(notificationId) {
                setTimeout(function(){
                    chrome.notifications.clear(notificationId);
                }, 10000);

                chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
                    if (buttonIndex == 0) {
                        if (g_recognizer_client) {
                            g_recognizer_client.clear_history();
                        }
                    }
                    chrome.notifications.clear(notificationId);
                });
            });
            break;
    }

});