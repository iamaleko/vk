/**
 * @file: Utility functions
 * @author: Alexander Kolobov
 */

window.utils = (function() {
    'use strict';

    return {

        /**
         * Returns true in IE <= 8
         * @type {Boolean}
         */
        lteIE8: !+[1,],

        isFunction: function(f) {
            // Good in old Chrome builds where RegXxp is typeof 'function'
            return ({}).toString.call(f)==='[object Function]';
        },

        isNumber: function(n) {
            // Good for detecting natural numbers
            return typeof n === 'number' && n%1 === 0;
        },

        isArray: function(a) {
            return Array.isArray ? Array.isArray(a) : ({}).toString.call(a) === '[object Array]';
        },

        isElement: function(e) {
            return e instanceof (window.HTMLElement || window.Element);
        },

        isObject: function(o) {
            return typeof o === "object" && !this.isArray(o) && o !== null;
        },

        /**
         * Fast and nice trim
         * @author Nick Pershin
         * @return {string}
         */
        trim: (function() {
            var i = 0,
                ws = {},
                chars = ' \n\r\t\v\f\u00a0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u200b\u2028\u2029\u3000',
                length = chars.length;
            for(; i < length; i++)ws[chars.charAt(i)] = true;
            return function(str) {
                var s = -1,
                    e = str.length;
                while(ws[str.charAt(--e)]);
                while(s++ !== e && ws[str.charAt(s)]);
                return str.substring(s, e+1);
            };
        })(),

        addEventListener: (function() {
            if(window.addEventListener) {
                return function(el, evt, handler, capture) {
                    return el.addEventListener(evt, handler, capture);
                }
            } else {
                return function(el, evt, handler) {
                    return el.attachEvent('on'+evt, handler);
                }
            }
        })(),

        removeEventListener: (function() {
            if(window.removeEventListener) {
                return function(el, evt, handler) {
                    return el.removeEventListener(evt, handler);
                }
            } else {
                return function(el, evt, handler) {
                    return el.detachEvent('on'+evt, handler);
                }
            }
        })(),

        classes : (function() {
            function _get(str) {
                return utils.trim(str).split(/\s+/);
            }
            function _remove(arr1, arr2) {
                var count1 = arr1.length,
                    count2,
                    total = arr2.length;
                while(count1--) {
                    count2 = arr2.length;
                    while(count2--) {
                        if(arr1[count1] == arr2[count2]) {
                            total--;
                            arr1[count1]='';break;
                        }
                    }
                }
                return total==0;
            }
            function _set(node, arr) {
                node.className = utils.trim(arr.join(' ').replace(/\s+/g,' '));
            }
            return {

                /**
                 * Find node by class
                 * @param  {Element} node Container
                 * @param  {String}  str  Classes devided by space
                 * @return {Array}        Collection of elems
                 */
                find: function(node, str) {
                    if(!node) {
                        node = document.body;
                    }
                    if(str === void(0)) {
                        str = node;
                        node = document.body;
                    }
                    if(typeof document.getElementsByClassName == 'function') {
                        return node.getElementsByClassName(str);
                    }
                    var elems = node.getElementsByTagName('*'),
                        collection = [],
                        total = elems.length,
                        counter = 0;
                    for(;counter<total;counter++) {
                        if(this.has(elems[counter], str)) {
                            collection.push(elems[counter]);
                        }
                    }
                    return collection;
                },

                /**
                 * Add classes to node
                 * @param  {Element} node
                 * @param  {String}  str  Classes devided by space
                 * @return {Element}
                 */
                add : function(node, str) {
                    var arr1 = _get(node.className||''),
                        arr2 = _get(str);
                    _remove(arr1,arr2);
                    _set(node,arr1.concat(arr2));
                    return node;
                },

                /**
                 * Remove classes from node
                 * @param  {Element} node
                 * @param  {String}  str  Classes devided by space
                 * @return {Element}
                 */
                remove : function(node, str) {
                    var arr1 = _get(node.className||''),
                        arr2 = _get(str);
                    _remove(arr1,arr2)
                    _set(node,arr1);
                    return node;
                },

                /**
                 * Check if node has each of requested classes
                 * @param  {Element} node
                 * @param  {String}  str  Classes devided by space
                 * @return {Boolean}
                 */
                has : function(node, str) {
                    var arr1 = _get(node.className||''),
                        arr2 = _get(str);
                    return _remove(arr1,arr2);
                },

                /**
                 * Remove first group of classes and add second group
                 * @param  {Element} node
                 * @param  {String}      str1 Classes devided by space
                 * @param  {String}      str2 Classes devided by space
                 * @return {Element}
                 */
                replace : function(node, str1, str2) {
                    var arr1 = _get(node.className||''),
                        arr2 = _get(str1),
                        arr3 = _get(str2);
                    _remove(arr1,arr2);
                    _remove(arr1,arr3);
                    _set(node,arr1.concat(arr3));
                    return node;
                }
            };
        })(),

        /**
         * Wrapper for XMLHTTPRequest. Recieve params object.
         * @param  {String}   url
         * @param  {String}   data    Query string
         * @param  {String}   method  get or post
         * @param  {Function} success Success handler, optional
         * @param  {Function} error   Error handler, optional
         * @return {XMLHttpRequest}
         */
        ajax: (function() {

            var method = 'POST',
                timeout = 30000,
                error = function() {},
                success = function() {};

            return function(params) {
                if(typeof params.method !== 'undefined') {
                    if(!~['GET','POST'].indexOf(params.method = (params.method+'').toUpperCase())) {
                        throw new Error('AJAX accepts GET or POST methods.');
                    }
                } else {
                    params.method = method;
                }
                if(typeof params.success !== 'undefined') {
                    if(!this.isFunction(params.success)) {
                        throw new Error('AJAX success param must be a Function.');
                    }
                } else {
                    params.success = success;
                }
                if(typeof params.error !== 'undefined') {
                    if(!this.isFunction(params.error)) {
                        throw new Error('AJAX error param must be a Function.');
                    }
                } else {
                    params.error = error;
                }
                if(typeof params.url !== 'undefined') {
                    params.url = params.url+'';
                } else {
                    throw new Error('AJAX requires url string param.');
                }
                if(typeof params.timeout !== 'undefined'){
                    if(params.timeout%1 === 0) {
                        params.timeout = params.timeout*1;
                    } else {
                        throw new Error('AJAX timeout param must be a finite number.');
                    }
                } else {
                    params.timeout = timeout;
                }
                if(typeof params.data !== 'undefined') {
                    if(params.method === 'GET') {
                        params.url += '?'+params.data;
                        params.data = void(0);
                    }
                } else {
                    params.data = void(0);
                }
                var i = 0,
                    XMLHttp = new XMLHttpRequest(),
                    wait = null,
                    result = {
                        url: params.url,
                        status: 200,
                        XMLHttp: XMLHttp
                    };
                XMLHttp.open(params.method, params.url, true);
                XMLHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                if(params.headers && params.headers.length) {
                    for(;i < params.headers.length;i++) {
                        if(params.headers[0] && params.headers[1]) {
                            XMLHttp.setRequestHeader(params.headers[0]+'', params.headers[1]+'');
                        } else {
                            throw new Error('One of AJAX headers is invalid.');
                        }
                    }
                }
                wait = setTimeout(function() {
                    XMLHttp.abort();
                    result.status = 408;
                    params.error(result);
                }, params.timeout);
                XMLHttp.onreadystatechange = function() {
                    if(XMLHttp.readyState != 4){return;}
                    wait && clearTimeout(wait);
                    if(XMLHttp.status == 200) {
                        params.success(result);
                    } else {
                        result.status = XMLHttp.status;
                        params.error(result);
                    }
                };
                XMLHttp.send(params.data);
                return XMLHttp;         
            }
        })(),

        /**
         * Must be replaced by JSON polyfill in production
         */
        JSONParse: (function() {
            return JSON && JSON.parse && function(json) {
                try{
                    return JSON.parse(json);
                } catch(e) {
                    return null;
                }
            } || function(json) {
                try{
                    json = new Function('return '+json+';')();
                }catch(e){}
                return typeof json === "object" ? json : null;
            }
        })(),

        /**
         * Create HTMLElement and set some params
         * @param  {string} node name
         * @param  {object} params, ex: {attr: {prop:val}, css: {prop:val}, html: '', text: ''}
         * @return {HTMLElement}
         */
        node: function(node, params) {
            if(node === 'fragment') {
                return document.createDocumentFragment();
            } else {
                node = document.createElement(node);
                if(params) {
                    var prop;
                    if(params.text) {
                        node.appendChild(document.createTextNode(params.text+''));
                    }
                    if(params.html) {
                        node.innerHTML = params.html+'';
                    }
                    if(params.css) {
                        for(prop in params.css) {
                            node.style[prop] = params.css[prop];
                        }
                    }
                    if(params.attr) {
                        for(prop in params.attr) {
                            node.setAttribute(prop,params.attr[prop]);
                        }
                    }
                }
                return node;
            }
        }
    };
})();