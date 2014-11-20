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

'use strict';

(function() {
  // A special element name. We don't create an element for a template that
  // starts with this element but instead merge it with its parent context.
  var TEXT_NODE_NAME = '#text';

  this.createTemplate = function(tmpl) {
    var ELE_NAME = 0;
    var ATTRS = 1;
    var ele = null;
    var elementName = tmpl[ELE_NAME];
    var i = 0;
    if (typeof elementName === 'string' && elementName !== TEXT_NODE_NAME) {
      i++;
      ele = document.createElement(elementName);
      if (Object.prototype.toString.call(tmpl[ATTRS]) === '[object Object]') {
        i++;
        var attrs = tmpl[ATTRS];
        if (attrs) {
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
    for (; i < tmpl.length; i++) {
      if (typeof tmpl[i] === 'string') {
        ele.appendChild(document.createTextNode(tmpl[i]));
      } else if (tmpl[i]) {
        ele.appendChild(bragi.createTemplate(tmpl[i]));
      }
    }

    return ele;
  };

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
  this.createTemplateFromStringF = function(string, replacementMap) {
    var result = ['#text'];
    var stringToProcess = string;
    var matchPlaceholder;
    while (matchPlaceholder = /\$[$1-9]/.exec(stringToProcess)) {
      var placeholder = matchPlaceholder[0];
      var placeholderPosition = matchPlaceholder.index;
      var currentStringSlice = stringToProcess.substr(0, placeholderPosition);
      // Save remaining for the next iteration.
      stringToProcess =
          stringToProcess.slice(placeholderPosition + placeholder.length);

      if (placeholder == '$$') {
        currentStringSlice += '$';
      }

      if (currentStringSlice !== '') {
        result.push(currentStringSlice);
      }

      if (placeholder != '$$') {
        var placeholderTemplate = replacementMap[placeholder];
        result.push(placeholderTemplate);
      }
    }

    if (stringToProcess !== '') {
      result.push(stringToProcess);
    }

    return result;
  };

  window.EventHandler = function(type, isCapturing, handlerKey) {
    return this.init_(type, isCapturing, handlerKey);
  };

  Element.prototype.appendTemplate = function(tmpl) {
    return this.appendChild(bragi.createTemplate(tmpl));
  };

  Element.prototype.cleanAppendTemplate = function(tmpl) {
    this.textContent = '';
    return this.appendTemplate(tmpl);
  };

  Element.prototype.replaceWithTemplate = function(tmpl) {
    var parent = this.parentNode;
    if (parent) {
      var documentFragment = document.createDocumentFragment();
      documentFragment.appendTemplate(tmpl);
      var ret = Array.prototype.slice.call(documentFragment.childNodes);
      parent.replaceChild(documentFragment, this);
      return ret;
    }
    return null;
  }

  Element.prototype.getAncestor = function(selector) {
    var ele = this;
    while (ele) {
      if (ele.matchesSelector(selector)) {
        return ele;
      }
      ele = ele.parentElement;
    }
    return null;
  }

  Element.prototype.getAncestorAttr = function(name) {
    var ele = this;
    while (ele && !ele.hasAttribute(name)) {
      ele = ele.parentElement;
    }

    return ele && ele.hasAttribute(name) ? ele.getAttribute(name) : null;
  }

  if (!Element.prototype.matchesSelector) {
    Element.prototype.matchesSelector =
      Element.prototype.webkitMatchesSelector ?
      Element.prototype.webkitMatchesSelector :
      function(selector) {
        if (this.parentNode) {
          var sel = this.parentNode.querySelectorAll(selector);
          for (var i = 0; sel[i] && sel[i] !== this; i++);
          return Boolean(sel[i]);
        }
      }
  }

  EventHandler.prototype = new function() {
    var KEY = 'data-handler';
    var handlers_;
    if (Object.create) {
      handlers_ = {'true': Object.create(null), 'false': Object.create(null)};
    } else {
      handlers_ = {'true': [], 'false': []};
    }

    // static methods
    EventHandler.register = function(type, name, handler, isCapturing) {
      isCapturing = Boolean(isCapturing);
      (handlers_[isCapturing][type] ||
       new EventHandler(type, isCapturing))[name] = handler;
    };


    EventHandler.unregister = function(type, name, handler, isCapturing) {
      isCapturing = Boolean(isCapturing);
      var handler_map = handlers_[isCapturing][type];
      if (handler_map && handler_map[name] === handler)
          handler_map[name] = null;
    };

    var handler_ = function(handler_map, event) {
      var ele = event.target;
      while (ele && !event.cancelBubble) {
        var name = ele.getAttribute(KEY);
        if (name && handler_map[name])
          handler_map[name](event, ele);

        ele = ele.parentElement;
      }
    };

    this.init_ = function(type, isCapturing) {
      isCapturing = Boolean(isCapturing);
      if (handlers_[isCapturing][type]) {
        return handlers_[isCapturing][type];
      }
      var handler_map = handlers_[isCapturing][type] = Object.create(null);
      var handler = handler_.bind(this, handler_map);
      document.addEventListener(type, handler, isCapturing);
      return handler_map;
    };
  };
}).apply(window.bragi || (window.bragi = {}));
