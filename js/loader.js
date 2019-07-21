/*
	----------------------------------------------------------
	MIDI.Plugin : 0.3.4 : 2015-03-26
	----------------------------------------------------------
	https://github.com/mudcube/MIDI.js
	----------------------------------------------------------
	Inspired by javax.sound.midi (albeit a super simple version): 
		http://docs.oracle.com/javase/6/docs/api/javax/sound/midi/package-summary.html
	----------------------------------------------------------
	Technologies
	----------------------------------------------------------
		Web MIDI API - no native support yet (jazzplugin)
		Web Audio API - firefox 25+, chrome 10+, safari 6+, opera 15+
		HTML5 Audio Tag - ie 9+, firefox 3.5+, chrome 4+, safari 4+, opera 9.5+, ios 4+, android 2.3+
	----------------------------------------------------------
*/
import $ from 'jquery';

import { audioDetect } from './audioDetect.js';
import * as AudioTag from './plugin.audiotag.js';
import * as WebAudio from './plugin.webaudio.js';
import * as WebMIDI from './plugin.webmidi.js';
import { GM } from './gm.js';

export const Soundfont = {};
export const Player = {};
export const Players = {};

export const audio_contexts = {
	AudioTag,
	WebAudio,
	WebMIDI,
}

export const config = {
	soundfontUrl: './soundfont/',
	__api: undefined,
	__audioFormat: undefined,
	supports: {},
	connected_plugin: undefined,
};

/*
MIDI.loadPlugin({
	onsuccess: function() { },
	onprogress: function(state, percent) { },
	targetFormat: 'mp3', // optionally can force to use MP3 (for instance on mobile networks)
	instrument: 'acoustic_grand_piano', // or 1 (default)
	instruments: [ 'acoustic_grand_piano', 'acoustic_guitar_nylon' ] // or multiple instruments
});
*/

export const loadPlugin = opts => {
	if (typeof opts === 'function') {
		opts = {
			onsuccess: opts
		};
	}
	opts.onprogress = opts.onprogress || undefined;
	opts.api = opts.api || '';
	opts.targetFormat = opts.targetFormat || '';
	opts.instrument = opts.instrument || 'acoustic_grand_piano';
	opts.instruments = opts.instruments || [];

	config.soundfontUrl = opts.soundfontUrl || config.soundfontUrl;

	// Detect the best type of audio to use
	audioDetect(supports => {
		const hash = window.location.hash;
		let api = '';

		// use the most appropriate plugin if not specified
		if (supports[opts.api]) {
			api = opts.api;
		} else if (supports[hash.substr(1)]) {
			api = hash.substr(1);
		} else if (supports.webmidi) {
		 	api = 'webmidi';
		} else if (window.AudioContext) { // Chrome
			api = 'webaudio';
		} else if (window.Audio) { // Firefox
			api = 'audiotag';
		}

		if (connect[api]) {
			let audioFormat;
			// use audio/ogg when supported
			if (opts.targetFormat) {
				audioFormat = opts.targetFormat;
			} else { // use best quality
				audioFormat = supports['audio/ogg'] ? 'ogg' : 'mp3';
			}

			// load the specified plugin
			config.__api = api;
			config.__audioFormat = audioFormat;
			config.supports = supports;
			loadResource(opts);
		}
	});
};

/*
	loadResource({
		onsuccess: function() { },
		onprogress: function(state, percent) { },
		instrument: 'banjo'
	})
*/

export const loadResource = opts => {
	let instruments = opts.instruments || opts.instrument || 'acoustic_grand_piano';
	//
	if (typeof instruments !== 'object') {
		if (instruments || instruments === 0) {
			instruments = [instruments];
		} else {
			instruments = [];
		}
	}
	// convert numeric ids into strings
	for (let i = 0; i < instruments.length; i ++) {
		const instrument = instruments[i];
		if (instrument === (instrument + 0)) { // is numeric
			if (GM.byId[instrument]) {
				instruments[i] = GM.byId[instrument].id;
			}
		}
	}
	//
	opts.format = config.__audioFormat;
	opts.instruments = instruments;
	//
	connect[config.__api](opts);
};

const connect = {
	webmidi: opts => {
		// cant wait for this to be standardized!
		WebMIDI.connect(opts);
		post_connect(WebMIDI);
	},
	audiotag: opts => {
		// works ok, kinda like a drunken tuna fish, across the board
		// http://caniuse.com/audio
		requestQueue(opts, 'AudioTag');
		config.connected_plugin = AudioTag;
	},
	webaudio: opts => {
		// works awesome! safari, chrome and firefox support
		// http://caniuse.com/web-audio
		requestQueue(opts, 'WebAudio');
		config.connected_plugin = WebAudio;
	}
};

const post_connect = plugin => {
	config.connected_plugin = plugin;
	plugin.shared_root_info.Soundfont = Soundfont;
	plugin.shared_root_info.Player = Player;
	plugin.shared_root_info.Players = Players;
}

export const requestQueue = (opts, context) => {
	const audioFormat = opts.format;
	const instruments = opts.instruments;
	const onprogress = opts.onprogress;
	const onerror = opts.onerror;
	const correct_audio_context = audio_contexts[context] || context.WebAudio;

	const num_instruments = instruments.length;
	let pending = num_instruments;
	const waitForEnd = () => {
		pending -= 1;
		if (!pending) {
			onprogress && onprogress('load', 1.0);
			correct_audio_context.connect(opts);
		}
	};

	for (const instrumentId of instruments) {
		if (Soundfont[instrumentId]) { // already loaded
			waitForEnd();
		} else { // needs to be requested
			const onprogress_inner = (evt, progress) => {
				const fileProgress = progress / num_instruments;
				const queueProgress = (num_instruments - pending) / num_instruments;
				onprogress && onprogress('load', fileProgress + queueProgress, instrumentId);
			}
			const onsuccess_inner = () => waitForEnd();
			sendRequest(instruments[i], audioFormat, onprogress_inner, onsuccess_inner, onerror);
		}
	};
};

export const sendRequest = (instrumentId, audioFormat, onprogress, onsuccess, onerror) => {
	const soundfontPath = config.soundfontUrl + instrumentId + '-' + audioFormat + '.js';
	$.ajax(
		soundfontPath,
		{
			async: true,  // by default, but explicit is better.
			contentType: 'text/plain',
			error: onerror,
			// no on progress...
			success: responseText => {
				const script = document.createElement('script');
				script.language = 'javascript';
				script.type = 'text/javascript';
				script.text = responseText;
				document.body.appendChild(script);
				onsuccess();
			}
		}
		);
};

export const playChannel = (...options) => {
	return config.connected_plugin.playChannel(...options);
}

export const stopChannel = (...options) => {
	return config.connected_plugin.stopChannel(...options);
}

// TODO: audioBuffers

export const send = (...options) => {
	return config.connected_plugin.send(...options);
}
export const setController = (...options) => {
	return config.connected_plugin.setController(...options);
}
export const setVolume = (...options) => {
	return config.connected_plugin.setVolume(...options);
}
export const programChange = (...options) => {
	return config.connected_plugin.programChange(...options);
}
export const pitchBend = (...options) => {
	return config.connected_plugin.pitchBend(...options);
}
export const noteOn = (...options) => {
	return config.connected_plugin.noteOn(...options);
}
export const noteOff = (...options) => {
	return config.connected_plugin.noteOff(...options);
}

export const chordOn = (...options) => {
	return config.connected_plugin.chordOn(...options);
}

export const chordOff = (...options) => {
	return config.connected_plugin.chordOff(...options);
}

export const stopAllNotes = (...options) => {
	return config.connected_plugin.stopAllNotes(...options);
}


export const setEffects = (...options) => {
	if (config.connected_plugin !== WebAudio) {
		return;
	}
	return config.connected_plugin.setEffects();
}

export const getContext = () => {
	if (config.connected_plugin !== WebAudio) {
		return;
	}
	return config.connected_plugin.getContext();
}


export const setContext = (...options) => {
	if (config.connected_plugin !== WebAudio) {
		return;
	}
	return config.connected_plugin.setContext(...options);
}
