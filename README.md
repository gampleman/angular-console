# angular-console

Angular Console is a JavaScript console that you can embed in your webpage. We use
it for our internal documentation, but it can be used in a variety of contexts.

- Easy to setup
- Can be easily customized by using HTML attributes
- Plugin your own evaluation service


## Getting Started

Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/gampleman/jquery-angular-console/master/dist/angular-angular-console.min.js
[max]: https://raw.github.com/gampleman/jquery-angular-console/master/dist/angular-angular-console.js

or use

```sh
bower install angular-console
```

In your web page:

```html
<script src="angular.js"></script>
<script src="dist/angular-console.min.js"></script>
```

If you are not using Angular in your web page, than you need to add this attribute
to your body:

```html
<body ng-app="AngularConsole">
```

If you are using AngularJS, then you need to add this module as a dependency:

```javascript
angular.module('MyApp', ['AngularConsole']);
```

You may want to add some CSS similar to this, but adding some colors etc:

```css
console,
console pre.output,
console pre.output span,
console textarea,
console textarea:focus {
  font-family:  monospace;
}
console {
  color: #ccc;
  background: #333;
  padding: 20px 20px 15px;
  margin: 30px auto;
  display: block;
}
console pre.output {
  display: block;
  white-space: pre;
  width: 100%;
  height: 285px;
  overflow-y: auto;
  position: relative;
  padding: 0;
  margin: 0 0 10px;
  border: 0 none;
}
console pre.output span           { color:#f7f7f7; }

console pre.output span.command   { color:#ccc; }
console pre.output span.prefix    { color:#777; }
/* These are type hints, you can add more if you wish,
 * the builtin ones are number, string, object, array, error, undefined and
 * builtin (used for things like :help)
 */
console pre.output span.error     { color:#f77; }

console .input {
  padding:0 0 0 15px;
  position:relative;
}
console .input:before {
  content:">";
  position:absolute;
  top: 1px;
  left: 0;
  color:#ddd
}
console textarea {
  border:0 none;
  outline:0 none;
  padding:0;
  margin:0;
  resize: none;
  width:100%;
  overflow:hidden;
}
console textarea:focus {
  outline:0 none;
}
```

## Documentation

Main usage is through the `<console>` element which will output a thing that looks
like a console where you can type in expressions that will be evaluated.

### Attributes

This element is customizable via several attributes:

#### `result-prefix`

An expression that should evaluate to a string. This will be rendered in front of results of evaluated
expressions.

Example:

~~~html
<console result-prefix="'=>'"></console>
~~~

Note the extra quotes.

#### `placeholder`

String. The text that will be displayed in the input area if no text is sent.

Example:

~~~html
<console placeholder="Type here to see some cool stuff..."></console>
~~~

#### help-text

String. You can customize the text that appears via the `:help` command using this attribute.

#### evaluator

String. This would be a name of an evaluator service. The default one evaluates
JavaScript code in an iFrame and returns results. You can create your own and register
it through this attribute (or simply call it `consoleEvaluator` to replace the default).

An evaluator service might look like this:

```javascript
angular.factory('fooBarEvaluator', function($q) {

  /* You will be passed the directive's attributes object,
   * it's scope object.
   */
  return function(attr, scope) {
        // you can retrieve string settings like this:
    var foo = attr.fooVal || 'foo',
        // and dynamic ones like this:
        bar = attr.bar && scope.$parent.$eval(attr.bar);
    // and bound ones like this
    var foobar = foo + bar;
    if (attr.foobar) {
      scope.$parent.$watch(attr.foobar, function(val) {
        foobar = val;
      });
    }

    // any more initalization should happen here

    // then return a promise for an evaluator object
    return $q.when({
      // this object currently should have an `evaluate` method
      evaluate: function(command) {
        switch(command) {
          case 'foo':
            // this function should return a promise for a Result object
            return $q.when({
              // this will be displayed as the result text, should be a string
              result: foo,
              // you can use the optional type attribute to add a css class to the result
              type: 'string'
            });
          case 'bar':
            return $q.when({ result: bar });
          case 'foobar':
            return $q.when({ result: foobar });
          default:
            return $q.when({ result: 'Unrecognised command', type: 'error' });
        }
      }
    });
  };
});
```

Then in the HTML you would do:

~~~html
<input type="text" placeholder="foobar" ng-model="foobarVal"/>
<console placeholder="Type some foobars"
  foo="fooie" bar="'bar' + 2" foobar="foobarVal"
  help-text="This language only accepts foo, bar and foobar"></console>
~~~

The default evaluator accepts the following attributes to customize its behavior:

#### `src`

String. The console creates an iframe which is used as the context for evaluating
scripts. By default, this is an empty page, but you can set it to be a particular
URL. Using a special page for the url, you can customize the context/environment
the expressions will be evaluated in.

Example:

~~~html
<console src="../my-app.html"></console>
~~~

### `scripts`

Expression that evaluates to an array of string URLs. You can preload a number of
remote scripts into the execution context before the console is initiated.

Example:

~~~html
<console scripts="['https://ajax.googleapis.com/ajax/libs/angularjs/1.3.15/angular.min.js', 'my-script.js']"></console>
~~~

### `inject`

Expression that evaluates to an array of strings. This is an Angular specific feature.
You will need to add Angular JS to your execution context and instantiate an Angular
app on the body of that page. You can achieve this by loading a page that does this
via the `src` attribute, or you can do it dynamically via the `scripts` mechanism.

If this is set up correctly, then for every member of the inject array, a local variable
will be created that has the value of requesting a dependency of the same name from
the injector.

Example:

~~~html
<console src="myapp.html" inject="['$q', 'MyService']">
var deffered = $q.defer(); // this allows us to use `$q` as a local variable
</console>
~~~

### Contents

Whatever text is inside the attribute is evaluated in the context and printed out.
It will be split on `// =>`, where that comment is ignored and the result of the
previous statement will be printed.

Example:

~~~html
<console>
var a = 1;
var b = 2;
a + b // =>
a * 2 // =>
</console>
~~~

would result in the console looking something like this:

```javascript
var a = 1;
var b = 2;
a + b
=> 3
a * 2
=> 2
```

You would then have access to `a` and `b` as local variables and the three
statements would be prepopulated in your history.

### API

The directive exposes a controller whose methods you can call or overwrite, in
which case you can customize the behavior.

#### `evaluate(command)`

This will `eval` the string command in the context and add it to the history, displaying
it in the console as well as the result.


#### `specialCommands(command)`

This is a filter on the commands which handles the special commands the user can type.
If it returns `false`, the command will not be `evaluate`d.

# License

MIT
