// -*- Mode: c++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
/**
 *    Copyright 2014 Opera Software ASA
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 *
**/
Element.prototype.matches || Object.defineProperty(Element.prototype, "matches", {
  value: Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector || function(selector) {
    var sel = this.parentNode.querySelectorAll(selector);
    if (sel.length === 0) {
      return false;
    }
    var i = -1;
    while (sel[++i] && sel[i] !== this);
    return !!sel[i];
  },
  writable: false,
  enumerable: false
});

Object.defineProperties(Element.prototype, {
  'appendTemplate': {
    value: function(tmpl) {
      return this.appendChild(window.bragi.createTemplate(tmpl));
    },
    writable: false,
    enumerable: false
  },

  'cleanAppendTemplate': {
    value: function(tmpl) {
      this.textContent = '';
      return this.appendTemplate(tmpl);
    },
    writable: false,
    enumerable: false
  },

  'replaceWithTemplate': {
    value: function(){
      var slice = [].slice;
      return function(tmpl){
        var parent = this.parentNode;
        if (parent) {
          var documentFragment = document.createDocumentFragment();
          documentFragment.appendTemplate(tmpl);
          var ret = slice.call(documentFragment.childNodes);
          parent.replaceChild(documentFragment, this);
          return ret;
        }
        return null;
      };
    }(),
    writable: false,
    enumerable: false
  },

  'getAncestor': {
    value: function(selector) {
      var ele = this;
      while (ele) {
        if (ele.matches(selector)) {
          return ele;
        }
        ele = ele.parentElement;
      }
      return null;
    },
    writable: false,
    enumerable: false
  },

  'getAncestorAttr': {
    value: function(name) {
      var ele = this;
      while (ele && !ele.hasAttribute(name)) {
        ele = ele.parentElement;
        return ele;
      }
      return ele && ele.hasAttribute(name) ? ele.getAttribute(name) : null;
    },
    writable: false,
    enumerable: false
  }
});

(function(){
  "use strict";
  var handlers_ = Object.create ? {'true': Object.create(null), 'false': Object.create(null)} : {'true': [], 'false': []};
  var handler_ = function(handler_map, event) {
    var ele = event.target;
    while (ele && !event.cancelBubble) {
      var name = ele.getAttribute('data-handler');
      if (name && handler_map[name]){
        handler_map[name](event, ele);
      }
      ele = ele.parentElement;
    }
  };
  window.EventHandler = EventHandler;
  function EventHandler(){}
  EventHandler.init_ = function (type, isCapturing, handlerKey) { 
    isCapturing = !!isCapturing;
    if (handlers_[isCapturing][type]) {
      return handlers_[isCapturing][type];
    }
    var handler_map = handlers_[isCapturing][type] = Object.create ? Object.create(null) : {};
    var handler = handler_.bind(this, handler_map);
    document.addEventListener(type, handler, isCapturing);
    return handler_map;
  };
  EventHandler.register = function(type, name, handler, isCapturing) {
    isCapturing = !!isCapturing;
    (handlers_[isCapturing][type] || EventHandler.init_(type, isCapturing))[name] = handler;
  };
  EventHandler.unregister = function(type, name, handler, isCapturing) {
    var handler_map = handlers_[!!isCapturing][type];
    if (handler_map && handler_map[name] === handler){
      handler_map[name] = null;
    }
  };
})();

window.bragi || (window.bragi = {
  createTemplate : function() {
    // A special element name. We don't create an element for a template that
    // starts with this element but instead merge it with its parent context.
    var TEXT_NODE_NAME = '#text';
    var ObjToString = Object.prototype.toString;
    return function(tmpl) {
      var ele = null;
      var elementName = tmpl ? tmpl[0] : [];
      var i = 0;
      var attrs = null;
      var _tmpl;
      if (typeof elementName === 'string' && elementName !== TEXT_NODE_NAME) {
        i++;
        ele = document.createElement(elementName);
        _tmpl = tmpl[1];
        if (ObjToString.call(_tmpl) === '[object Object]') {
          i++;
          if (attrs = _tmpl) {
            for (var prop in attrs) {
              if (typeof attrs[prop] === 'string') {
                ele.setAttribute(prop, attrs[prop]);
              }
            }
          }
        }
      } else {
        if (elementName === TEXT_NODE_NAME) {
          i++;
        }
        ele = document.createDocumentFragment();
      }
      if(tmpl){
        for (; i < tmpl.length; i++) {
          if (typeof tmpl[i] === 'string') {
            ele.appendChild(document.createTextNode(tmpl[i]));
          } else if (tmpl[i]) {
            ele.appendChild(window.bragi.createTemplate(tmpl[i]));
          }
        }
      }
      return ele;
    };
  }(),
  /**
   * Creates a template array from the localized string which contains
   * placeholders, replacing placeholders with templates specified in the
   * replacementMap.
   *
   * @param  {String} string The localized string to process.
   * @param  {Object} replacementMap The map with templates specified for each
   *         placeholder. First placeholder in the string is marked with a '$1'.
   * @return {Array} The resulting template.
   */
  createTemplateFromString : function(stringToProcess, replacementMap) {
    var $number = /\$[$1-9]/;
    return function(){
      var result = ['#text'];
      var matchPlaceholder = "";
      while (matchPlaceholder = $number.exec(stringToProcess)) {
        var placeholder = matchPlaceholder[0];
        var placeholderPosition = matchPlaceholder.index;
        var currentStringSlice = stringToProcess.substr(0, placeholderPosition);
        // Save remaining for the next iteration.
        stringToProcess = stringToProcess.slice(placeholderPosition + placeholder.length);
        
        if (placeholder == '$$') {
          currentStringSlice += '$';
        } else if (placeholder != '$$') {
          var placeholderTemplate = replacementMap[placeholder];
          result.push(placeholderTemplate);
        }
        if (currentStringSlice !== '') {
          result.push(currentStringSlice);
        }
        if (stringToProcess !== '') {
          result.push(stringToProcess);
        }
        
        return result;
      }
    };
  }
});
(Object.freeze || Object)(window.bragi);