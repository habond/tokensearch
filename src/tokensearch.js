(function($) {
	'use strict';

	var tokens = {
		'simple': function(settings, callbacks) {

			var self = this;
			
			var ui = {};

			this.getId = function() {
				return settings.id;
			};

			this.getValue = function() {
				return settings.id;
			};

			this.remove = function() {
				callbacks.removeToken(self);
			};

			this.draw = function(anchor) {
				var tokenNode = ui.tokenNode = anchor.addClass('ts-token');
				var tokenLabel = $('<div>' + settings['label'] + '</div>').addClass('ts-tokenlabel');
				var tokenClose = $('<div>\u00D7</div>').addClass('ts-close');

				tokenNode
					.append(tokenLabel)
					.append(tokenClose);

				tokenClose.on('click', this.remove);
				tokenNode.on('click', function(){
					callbacks.selectToken(self);
				});
			};

			this.activate = function() {
				ui.tokenNode.addClass('ts-token-sel');
			};

			this.deactivate = function() {
				ui.tokenNode.removeClass('ts-token-sel');
			};

		},
		'text': function(settings, callbacks) {

			var self = this;

			var ui = {};

			this.getId = function() {
				return settings.id;
			};

			this.getValue = function() {
				return ui.input.val();
			};

			this.remove = function() {
				callbacks.removeToken(self);
			};

			this.draw = function(anchor) {
				var tokenNode = ui.tokenNode = anchor.addClass('ts-token');
				var tokenLabel = $('<div>' + settings['label'] + '</div>').addClass('ts-tokenlabel');
				var tokenInput = ui.input = $('<input/>').css('display', 'none');
				var tokenValueLabel = ui.label = $('<div/>').addClass('ts-tokenlabel');
				var tokenClose = $('<div>\u00D7</div>').addClass('ts-close');

				tokenNode.on('click', function(){
					callbacks.selectToken(self);
				});
				tokenClose.on('click', this.remove);

				tokenNode
					.append(tokenLabel)
					.append(tokenValueLabel)
					.append(tokenInput)
					.append(tokenClose);
			};

			this.activate = function() {
				ui.tokenNode.addClass('ts-token-sel');
				ui.input.val(ui.label.text());
				ui.label.hide();
				ui.input.show().focus();
			};

			this.deactivate = function() {
				ui.tokenNode.removeClass('ts-token-sel');
				ui.label.text(ui.input.val());
				ui.label.show();
				ui.input.hide();
			};

		},
		'select': function(settings, callbacks) {

			var self = this;

			var ui = {};

			this.getId = function() {
				return settings.id;
			};

			this.getValue = function() {
				var opt = ui.select.children().filter(':selected');
				return {
					text: opt.text(),
					val: opt.val()
				};
			};

			this.remove = function() {
				callbacks.removeToken(self);
			};

			this.draw = function(anchor) {
				var tokenNode = ui.tokenNode = anchor.addClass('ts-token');
				var tokenLabel = $('<div>' + settings['label'] + '</div>').addClass('ts-tokenlabel');
				var tokenSelect = ui.select = $('<select/>').css('display', 'none');
				var tokenValueLabel = ui.label = $('<div/>').addClass('ts-tokenlabel');
				var tokenClose = $('<div>\u00D7</div>').addClass('ts-close');

				$(settings.options).each(function(ind, opt){
					ui.select.append($('<option value="' + opt.value + '">' + opt.text + '</option>'));
				});

				tokenNode.on('click', function(){
					callbacks.selectToken(self);
				});
				tokenClose.on('click', this.remove);
				tokenSelect.on('click', function(e){
					e.stopPropagation();
				});

				tokenNode
					.append(tokenLabel)
					.append(tokenValueLabel)
					.append(tokenSelect)
					.append(tokenClose);
			};

			this.activate = function() {
				ui.tokenNode.addClass('ts-token-sel');
				ui.label.hide();
				ui.select.show();
				ui.select.trigger('click');
			};

			this.deactivate = function() {
				ui.tokenNode.removeClass('ts-token-sel');
				ui.label.text(self.getValue().text);
				ui.label.show();
				ui.select.hide();
			};

		}
	};

	var util = {
		isEventTarget: function(e, $elem) {
			return e.target === $elem.get(0);
		}
	};

	var TokenSearch = function(anchor, settings) {

		var model = {
			tokens: [],
			selectedToken: -1,
			input: "",
			suggestions: [],
			selectedSuggestion: -1
		};

		var ui = {
			wrapper: $('<div/>').addClass('ts-wrapper'),
			tokens: $('<div/>').addClass('ts-tokenlist'),
			inputs: $('<div/>').addClass('ts-inputwrapper'),
			input: $('<input/>').addClass('ts-input'),
			suggestions: $('<ul/>').addClass('ts-suggestlist').hide()
		};

		var tokencallbacks = {
			removeToken: removeToken,
			selectToken: selectTokenByObject
		};

		function init() {
			attachToBody();
			attachEvents();
		}

		// Private Functions

		function attachToBody() {
			ui.wrapper.append(ui.tokens);
			ui.wrapper.append(ui.inputs);
			ui.inputs.append(ui.input);
			ui.inputs.append(ui.suggestions);
			anchor.replaceWith(ui.wrapper);
		}

		function attachEvents() {
			ui.wrapper
				.on('click', function(e) {
					if (util.isEventTarget(e, ui.wrapper) || util.isEventTarget(e, ui.input))
						selectInput();
				})
				.on('keyup', function(e) {
					switch(e.which) {
						case 9: // Prevent shift changing focus
							e.preventDefault();
							return;
						case 38: // Prevent Up triggering suggestions
							return;
						case 40: // Prevent Down triggering suggestions
							return;
					}
					model.input = ui.input.val();
					generateSuggestions();
				})
				.on('keydown', function(e) {
					switch (e.which) {
						case 8: // Backspace
							if (emptyInput() &&
								hasMoreTokens() &&
								util.isEventTarget(e, ui.input))
								removeLastToken();
							break;
						case 9: // Tab
							e.preventDefault();
							tabToken(e.shiftKey ? -1 : 1);
							break;
						case 13: // Enter
							if (selectedSuggestion())
								addSelectedSuggestion();
							break;
						case 38: // Up
							e.preventDefault();
							selectSuggestion(-1);
							break;
						case 40: // Down
							e.preventDefault();
							selectSuggestion(+1);
							break;
					}
				});
		}
		
		function tabToken(increment) {
			var selectedToken = model.selectedToken == -1 ? model.tokens.length : model.selectedToken;
			var nextSelectedToken = selectedToken + increment;
			if(nextSelectedToken < 0)
				return; // Out of bounds
			if(nextSelectedToken >= model.tokens.length) {
				selectInput();
				return;
			}
			selectTokenByIndex(nextSelectedToken);
		}
		
		function selectTokenByIndex(index) {
			if(model.selectedToken >= 0) {
				var oldToken = model.tokens[model.selectedToken];
				oldToken.deactivate();
			}
			if(index >= model.tokens.length) {
				model.selectedToken = -1;
				return;
			}
			model.selectedToken = index; 
			var newToken = model.tokens[model.selectedToken];
			newToken.activate();
			console.log(index);
		}
		
		function selectTokenByObject(token) {
			var tokenIndex = model.tokens.indexOf(token);
			selectTokenByIndex(tokenIndex);
		}

		function selectInput() {
			selectTokenByIndex(model.tokens.length);
			ui.input.focus();
		}

		function generateSuggestions() {
			var inputText = model.input;
			if (inputText.length > 0) {
				var filtered = $(settings.tokenDefs).filter(function() {
					return this.label.indexOf(inputText) === 0;
				});
				model.suggestions = filtered;
				model.selectedSuggestion = 0;
			}
			else {
				model.suggestions = [];
				model.selectedSuggestion = -1;
			}
			drawSuggestions();
		}

		function drawTokens() {
			ui.tokens.empty();
			$(model.tokens).each(function(index, token) {
				var anchor = $('<div/>');
				token.draw(anchor);
				ui.tokens.append(anchor);
			});
		}

		function drawSuggestions() {
			ui.suggestions.empty();
			model.suggestions.length > 0 ? ui.suggestions.show() : ui.suggestions.hide();
			$(model.suggestions).each(function(index, suggestion) {
				var suggestionNode = $('<li>' + suggestion.label + '</li>');
				if (index === model.selectedSuggestion)
					suggestionNode.addClass('ts-suggestlist-sel');
				suggestionNode.on('click', function() {
					addToken(suggestion);
					resetSuggestions();
				});
				ui.suggestions.append(suggestionNode);
			});
		}

		function emptyInput() {
			return model.input === "";
		}

		function hasMoreTokens() {
			return model.tokens.length > 0;
		}

		function removeLastToken() {
			model.tokens[model.tokens.length - 1].remove();
		}

		function removeToken(token) {
			var ind = model.tokens.indexOf(token);
			model.tokens.splice(ind, 1);
			drawTokens();
		}

		function addToken(tokendef) {
			var token = createToken(tokendef);
			model.tokens.push(token);
			drawTokens();
			selectTokenByObject(token);
		}

		function createToken(tokendef) {
			return new tokens[tokendef.type](tokendef, tokencallbacks);
		}

		function selectedSuggestion() {
			return model.selectedSuggestion > -1;
		}

		function addSelectedSuggestion() {
			var suggestion = model.suggestions[model.selectedSuggestion];
			addToken(suggestion);
			resetSuggestions();
		}

		function resetSuggestions() {
			model.input = "";
			model.suggestions = [];
			model.selectedSuggestion = -1;
			ui.input.val("");
			drawSuggestions();
		}

		function selectSuggestion(increment) {
			model.selectedSuggestion = (model.selectedSuggestion + model.suggestions.length + increment) % model.suggestions.length;
			drawSuggestions();
		}

		// Public Functions

		this.getValue = function() {
			var res = {};
			$(model.tokens).each(function() {
				res[this.getId()] = this.getValue();
			});
			return res;
		};

		init();

	};

	$.fn.tokensearch = function(settings) {
		return new TokenSearch(this, settings);
	};

	$.fn.tokensearch.extend = function(token) {
		tokens[token.id] = token;
	};

}($));