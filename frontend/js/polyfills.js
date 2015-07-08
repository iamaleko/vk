/**
 * @file: Polyfills
 */

(function () {
    'use strict';

    if(!Function.prototype.bind) {
        Function.prototype.bind = function(oThis) {
            if(typeof this !== 'function') {
                throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
            }
            var aArgs   = Array.prototype.slice.call(arguments, 1),
                fToBind = this,
                fNOP    = function() {},
                fBound  = function() {
                    return fToBind.apply(this instanceof fNOP ? this : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
                };
            fNOP.prototype = this.prototype;
            fBound.prototype = new fNOP();
            return fBound;
        };
    }

    if(!Array.prototype.indexOf) {
        Array.prototype.indexOf = function(searchElement, fromIndex) {
            if(this == null) {
                throw new TypeError('"this" is null or not defined');
            }
            var k,
                O = Object(this),
                len = O.length >>> 0,
                n = +fromIndex || 0;
            if(len === 0) {
                return -1;
            }
            if(Math.abs(n) === Infinity) {
                n = 0;
            }
            if(n >= len) {
                return -1;
            }
            k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
            while(k < len) {
                if(k in O && O[k] === searchElement) {
                    return k;
                }
                k++;
            }
            return -1;
        };
    }

})();