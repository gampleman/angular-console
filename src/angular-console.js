'use strict';

angular.module('AngularConsole', []).directive('console', function($q, $injector) {
  return {
    restrict: 'E',
    transclude: true,
    scope: {
      resultPrefix: '=?',
      helpText: '=?',
      placeholder: '@'
    },
    controller: function($scope, $element) {
      var self = this;
      this.addHistory = function(item) {
        $scope.history.push(item);
        return this;
      };

      this.evaluate = function(command) {
        this.addHistory({command: command, resultPromise: this.evaluator.evaluate(command)});
      }

      $scope.keydown = function(e) {
        // Register shift, control and alt keydown
        if ( _([16,17,18]).indexOf(e.which, true) > -1 ) self.ctrl = true;

        // Enter submits the command
        if (e.which === 13) {
          e.preventDefault();
          var val = e.target.value;

          // If shift is down, do a carriage return
          if (self.ctrl) {
            e.target.value = val + '\n';
            return false;
          }

          // If submitting a command, set the currentHistory to blank (empties the textarea on update)
          e.target.value = '';

          // Run the command past the special commands to check for ':help' and ':clear' etc.
          if (!self.specialCommands(val)) {
            // If if wasn't a special command, pass off to evaluate and save
            self.evaluate(val);
          }
          self.historyState = $scope.history.length;
          setTimeout(function() {
            $element.find('.output').scrollTop(
              $element.find('.output')[0].scrollHeight - $element.find('.output').height()
            );
          });

          return false;
        }

        // Up / down keys cycle through past history or move up/down
        if ( !self.ctrl && (e.which === 38 || e.which === 40) ) {
          e.preventDefault();

          // `direction` is -1 or +1 to go forward/backward through command history
          var direction = e.which - 39;
          self.historyState += direction;

          // Keep it within bounds
          if (self.historyState < 0) self.historyState = 0;
          else if (self.historyState >= $scope.history.length) self.historyState = $scope.history.length;

          // Update the currentHistory value and update the View
          e.target.value = $scope.history[self.historyState] ? $scope.history[self.historyState].command : '';
          return false;
        }

        // Tab adds a tab character (instead of jumping focus)
        if (e.which === 9) {
          e.preventDefault();

          // Get the value, and the parts between which the tab character will be inserted
          var value = e.target.value,
          caret = e.target.selectionStart,
          parts = [
            value.slice(0, caret),
            value.slice(caret, value.length)
          ];

          // Insert the tab character into the value and update the textarea
          e.target.value = parts[0] + (self.tabCharacter || '\t') + parts[1];

          // Set the caret (cursor) position to just after the inserted tab character
          e.target.selectionStart = caret + self.tabCharacter.length;
          e.target.selectionEnd = caret + self.tabCharacter.length;

          return false;
        }
      };

      $scope.keyup = function(e) {
        // Register shift, alt and control keyup
        if ( _([16,17,18]).indexOf(e.which, true) > -1 ) self.ctrl = false;
      };

      this.specialCommands = function(command) {
        if (command === ':clear') {
          $scope.history = [];
          return true;
        }
        if ( command === ':help' ) {
          return this.addHistory({
            command : ':help',
            resultPromise : $q.when({
              result: $scope.helpText,
              type: 'builtin'
            })
          });
        }
        // If no special commands, return false so the command gets evaluated
        return false;
      };
    },

    template: '<pre class="output">' +
      '<span class="command" ng-repeat-start="item in history | filter: hidden">{{item.command}}</span>\n' +
      '<span class="prefix">{{ resultPrefix }}</span>' +
      '<span ng-repeat-end gm-unwrap-promise="item.resultPromise">\n</span>' +
    '</pre>' +
    '<div class="input">' +
      '<textarea rows="1" placeholder="{{ placeholder }}" ng-keyup="keyup($event)" ng-keydown="keydown($event)"></textarea>'+
    '</div>',

    compile: function(telement, attr, transclude) {
      return function(scope, element, attrs, ctrl) {
        scope.history = [];
        if (!scope.helpText) {
          scope.helpText = 'type javascript commands into the console, hit enter to evaluate. \n[up/down] to scroll through history, ":clear" to reset it. \n[alt + return/up/down] for returns and multi-line editing.\n:load SCRIPTURL to load a script\n:inject VAR to make the angular injector inject a variable into local scope.\nThis requires Angular to be loaded in the current context.';
        }
        // let's get the evaluator
        var evaluatorFn = $injector.get(attr.evaluator || 'consoleEvaluator');
        evaluatorFn(attr, scope).then(function(evaluator) {
          ctrl.evaluator = evaluator;
          transclude(scope, function(clone, transclusionScope) {
            var commands = _(clone.text().split(/\/\/\s*=>.+?(\n|$)(\/\/.+?(\n|$))*/)).map(function(command) {
              return command && command.trim();
            }).filter(function(command) {
              return command && command !== '';
            }).each(ctrl.evaluate, ctrl).value();
            ctrl.historyState = scope.history.length;
          });
        });
      };
    }
  };
}).directive('gmUnwrapPromise', function($q) {
  return {
    restrict: 'A',
    scope: {
      promise: '=gmUnwrapPromise'
    },
    link: function(scope, element) {
      element.text('...\n');
      $q.when(scope.promise).then(function(result) {
        element.text(result.result + '\n');
        element.addClass(result.type);
      });
    }
  };
});
