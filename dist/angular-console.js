'use strict';
angular.module('AngularConsole', []).directive('console', [
  '$q',
  function ($q) {
    return {
      restrict: 'E',
      transclude: true,
      scope: {
        resultPrefix: '=?',
        helpText: '=?',
        placeholder: '@',
        scripts: '=?',
        inject: '=?'
      },
      controller: [
        '$scope',
        '$element',
        function ($scope, $element) {
          var self = this;
          this.load = function (src) {
            var deffered = $q.defer();
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.addEventListener('load', function () {
              deffered.resolve('Loaded ' + src);
            }, false);
            script.src = src;
            if (this.iframe) {
              this.iframe.contentDocument.body.appendChild(script);
              return deffered.promise;
            }
          };
          this.evaluate = function (command) {
            if (!command)
              return false;
            var item = { command: command };
            // Evaluate the command and store the eval result, adding some basic classes for syntax-highlighting
            try {
              item.result = this.sandbox.eval(command);
              if (_.isUndefined(item.result))
                item.type = 'undefined';
              if (_.isNumber(item.result))
                item.type = 'number';
              if (_.isString(item.result))
                item.type = 'string';
            } catch (error) {
              item.result = error.toString();
              item.type = 'error';
            }
            console.log(item);
            // Add the item to the history
            return this.addHistory(item);
          };
          this.addHistory = function (item) {
            $q.when(item.result).then(function () {
              if (_.isString(item.result))
                item.result = '"' + item.result.toString().replace(/"/g, '\\"') + '"';
              if (_.isFunction(item.result))
                item.result = item.result.toString().replace(/"/g, '\\"');
              if (_.isObject(item.result))
                item.result = self.stringify(item.result).replace(/"/g, '\\"');
              if (_.isUndefined(item.result))
                item.result = 'undefined';
            });
            $scope.history.push(item);
            return this;
          };
          // taken from jsconsole.com
          function sortci(a, b) {
            return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
          }
          this.stringify = function stringify(o, simple, visited) {
            var json = '', i, vi, type = '', parts = [], names = [], circular = false;
            visited = visited || [];
            try {
              type = {}.toString.call(o);
            } catch (e) {
              // only happens when typeof is protected (...randomly)
              type = '[object Object]';
            }
            // check for circular references
            for (vi = 0; vi < visited.length; vi++) {
              if (o === visited[vi]) {
                circular = true;
                break;
              }
            }
            if (circular) {
              json = '[circular]';
            } else if (type === '[object String]') {
              json = '"' + o.replace(/"/g, '\\"') + '"';
            } else if (type === '[object Array]') {
              visited.push(o);
              json = '[';
              for (i = 0; i < o.length; i++) {
                parts.push(stringify(o[i], simple, visited));
              }
              json += parts.join(', ') + ']';
            } else if (type === '[object Object]') {
              visited.push(o);
              json = '{';
              for (i in o) {
                names.push(i);
              }
              names.sort(sortci);
              for (i = 0; i < names.length; i++) {
                parts.push(stringify(names[i], undefined, visited) + ': ' + stringify(o[names[i]], simple, visited));
              }
              json += parts.join(', ') + '}';
            } else if (type === '[object Number]') {
              json = o + '';
            } else if (type === '[object Boolean]') {
              json = o ? 'true' : 'false';
            } else if (type === '[object Function]') {
              json = o.toString();
            } else if (o === null) {
              json = 'null';
            } else if (o === undefined) {
              json = 'undefined';
            } else if (simple === undefined) {
              visited.push(o);
              json = type + '{\n';
              for (i in o) {
                names.push(i);
              }
              names.sort(sortci);
              for (i = 0; i < names.length; i++) {
                try {
                  parts.push(names[i] + ': ' + stringify(o[names[i]], true, visited));  // safety from max stack
                } catch (e) {
                  if (e.name === 'NS_ERROR_NOT_IMPLEMENTED') {
                  }
                }
              }
              json += parts.join(',\n') + '\n}';
            } else {
              try {
                json = o + '';  // should look like an object
              } catch (e) {
              }
            }
            return json;
          };
          $scope.keydown = function (e) {
            // Register shift, control and alt keydown
            if (_([
                16,
                17,
                18
              ]).indexOf(e.which, true) > -1)
              self.ctrl = true;
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
              setTimeout(function () {
                $element.find('.output').scrollTop($element.find('.output')[0].scrollHeight - $element.find('.output').height());
              });
              return false;
            }
            // Up / down keys cycle through past history or move up/down
            if (!self.ctrl && (e.which === 38 || e.which === 40)) {
              e.preventDefault();
              // `direction` is -1 or +1 to go forward/backward through command history
              var direction = e.which - 39;
              self.historyState += direction;
              // Keep it within bounds
              if (self.historyState < 0)
                self.historyState = 0;
              else if (self.historyState >= $scope.history.length)
                self.historyState = $scope.history.length;
              // Update the currentHistory value and update the View
              e.target.value = $scope.history[self.historyState] ? $scope.history[self.historyState].command : '';
              return false;
            }
            // Tab adds a tab character (instead of jumping focus)
            if (e.which === 9) {
              e.preventDefault();
              // Get the value, and the parts between which the tab character will be inserted
              var value = e.target.value, caret = e.target.selectionStart, parts = [
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
          $scope.keyup = function (e) {
            // Register shift, alt and control keyup
            if (_([
                16,
                17,
                18
              ]).indexOf(e.which, true) > -1)
              self.ctrl = false;
          };
          this.inject = function (props) {
            try {
              _.each(props, function (prop) {
                self.sandbox.eval('var ' + prop + ' = angular.element(document).injector().get("' + prop + '");');
              });
            } catch (e) {
              return 'Error: Injection failed: ' + e.message + '\nHave you initialized Angular properly?';
            }
            return 'Injected the following into the current scope: ' + props.join(', ');
          };
          this.specialCommands = function (command) {
            if (command === ':clear') {
              $scope.history = [];
              return true;
            }
            if (command === ':help') {
              return this.addHistory({
                command: ':help',
                result: $scope.helpText
              });
            }
            // `:load <script src>`
            if (command.indexOf(':load') > -1) {
              return this.addHistory({
                command: command,
                result: this.load(command.substring(6))
              });
            }
            if (command.indexOf(':inject') > -1) {
              return this.addHistory({
                command: command,
                result: this.inject(command.substring(8).trim().split(/\s*,\s*/))
              });
            }
            // If no special commands, return false so the command gets evaluated
            return false;
          };
        }
      ],
      template: '<pre class="output">' + '<span class="command" ng-repeat-start="item in history | filter: hidden">{{item.command}}</span>\n' + '<span class="prefix">{{ resultPrefix }}</span>' + '<span ng-class="item.type" ng-repeat-end gm-unwrap-promise="item.result">\n</span>' + '</pre>' + '<div class="input">' + '<textarea rows="1" placeholder="{{ placeholder }}" ng-keyup="keyup($event)" ng-keydown="keydown($event)"></textarea>' + '</div>',
      compile: function (telement, attr, transclude) {
        return function (scope, element, attrs, ctrl) {
          scope.history = [];
          // setup iframe
          var iframe = $('<iframe width="0" height="0"/>').css({ visibility: 'hidden' });
          var deffered = $q.defer();
          if ('src' in attr) {
            iframe.attr('src', attr.src);
            iframe.on('load', function () {
              deffered.resolve(true);
            });
          } else {
            deffered.resolve(false);
          }
          iframe.appendTo('body');
          ctrl.iframe = iframe[0];
          ctrl.sandbox = ctrl.iframe.contentWindow;
          // This should help IE run eval inside the iframe.
          if (!ctrl.sandbox.eval && ctrl.sandbox.execScript) {
            ctrl.sandbox.execScript('null');
          }
          if (!scope.helpText) {
            scope.helpText = 'type javascript commands into the console, hit enter to evaluate. \n[up/down] to scroll through history, ":clear" to reset it. \n[alt + return/up/down] for returns and multi-line editing.\n:load SCRIPTURL to load a script\n:inject VAR to make the angular injector inject a variable into local scope.\nThis requires Angular to be loaded in the current context.';
          }
          var loadScripts = function () {
            if (scope.scripts) {
              return _.reduce(scope.scripts, function (promise, script) {
                return promise.then(function (prev) {
                  return ctrl.load(script);
                });
              }, $q.when([]));
            } else {
              return $q.when([]);
            }
          };
          deffered.promise.then(loadScripts).then(function () {
            if (scope.inject) {
              ctrl.inject(scope.inject);
            }
            transclude(scope, function (clone, transclusionScope) {
              var commands = _(clone.text().split(/\/\/\s*=>.+?(\n|$)(\/\/.+?(\n|$))*/)).map(function (command) {
                  return command && command.trim();
                }).filter(function (command) {
                  return command && command !== '';
                }).each(ctrl.evaluate, ctrl);
              console.log(commands.value(), scope.history);
              ctrl.historyState = scope.history.length;
            });
          });
        };
      }
    };
  }
]).directive('gmUnwrapPromise', [
  '$q',
  function ($q) {
    return {
      restrict: 'A',
      scope: { promise: '=gmUnwrapPromise' },
      link: function (scope, element) {
        element.text('...\n');
        $q.when(scope.promise).then(function (result) {
          element.text(result + '\n');
        });
      }
    };
  }
]);