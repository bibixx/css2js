var through = require( 'through2' );
var Path = require('path');

module.exports = function() {
  return through.obj( function( file, enc, cb ) {
    var contents = file.contents.toString('utf8');
    const css = css2JS( contents );
    contents = "";

    for ( let key in css ) {
      contents += "export const " + key + " = " + JSON.stringify( css[ key ] ) + "\n";
    }

    file.contents = new Buffer( contents, 'utf8' );

    file.path = file.path.replace( /\.css$/, ".js" );

    cb( null, file );
  } );
}

function css2JS( css ) {
  var rules = [];
  var tickCount = 0;
  var tempRule = "";
  var isRule = false;
  var ruleName = "";

  var camelCase = function camelCase(text) {
    var partials = text.match(/\w+/g);

    var camelCased = partials[0];

    for (var i = 1; i < partials.length; i++) {
      camelCased += partials[i].substring(0, 1).toUpperCase() + partials[i].substring(1).toLowerCase();
    }

    return camelCased;
  };

  for (var i = 0; i < css.length; i++) {
    if (css[i] === "{") {
      isRule = true;
    }

    if (isRule) {
      tempRule += css[i];
    } else {
      ruleName += css[i];
    }

    if (css[i] === "'" || css[i] === '"') {
      tickCount++;
    }

    if (css[i] === "}" && tickCount % 2 === 0) {
      rules.push({ props: tempRule, selector: ruleName.replace(/\s/, "") });
      tempRule = "";
      ruleName = "";
      isRule = false;
    }
  }

  var newRules = {};

  rules.forEach(function (v) {
    var matches = v.props.match(/([a-zA-Z]+[^:]+)\:([^;]+)/g);
    var props = {};
    matches.forEach(function (prop) {
      var match = /([a-zA-Z]+[^:]+)\:\s*([^;]+)/.exec(prop);
      props[camelCase(match[1])] = match[2].replace(/\s+\}$/, "");
    });

    newRules[camelCase(v.selector)] = props;
  });

  return newRules;
}
