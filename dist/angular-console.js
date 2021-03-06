/**
 * angular-console
 * @version v0.2.0 - 2015-05-28
 * @link https://github.com/gampleman/angular-console
 * @author Jakub Hampl <>
 * @license MIT License, http://www.opensource.org/licenses/MIT
 */
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

angular.module('AngularConsole').factory('consoleEvaluator', function($q) {
  function JSEvaluator(src, scripts, inject, cb) {
    var iframe = $('<iframe width="0" height="0"/>').css({visibility : 'hidden'});
    var deffered = $q.defer();
    if (src) {
      iframe.attr('src', src);
      iframe.on('load', function() {
        deffered.resolve(true);
      });
    } else {
      deffered.resolve(false);
    }
    iframe.appendTo('body');
    this.iframe = iframe[0];

    this.sandbox = this.iframe.contentWindow;
    // This should help IE run eval inside the iframe.
    if (!this.sandbox.eval && this.sandbox.execScript) {
      this.sandbox.execScript('null');
    }
    var self = this;
    var loadScripts =  function() {
      if (scripts) {
        return _.reduce(scripts, function(promise, script) {
          return promise.then(function(prev) {
            return self.load(script);
          });
        }, $q.when([]));
      } else {
        return $q.when([]);
      }
    };

    deffered.promise.then(loadScripts).then(function() {
      if (inject) {
        self.inject(inject);
      }
      cb();
    });
  }

  JSEvaluator.prototype.load = function(src) {
    var deffered = $q.defer();
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.addEventListener('load', function() {
      deffered.resolve('Loaded ' + src);
    }, false);
    script.src = src;

    if (this.iframe) {
      this.iframe.contentDocument.body.appendChild(script);
      return deffered.promise;
    }
  };

  JSEvaluator.prototype.specialCommands = function(command) {
    // `:load <script src>`
    if ( command.indexOf(':load') > -1 ) {
      return this.load(command.substring(6)).then(function(result) {
        return {
          result: result,
          type: 'builtin'
        };
      });
    }

    if ( command.indexOf(':inject') > -1 ) {
      return $q.when({
        result : this.inject(command.substring(8).trim().split(/\s*,\s*/)),
        type: 'builtin'
      });
    }

    // If no special commands, return false so the command gets evaluated
    return false;
  };

  JSEvaluator.prototype.evaluate = function(command) {
    if (!command) return false;


    var item = this.specialCommands(command),
        result;
    if (item) {
      return item;
    } else {
      item = {};
    }

    var self = this, isError = false;

    // Evaluate the command and store the eval result, adding some basic classes for syntax-highlighting
    try {
      result = this.sandbox.eval(command);
    } catch(error) {
      result = error.toString();
      isError = true;
    }
    return $q.when(result).then(function(result) {
      item.result = result;
      if ( _.isUndefined(result) ) {
        item.type = 'undefined';
        item.result = 'undefined';
      }
      if ( _.isNumber(result) ) item.type = 'number';
      if ( _.isString(item.result) ) {
        item.type = 'string';
        item.result = '\"' + item.result.toString().replace(/"/g, '\\"') + '\"';
      }

      if ( _.isPlainObject(result)) item.type = 'object';
      if ( _.isArray(result)) item.type = 'array';

      if (_.isFunction(item.result)) {
        item.result = item.result.toString().replace(/"/g, '\\"');
        item.type = 'function';
      }
      if (_.isObject(item.result) || _.isArray(item.result)) item.result = self.stringify(item.result).replace(/"/g, '\\"');

      if (isError) item.type = undefined;
      return item;
    });
  };

  // taken from jsconsole.com
  function sortci(a, b) {
    return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
  }

  JSEvaluator.prototype.stringify = function stringify(o, simple, visited) {
    var json = '', i, vi, type = '', parts = [], names = [], circular = false;
    visited = visited || [];

    try {
      type = ({}).toString.call(o);
    } catch (e) { // only happens when typeof is protected (...randomly)
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
        parts.push( stringify(names[i], undefined, visited) + ': ' + stringify(o[ names[i] ], simple, visited) );
      }
      json += parts.join(', ') + '}';
    } else if (type === '[object Number]') {
      json = o+'';
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
          parts.push(names[i] + ': ' + stringify(o[names[i]], true, visited)); // safety from max stack
        } catch (e) {
          if (e.name === 'NS_ERROR_NOT_IMPLEMENTED') {
            // do nothing - not sure it's useful to show this error when the variable is protected
            // parts.push(names[i] + ': NS_ERROR_NOT_IMPLEMENTED');
          }
        }
      }
      json += parts.join(',\n') + '\n}';
    } else {
      try {
        json = o+''; // should look like an object
      } catch (e) {}
    }
    return json;
  };

  JSEvaluator.prototype.inject = function(props) {
    var self = this;
    try {
      _.each(props, function(prop) {
        self.sandbox.eval('var ' + prop + ' = angular.element(document.body).injector().get("' + prop + '");');
      });
    } catch(e) {
      return 'Error: Injection failed: ' + e.message + '\nHave you initialized Angular properly?';
    }

    return 'Injected the following into the current scope: ' + props.join(', ');
  };

  return function(attr, scope) {
    var src = attr.src,
        scripts = attr.scripts && scope.$parent.$eval(attr.scripts),
        inject = attr.inject && scope.$parent.$eval(attr.inject),
        deffered = $q.defer(),
        evaluator = new JSEvaluator(src, scripts, inject, function() {
          deffered.resolve(evaluator);
        });
    return deffered.promise;
  };
});
