(function($){ 'use strict';
	
	var tokens = {
		'simple': function(settings,callbacks){

			var self = this;			

			this.getId = function() {
				return settings.id;
			};
			
			this.getValue = function(){
				return settings.id;
			};
			
			this.remove = function() {
				callbacks.remove(self);
			};
			
			this.draw = function(anchor) {
				var tokenNode = anchor.addClass('ts-token');
				var tokenLabel = $('<div>'+settings['label']+'</div>').addClass('ts-tokenlabel');
				var tokenClose = $('<div>\u00D7</div>').addClass('ts-close');
				
				tokenNode
				.append(tokenLabel)
				.append(tokenClose);
					
				tokenClose.on('click', this.remove);			
			};
			
			this.activate = function() {
			
			};
			
		},
		'text': function(settings,callbacks){
			
			var self = this;

			var ui = {};
			
			this.getId = function() {
				return settings.id;
			};
		
			this.getValue = function(){
				return ui.input.val();
			};
			
			this.remove = function() {
				callbacks.remove(self);
			}
			
			this.draw = function(anchor) {
				var tokenNode = anchor.addClass('ts-token');
				var tokenLabel = $('<div>'+settings['label']+'</div>').addClass('ts-tokenlabel');
				var tokenInput = ui.input = $('<input/>').css('display','none');
				var tokenValueLabel = ui.label = $('<div/>').addClass('ts-tokenlabel');
				var tokenClose = $('<div>\u00D7</div>').addClass('ts-close');
				
				tokenNode.on('click', this.activate);
				tokenClose.on('click',this.remove);	
				tokenInput.on('blur', this.deactivate);
				
				tokenNode
				.append(tokenLabel)
				.append(tokenValueLabel)
				.append(tokenInput)
				.append(tokenClose);	
			};
			
			this.activate = function() {
				ui.input.val(ui.label.text());
				ui.label.hide();
				ui.input.show().focus();
			};
			
			this.deactivate = function() {
				ui.label.text(ui.input.val());
				ui.label.show();
				ui.input.hide();
			};
			
		},
		'subsuggest': function(settings,callbacks) {
			// TODO: Implement Me
		}
	};
	
	var util = {
		isEventTarget: function(e, $elem) {
			return e.target === $elem.get(0);
		}
	};

	var tokensearch = function(anchor, settings) {

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
			suggestions: $('<ul/>').addClass('ts-suggestlist')
		};

		var tokencallbacks = {
			remove: removeToken
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
				if(util.isEventTarget(e, ui.wrapper))
					ui.input.focus();
			})
			.on('keyup', function(e) {
				if (event.which === 38 || event.which === 40)
					return; // Prevent Up and Down triggering suggestion
				model.input = ui.input.val();
				generateSuggestions();
			})
			.on('keydown', function(e) {
				switch(e.which) {
				case 8: // Backspace
					if(emptyInput() && 
					   hasMoreTokens() && 
					   util.isEventTarget(e, ui.input))
						removeLastToken();
					break;
				case 13: // Enter
					if(selectedSuggestion())
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
		
		function generateSuggestions() {
			var inputText = model.input;
			if(inputText.length > 0) {
				var filtered = $(settings.tokenDefs).filter(function(){ 
					return this.label.indexOf(inputText) === 0;
				});
				model.suggestions = filtered;
				model.selectedSuggestion = 0;	
			} else {
				model.suggestions = [];
				model.selectedSuggestion = -1;	
			}
			drawSuggestions();
		}
		
		function drawTokens() {
			ui.tokens.empty();
			$(model.tokens).each(function(index, token){
				var anchor = $('<div/>');
				token.draw(anchor);
				ui.tokens.append(anchor);
			});
		}
		
		function drawSuggestions() {
			ui.suggestions.empty();
			$(model.suggestions).each( function( index, suggestion ) {
				var suggestionNode = $('<li>' + suggestion.label + '</li>');
				if(index === model.selectedSuggestion)
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
			model.tokens[model.tokens.length-1].remove();
		}
		
		function removeToken(token) {
			var ind = model.tokens.indexOf(token);
			model.tokens.splice(ind,1);
			drawTokens();
		}
		
		function addToken(tokendef) {
			var token = createToken(tokendef);
			model.tokens.push(token);
			drawTokens();
			token.activate();
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
		return new tokensearch(this, settings);
	};

	$.fn.tokensearch.extend = function(token) {
		tokens[token.id] = token;
	};
	
}($));
