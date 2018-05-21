function PopupView() {
    Handlebars.registerHelper('if_even', function(conditional, options) {
        if(((conditional+1) % 2) == 0) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });
    Handlebars.registerHelper('format_date', function(timestamp, options) {
        var newDate = new Date();
        newDate.setTime(parseInt(timestamp));
        return newDate.format("dd/MM/yyyy hh:mm:ss");
    });

    var _music_info_template_str = $("#music_info_template").html();
    var _music_info_template = Handlebars.compile(_music_info_template_str);

    var show_message = function(msg, level) {
        var show_class = 'success';
        if (level == -1) {
            show_class = 'error';
        }

        $("#search_result").hide();
        $('#search_result').html("<div class='" +show_class+ "'>" + msg + "</div>");
        $("#search_result").slideDown("slow");
    };

    var show_new_result = function(song) {
        var tmp_html = _music_info_template({"music_infos": [song]});
        var result_obj = $(tmp_html).addClass("success");
        $('#search_result').append(result_obj);
        $('#search_result').slideDown("slow");
    };

    var refresh = function(datas) {
        if (typeof datas !== "undefined") {
            $("#history_music_info").html("");
            var tmp_html = _music_info_template({"music_infos": datas});
            $("#history_music_info").html(tmp_html);
            $("#history_music_info").slideDown("slow");
        }

        $("a").each(function() {
            var url = $(this).attr('url');
            var is_set_click = $(this).attr('is_set_click');
            if (url && !is_set_click) {
                $(this).attr('is_set_click', "true");
                $(this).click(function() {
                    var name = $(this).attr('name');
                    chrome.tabs.create({url: url});
                });
            }
        });
    };

    var start = function() {
        $("#search_bar_start").hide();
        $("#search_bar_running").show();
    };

    var stop = function() {
        $("#search_bar_start").show();
        $("#search_bar_running").hide();
    };

    var reset = function() {
        $("#search_result").fadeOut();
        $('#search_result').html("");
    };

    var clear_history = function() {
        $('#search_result').html("");
    };

    return {
        start: start,
        stop: stop,
        show_message: show_message,
        refresh: refresh,
        reset: reset,
        show_new_result: show_new_result,
        clear_history: clear_history
    };
}

function RecognizerController(popup_view) {
    var _popup_view = popup_view;

    chrome.runtime.onMessage.addListener(

        function(request, sender, sendResponse) {
            switch (request.cmd) {
                case "popup_init":
                case "popup_reload":
                    console.log(request.result);
                    _popup_view.refresh(request.result["data"]);
                    if (request.result["recognize_status"]) {
                        _popup_view.start();
                    }
                    break;
                case "popup_parse_result":
                    _popup_view.show_new_result(request.result["result"]);
                    break;
                case "popup_error":
                    console.log(request.result);
                    _popup_view.show_message(request.result["msg"], -1);
                    break;
                case "popup_update_version":
                    console.log(request.result);
                    _popup_view.show_message(request.result["msg"], -1);
                    break;
                case "popup_login":
                    _popup_view.show_message(chrome.i18n.getMessage("signIn"), -1);
                    break;
            }
            if (request.cmd != "popup_init") {
                _popup_view.stop();
            }
            _popup_view.refresh();
        });

    var start = function() {
        this.cancel();
        chrome.runtime.sendMessage({cmd: "background_start"});
        _popup_view.start();
    };

    var cancel = function() {
        _popup_view.reset();
        chrome.runtime.sendMessage({cmd: "background_cancel"});
    };

    var reload = function() {
        chrome.runtime.sendMessage({cmd: "background_reload"});
    };

    var init = function() {
        chrome.runtime.sendMessage({cmd: "background_init"});
    };

    var clear_history = function() {
        chrome.runtime.sendMessage({cmd: "background_clear_history"});
    };

    return {
        init: init,
        reload: reload,
        start: start,
        cancel: cancel,
        clear_history: clear_history
    }
}

function init() {
    Date.prototype.format = function (fmt) {
        var o = {
            "M+": this.getMonth() + 1,
            "d+": this.getDate(),
            "h+": this.getHours(),
            "m+": this.getMinutes(),
            "s+": this.getSeconds(),
            "q+": Math.floor((this.getMonth() + 3) / 3),
            "S": this.getMilliseconds()
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    };

    var popup_view = PopupView();
    var recognizer_controller = RecognizerController(popup_view);

    $("#search_bar_start").click(function() {
        recognizer_controller.start();
    });

    $("#recycle").click(function() {
        recognizer_controller.clear_history();
    });

    recognizer_controller.init();

    recognizer_controller.start();

    (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();
}

$(window).load(function() {
    var date = new Date;
    var year = date.getFullYear();
    $('#copyright_year').html(year);

    setTimeout(init, 800);
});