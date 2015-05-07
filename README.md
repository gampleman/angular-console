# angular-console

Angular Console is a JavaScript console that you can embed in your webpage. We use
it for our internal documentation, but it can be used in a variety of contexts.

## Getting Started

Download the [production version][min] or the [development version][max].

[min]: https://raw.github.com/gampleman/jquery-angular-console/master/dist/angular-angular-console.min.js
[max]: https://raw.github.com/gampleman/jquery-angular-console/master/dist/angular-angular-console.js

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

#### `load(src)`

Load a remote script into the context. Returns a promise.

#### `evaluate(command)`

This will `eval` the string command in the context and add it to the history, displaying
it in the console as well as the result.

#### `inject(properties)`

Injects a list of services into the context as local variables. See `inject` above.

#### `specialCommands(command)`

This is a filter on the commands which handles the special commands the user can type.
If it returns `false`, the command will not be `evaluate`d.
