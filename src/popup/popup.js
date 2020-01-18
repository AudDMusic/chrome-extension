function checkArtistsMatch(song) {
	var song_artist = clean_names(song.artist);
	var lyrics_artist = clean_names(song.lyrics.artist);
	var lyrics_fullTitle = clean_names(song.lyrics.full_title);
	return lyrics_fullTitle.includes(song_artist) || song_artist.includes(lyrics_artist);
}
function clean_names(str) {
	return str.toLowerCase().replace(/\s/g, '').replace(/&/gi, '').replace(/,/gi, '').replace(/feat/gi, '').replace(/ft/gi, '');
}

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

    var _list_template_str = $("#list_template").html();
    var _list_template = Handlebars.compile(_list_template_str);

    var screens = ['history', 'lyrics', 'initial', 'settings']

    screens.forEach(function(curScreen) {
        $('#' + curScreen + '_button').on('click', function() {
            $('.screen').css('display', 'none');
            $('#' + curScreen + '_screen').css('display', 'block');

            $('.screen_func').hide();
            $('.settings_button').hide();
            $('.screen_func[screen="' + curScreen + '"]').show();
            $('.settings_button[screen="' + curScreen + '"]').show();
        })
        $('[button-'+curScreen+']').on('click', function() {
            $('.screen').css('display', 'none');
            $('#' + curScreen + '_screen').css('display', 'block');

            $('.screen_func').hide();
            $('.settings_button').hide();
            $('.screen_func[screen="' + curScreen + '"]').show();
            $('.settings_button[screen="' + curScreen + '"]').show();
        })
    })

    var show_message = function(msg, level) {
        var show_class = 'success';
        if (level == -1) {
            show_class = 'error';
        }

        $("#main_header").hide();
        $("#main_header h1").html(msg);
        $("#main_header").addClass(show_class);
        $("#main_header").slideDown(msg);
    };

    var show_new_result = function(song) {
        var img = "../../img/no-album.png"
        
        if (song.apple_music) {
            if (song.apple_music.artwork && song.apple_music.artwork.url) img = song.apple_music.artwork.url.replace("{w}x{h}","171x171");
        } else if (song.spotify) {
			if (song.spotify.album.images[0].url) img = song.spotify.album.images[0].url;
		} else if (song.deezer && song.deezer.album) {
            if (song.deezer.album.cover_big) img = song.deezer.album.cover_big;
        } 

        song.albumImage = img;
        if (img != "../../img/auddio-mic-logo.png") song.imageClass = "found";
        else song.imageClass = "";
		song.playsAt = chrome.i18n.getMessage("playsAt");
        song.links = [];
		var usedLabels = {};
		
		if (song["song_link"]) {
			song.links.push({
				"image": "../../img/auddio-mic-logo.png",
				"link": song["song_link"],
				"label": "lis.tn"
			})
			usedLabels["lis.tn"] = true;
		}
        if (song["apple_music"] && song["apple_music"]["url"]) {
            song.links.push({
                "image": "../../img/applemusic-icon.svg",
                "link": song["apple_music"]["url"],
                "label": "Apple Music"
            })
			usedLabels["apple_music"] = true;
        }
        if (song["deezer"] && song["deezer"]["link"]) {
            song.links.push({
                "image": "../../img/deezer-icon.png",
                "link": song["deezer"]["link"],
                "label": "Deezer"
            })
			usedLabels["deezer"] = true;
        }
        if (song["spotify"] && song["spotify"]["external_urls"] && song["spotify"]["external_urls"]["spotify"]) {
            song.links.push({
                "image": "../../img/spotify-icon.png",
                "link": song["spotify"]["external_urls"]["spotify"],
                "label": "Spotify"
            })
			usedLabels["spotify"] = true;
        }
		if(song.lyrics) {
			if (song.lyrics.media) {
				var media = JSON.parse(song.lyrics.media)
				media.forEach(function(mediaItem) {
					if(usedLabels[mediaItem["provider"]]) return;
					switch(mediaItem["provider"]) {
						case "spotify":
							song.links.push({
								"image": "../../img/spotify-icon.png",
								"link": mediaItem["url"],
								"label": "Spotify"
							})
							break;
						case "youtube":
							song.links.push({
								"image": "../../img/youtube-icon.png",
								"link": mediaItem["url"],
								"label": "YouTube"
							})
							break;
						case "apple_music":
							song.links.push({
								"image": "../../img/applemusic-icon.svg",
								"link": mediaItem["url"],
								"label": "Apple Music"
							})
							break;
					}
				})
			}
		}

        var music_info_html = _music_info_template(song);
        $('#initial_screen_info').html(music_info_html);

        var new_history_html = _list_template([song]);
        $('#history_screen_title').append(new_history_html);

        if (song.lyrics && song.lyrics.lyrics && checkArtistsMatch(song)) {
            $("#lyrics_body").html(song.lyrics.lyrics.replace(/(?:\r\n|\r|\n)/g, '<br>').replace(/(\])/g, ']<br>'));
        } else {
            $("#lyrics_body").text(chrome.i18n.getMessage("noLyrics"));
        }
    };

    var refresh = function(data) {
        if (typeof data !== "undefined") {
            $("#history_screen_info").html("");

            data.forEach(function(item) {
                item.links = [];
				var usedLabels = {};
				if (item["song_link"]) {
					item.links.push({
						"image": "../../img/auddio-mic-logo.png",
						"link": item["song_link"],
						"label": "lis.tn"
					})
					usedLabels["lis.tn"] = true;
				}
                if (item["apple_music"] && item["apple_music"]["url"]) {
                    item.links.push({
                        "image": "../../img/applemusic-icon.svg",
                        "link": item["apple_music"]["url"],
                        "label": "Apple Music"
                    })
					usedLabels["apple_music"] = true;
                }
				if (item["deezer"] && item["deezer"]["link"]) {
					item.links.push({
						"image": "../../img/deezer-icon.png",
						"link": item["deezer"]["link"],
						"label": "Deezer"
					})
					usedLabels["deezer"] = true;
				}
				if (item["spotify"] && item["spotify"]["external_urls"] && item["spotify"]["external_urls"]["spotify"]) {
					item.links.push({
						"image": "../../img/spotify-icon.png",
						"link": item["spotify"]["external_urls"]["spotify"],
						"label": "Spotify"
					})
					usedLabels["spotify"] = true;
				}
				
				if (item.lyrics && checkArtistsMatch(item)) {
					if (item.lyrics.media) {
						var media = JSON.parse(item.lyrics.media)
						media.forEach(function(mediaItem) {
							if(usedLabels[mediaItem["provider"]]) return;
							switch(mediaItem["provider"]) {
								case "spotify":
									item.links.push({
										"image": "../../img/spotify-icon.png",
										"link": mediaItem["url"],
										"label": "Spotify"
									})
									break;
								case "youtube":
									item.links.push({
										"image": "../../img/youtube-icon.png",
										"link": mediaItem["url"],
										"label": "YouTube"
									})
									break;
								case "apple_music":
									item.links.push({
										"image": "../../img/applemusic-icon.svg",
										"link": mediaItem["url"],
										"label": "Apple Music"
									})
									break;
							}
						})
					}
				}
            })

            var tmp_html = _list_template({"music_info": data});
            $("#history_screen_info").html(tmp_html);
            $("#history_screen_info").slideDown("slow");
        }

        $("a").each(function() {
            var url = $(this).attr('url');
            var is_set_click = $(this).attr('is_set_click');
            if (url && !is_set_click) {
                $(this).attr('is_set_click', "true");
                $(this).on('click', function() {
                    //var name = $(this).attr('name');
                    chrome.tabs.create({url: url});
                });
            }
        });

        $('.sub_menu_toggle').off("click");

        $('.sub_menu_toggle').on('click', function() {
            expand_details($(this));
        })
    };

    var audio_band = 1;

    var audio_bands_func;

    var start = function() {
        $("#main_header").hide();
        $(".sub_menu_toggle.info").hide();
        $("#initial_screen_search_img, #initial_screen_search_img2, #logo, .audio-bands").removeClass("found")
        $("#initial_screen_search_img, #initial_screen_search_img2").addClass("start");
        $(".audio-bands").css("opacity", "1");
        audio_bands_func = setInterval(function(band) {
            $(".audio-band").removeClass("active");
            $(".audio-band." + audio_band % 3).addClass("active");
            audio_band++;
        }, 500);
    };

    var stop = function() {
        clearInterval(audio_bands_func);
        if ($("#initial_screen_album").attr("src") == "../../img/microphone.gif")
            $("#initial_screen_album").attr("src", "../../img/auddio-mic-logo.png")
        $("#initial_screen_album").removeClass("searching");

        $("#initial_screen_search_img, #initial_screen_search_img2").removeClass("start");
        $("#initial_screen_search_img, #initial_screen_search_img2, #logo, .audio-bands").addClass("found");
        $(".sub_menu_toggle.info").show();
    };

    var reset = function() {
        $("#search_result").fadeOut();
        $('#search_result').html("");
    };

    var clear_history = function() {
        $('#search_result').html("");
    };

    var expand_details = function(item) {
        const isDisplayed = $(item).siblings(".sub_menu").hasClass("show");
        $(".sub_menu").removeClass("show");

        if (!isDisplayed) $(item).siblings(".sub_menu").addClass("show");
    }

    return {
        start: start,
        stop: stop,
        show_message: show_message,
        refresh: refresh,
        reset: reset,
        show_new_result: show_new_result,
        clear_history: clear_history,
        expand_details: expand_details
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
                case "popup_show_token":
					$('#token_input').val(request.result);
                    return;
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

    $('.screen_func[screen="initial"]').on('click', function() {
        recognizer_controller.start();
    });

    $('.screen_func[screen="history"]').on('click', function() {
        recognizer_controller.clear_history();
    });
    chrome.runtime.sendMessage({cmd: "get_token"});
	$('#save_token').on('click', function() {
		chrome.runtime.sendMessage({cmd: "change_token", data: $('#token_input').val()});
	})

    recognizer_controller.init();

    recognizer_controller.start();

    (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
    })();
}

$(window).on('load', function() {
    var date = new Date();
    var year = date.getFullYear();
    $('#copyright_year').html(year);

    setTimeout(init, 800);
    
    var objects = document.getElementsByTagName('*'), i;
    for(i = 0; i < objects.length; i++) {
      if (objects[i].dataset && objects[i].dataset.message) {
        objects[i].innerHTML = chrome.i18n.getMessage(objects[i].dataset.message);
      }
    }
});
