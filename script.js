(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/bartoszlegiec/Projects/css2js/src/js/script.js":[function(require,module,exports){
"use strict";

function css2JS(css) {
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

var css = css2JS(cssText);

var applyStyles = function applyStyles(selector, styles) {
  var sStyles = selector.style;

  for (key in styles) {
    sStyles[key] = styles[key];
  }
};

console.log(css);

applyStyles(document.querySelector('body'), css.body);
applyStyles(document.querySelector('p'), css.text);
applyStyles(document.querySelector('div'), css.div);

},{}]},{},["/Users/bartoszlegiec/Projects/css2js/src/js/script.js"])

//# sourceMappingURL=script.js.map
